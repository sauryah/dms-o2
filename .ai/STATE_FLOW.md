# State Flows & Lifecycles (STATE_FLOW.md)

This document diagrams state transitions and lifecycle flows within the DMS-O2 system.

---

## 1. Die Lifecycle State Machine

A Die changes state based on user updates, maintenance, or operations:

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE : Create / Import
    
    AVAILABLE --> RUNNING : Allocate to Active Set
    RUNNING --> CLEANING : Deallocate from Set / Production Stop
    CLEANING --> POLISHING : Quality Check Needed
    CLEANING --> AVAILABLE : Cleaned
    
    POLISHING --> AVAILABLE : Polished
    
    AVAILABLE --> DAMAGED : Tolerance Check Fail / Inspection
    RUNNING --> DAMAGED : Operation Failure
    
    DAMAGED --> AVAILABLE : Recut / Re-bore
    DAMAGED --> SCRAPPED : Excess Wear / Unrepairable
    
    AVAILABLE --> MISSING : Inventory Audit Audit Loss
    MISSING --> AVAILABLE : Found / Relocated
    
    SCRAPPED --> [*] : Scrapped
```

---

## 2. Recut / Re-bore Validation Flow

Recutting boring expands round inner diameters and flat casing width/thickness metrics:

```mermaid
flowchart TD
    Start[Request /api/dies/ID/recut/] --> Auth{Is user ADMIN or ROOT?}
    Auth -->|No| Reject[403 Forbidden]
    Auth -->|Yes| CheckNote{Note provided?}
    
    CheckNote -->|No| FailNote[400 Bad Request: Note required]
    CheckNote -->|Yes| Type{Die Type?}
    
    Type -->|ROUND| ValidateRound[Verify new_size > current_size]
    Type -->|FLAT| ValidateFlat[Verify new_width >= current_width AND new_thickness >= current_thickness]
    
    ValidateRound -->|Fail| FailSize[400 Bad Request: Size cannot shrink]
    ValidateFlat -->|Fail| FailDims[400 Bad Request: Dims cannot shrink]
    
    ValidateRound -->|Pass| CommitRound[Update punched_size & current_size = new_size]
    ValidateFlat -->|Pass| CommitFlat[Update punched_width/current_width & punched_thickness/current_thickness]
    
    CommitRound --> Post[Set status=AVAILABLE & Create MaintenanceLog category=RECUT]
    CommitFlat --> Post
    Post --> End[Sync Meilisearch & Broadcast SSE]
```

---

## 3. Wear Alert Lifecycle

Calculations run automatically on post-save hooks of Die/RoundDie/FlatDie models:

```mermaid
flowchart TD
    Save[Die Post-Save Signal] --> GetTol[Retrieve DieTolerance]
    GetTol --> Calc[Compute Wear mm]
    
    Calc --> Pct[Compute Wear Percentage of max_wear_mm]
    
    Pct --> CritCheck{Wear % >= critical_percentage?}
    Pct --> WarnCheck{Wear % >= warning_percentage?}
    
    CritCheck -->|Yes| AlertCrit[Create / Escalate WearAlert CRITICAL]
    
    CritCheck -->|No| WarnCheck
    WarnCheck -->|Yes| AlertWarn[Create / De-escalate WearAlert WARNING]
    
    WarnCheck -->|No| Resolve[Mark active WearAlert as Resolved]
```

---

## 4. User Session lifecycle

Saves user credentials verification, throttling counts, and token refresh details:

```mermaid
stateDiagram-v2
    [*] --> ThrottleCheck : POST /api/auth/login/
    ThrottleCheck --> LoginFailed : Invalid credentials (Incr failed count in Redis)
    LoginFailed --> Blocked : Failed count >= 5 (Lock 5 min)
    
    ThrottleCheck --> AuthSuccess : Correct password
    AuthSuccess --> SessionPrune : Active UserSession count >= SESSION_MAX_CONCURRENT (3)
    SessionPrune --> Evicted : Store eviction in Redis cache (1 hour) & delete old UserSession
    
    AuthSuccess --> Active : Create UserSession + set access/refresh cookies
    
    Active --> TokenExpired : Access token expires (15 mins)
    TokenExpired --> TokenRefresh : POST /api/auth/refresh/ (Uses refresh cookie)
    TokenRefresh --> Active : Update UserSession token hash & update cookies
    TokenRefresh --> SessionEvicted : Eviction details exist in Redis cache (Return session_evicted code)
    
    Active --> IdleTimeout : Inactivity > SESSION_IDLE_TIMEOUT_MINUTES (30 mins)
    Active --> AbsoluteTimeout : Duration > SESSION_ABSOLUTE_TIMEOUT_HOURS (12 hours)
    
    Active --> LoggedOut : POST /api/auth/logout/ (Delete UserSession & cookies)
    
    IdleTimeout --> [*] : Prune session & log SESSION_EXPIRED
    AbsoluteTimeout --> [*] : Prune session & log SESSION_EXPIRED
    LoggedOut --> [*]
```
