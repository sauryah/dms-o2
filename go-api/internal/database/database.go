package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/lib/pq"
	"dms-go-api/internal/config"
)

type DieRepresentation struct {
	ID               int64   `json:"-"`
	DieID            string  `json:"die_id"`
	DieType          string  `json:"die_type"`
	Casing           string  `json:"casing"`
	Status           string  `json:"status"`
	Location         string  `json:"location"`
	SetName          string  `json:"set_name"`
	MachineName      string  `json:"machine_name"`
	CurrentSet       *int    `json:"current_set"`
	CurrentSize      *string `json:"current_size,omitempty"`
	CurrentWidth     *string `json:"current_width,omitempty"`
	CurrentThickness *string `json:"current_thickness,omitempty"`
	Radius           *string `json:"radius,omitempty"`
}

type PostgresDB struct {
	*sql.DB
}

type UserSession struct {
	LastSeen  time.Time
	CreatedAt time.Time
	IsActive  bool
	Role      string
}

func NewPostgresDB(cfg *config.Config) (*PostgresDB, error) {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.PostgresHost,
		cfg.PostgresPort,
		cfg.PostgresUser,
		cfg.PostgresPassword,
		cfg.PostgresDB,
	)

	var db *sql.DB
	var err error
	for i := 0; i < 5; i++ {
		db, err = sql.Open("postgres", connStr)
		if err == nil {
			err = db.Ping()
			if err == nil {
				log.Println("Successfully connected to PostgreSQL database.")
				db.SetMaxIdleConns(10)
				db.SetMaxOpenConns(50)
				return &PostgresDB{db}, nil
			}
		}
		log.Printf("Failed to connect to database (attempt %d/5): %v. Retrying in 2s...", i+1, err)
		time.Sleep(2 * time.Second)
	}
	return nil, err
}

func (db *PostgresDB) GetSession(ctx context.Context, tokenHash string, userID int) (*UserSession, error) {
	var s UserSession
	err := db.QueryRowContext(ctx, `
		SELECT s.last_seen, s.created_at, u.is_active, u.role 
		FROM users_usersession s 
		JOIN users_user u ON s.user_id = u.id 
		WHERE s.token_hash = $1 AND s.user_id = $2`, 
		tokenHash, userID).Scan(&s.LastSeen, &s.CreatedAt, &s.IsActive, &s.Role)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (db *PostgresDB) DeleteSession(ctx context.Context, tokenHash string) error {
	_, err := db.ExecContext(ctx, "DELETE FROM users_usersession WHERE token_hash = $1", tokenHash)
	return err
}

func (db *PostgresDB) UpdateSessionLastSeen(ctx context.Context, tokenHash string) error {
	_, err := db.ExecContext(ctx, "UPDATE users_usersession SET last_seen = NOW() WHERE token_hash = $1", tokenHash)
	return err
}

func (db *PostgresDB) QueryPostgresDirectly(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string, limit int) ([]DieRepresentation, error) {
	var sqlParts []string
	var args []interface{}
	argCounter := 1

	sqlParts = append(sqlParts, `
		SELECT 
			d.id, d.die_id, d.die_type, d.casing, d.status, d.location, d.current_set_id,
			s.name as set_name,
			m.name as machine_name,
			r.current_size,
			f.current_width, f.current_thickness, f.radius
		FROM dies_die d
		LEFT JOIN machines_set s ON d.current_set_id = s.id
		LEFT JOIN machines_machine m ON s.machine_id = m.id
		LEFT JOIN dies_rounddie r ON d.id = r.die_id
		LEFT JOIN dies_flatdie f ON d.id = f.die_id
		WHERE 1=1
	`)

	if q != "" {
		cleanQ := strings.Trim(q, `"'`)
		likeVal := "%" + cleanQ + "%"
		log.Printf("queryPostgresDirectly: searching across all fields for %q", cleanQ)
		sqlParts = append(sqlParts, fmt.Sprintf(`
			AND (
				d.die_id ILIKE $%d 
				OR d.casing ILIKE $%d 
				OR d.location ILIKE $%d 
				OR d.status ILIKE $%d 
				OR s.name ILIKE $%d 
				OR m.name ILIKE $%d
				OR CAST(r.current_size AS TEXT) ILIKE $%d
				OR CAST(f.current_width AS TEXT) ILIKE $%d
				OR CAST(f.current_thickness AS TEXT) ILIKE $%d
			)
		`, argCounter, argCounter, argCounter, argCounter, argCounter, argCounter, argCounter, argCounter, argCounter))
		args = append(args, likeVal)
		argCounter++
	}

	if dieType != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND d.die_type = $%d", argCounter))
		args = append(args, dieType)
		argCounter++
	}
	if statusVal != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND d.status = $%d", argCounter))
		args = append(args, statusVal)
		argCounter++
	}
	if location != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND d.location ILIKE $%d", argCounter))
		args = append(args, "%"+location+"%")
		argCounter++
	}
	if casing != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND d.casing = $%d", argCounter))
		args = append(args, casing)
		argCounter++
	}

	if sizeMin != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND r.current_size >= $%d", argCounter))
		args = append(args, sizeMin)
		argCounter++
	}
	if sizeMax != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND r.current_size <= $%d", argCounter))
		args = append(args, sizeMax)
		argCounter++
	}

	if widthMin != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_width >= $%d", argCounter))
		args = append(args, widthMin)
		argCounter++
	}
	if widthMax != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_width <= $%d", argCounter))
		args = append(args, widthMax)
		argCounter++
	}

	if thickMin != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_thickness >= $%d", argCounter))
		args = append(args, thickMin)
		argCounter++
	}
	if thickMax != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_thickness <= $%d", argCounter))
		args = append(args, thickMax)
		argCounter++
	}

	sqlParts = append(sqlParts, fmt.Sprintf("ORDER BY d.die_id ASC LIMIT %d", limit))

	query := strings.Join(sqlParts, "\n")
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanDies(rows)
}

func (db *PostgresDB) QueryPostgresByIDs(ctx context.Context, hitIDs []int64, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string) ([]DieRepresentation, error) {
	var sqlParts []string
	var args []interface{}
	argCounter := 1

	sqlParts = append(sqlParts, `
		SELECT 
			d.id, d.die_id, d.die_type, d.casing, d.status, d.location, d.current_set_id,
			s.name as set_name,
			m.name as machine_name,
			r.current_size,
			f.current_width, f.current_thickness, f.radius
		FROM dies_die d
		LEFT JOIN machines_set s ON d.current_set_id = s.id
		LEFT JOIN machines_machine m ON s.machine_id = m.id
		LEFT JOIN dies_rounddie r ON d.id = r.die_id
		LEFT JOIN dies_flatdie f ON d.id = f.die_id
		WHERE d.id = ANY($1)
	`)
	args = append(args, pq.Array(hitIDs))
	argCounter++

	if sizeMin != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND r.current_size >= $%d", argCounter))
		args = append(args, sizeMin)
		argCounter++
	}
	if sizeMax != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND r.current_size <= $%d", argCounter))
		args = append(args, sizeMax)
		argCounter++
	}

	if widthMin != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_width >= $%d", argCounter))
		args = append(args, widthMin)
		argCounter++
	}
	if widthMax != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_width <= $%d", argCounter))
		args = append(args, widthMax)
		argCounter++
	}

	if thickMin != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_thickness >= $%d", argCounter))
		args = append(args, thickMin)
		argCounter++
	}
	if thickMax != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_thickness <= $%d", argCounter))
		args = append(args, thickMax)
		argCounter++
	}

	query := strings.Join(sqlParts, "\n")
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanDies(rows)
}

func (db *PostgresDB) GetStats(ctx context.Context) (map[string]int, int, error) {
	rows, err := db.QueryContext(ctx, "SELECT status, COUNT(*) FROM dies_die GROUP BY status")
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	stats := map[string]int{
		"AVAILABLE":   0,
		"RUNNING":     0,
		"CLEANING":    0,
		"POLISHING":   0,
		"DAMAGED":     0,
		"SCRAPPED":    0,
		"MISSING":     0,
		"MAINTENANCE": 0,
		"SCRAP":       0,
	}
	total := 0

	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, 0, err
		}
		stats[status] = count
		total += count
	}
	return stats, total, nil
}

func (db *PostgresDB) GetCount(ctx context.Context) (int, error) {
	var count int
	err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM dies_die").Scan(&count)
	return count, err
}

func scanDies(rows *sql.Rows) ([]DieRepresentation, error) {
	var dies []DieRepresentation
	for rows.Next() {
		var d DieRepresentation
		var setID sql.NullInt64
		var setName, machineName sql.NullString
		var size, width, thickness, radius sql.NullString

		err := rows.Scan(
			&d.ID, &d.DieID, &d.DieType, &d.Casing, &d.Status, &d.Location, &setID,
			&setName, &machineName, &size, &width, &thickness, &radius,
		)
		if err != nil {
			return nil, err
		}

		if setID.Valid {
			val := int(setID.Int64)
			d.CurrentSet = &val
		}
		if setName.Valid {
			d.SetName = setName.String
		}
		if machineName.Valid {
			d.MachineName = machineName.String
		}

		if d.DieType == "ROUND" && size.Valid {
			d.CurrentSize = &size.String
		} else if d.DieType == "FLAT" {
			if width.Valid {
				d.CurrentWidth = &width.String
			}
			if thickness.Valid {
				d.CurrentThickness = &thickness.String
			}
			if radius.Valid {
				d.Radius = &radius.String
			}
		}

		dies = append(dies, d)
	}
	return dies, nil
}
