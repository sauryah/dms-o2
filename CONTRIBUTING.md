# Contributing to DMS-O2

Thank you for your interest in contributing to DMS-O2! This guide outlines the workflows, coding standards, and procedures for contributing to our repository.

---

## 1. Code of Conduct

All contributors are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) in all community spaces.

---

## 2. Issue Reporting

If you find a bug or want to suggest a new feature:
* **Search Existing Issues:** Check if the issue has already been reported.
* **Bug Reports:** Open an issue and include:
  * A clear description of the bug.
  * Step-by-step reproduction instructions.
  * Expected vs. actual behavior.
  * Environment details (OS, Docker version, browser).
  * Relevant logs or error tracebacks.
* **Feature Requests:** Open an issue explaining the feature's goal, proposed user experience, and technical reasoning.

---

## 3. Local Development Setup

DMS-O2 is a microservice-oriented application. You can set it up locally using Docker or run components natively.

### Prerequisites
* **Docker & Docker Compose** (V2+)
* **Node.js** (v18+) & **npm** (for native frontend development)
* **Python 3.11** (for native backend development)
* **Go 1.22** (for native search microservice development)

### Quick Stack Launch (Docker-based)
```bash
# Clone the repository
git clone https://github.com/sauryah/dms-o2.git
cd dms-o2

# Run automated setup script
# On Linux/macOS:
./setup.sh
# On Windows (PowerShell):
./setup.ps1
```

### Native Development Setup
To avoid Docker compilation overhead during local development, you can run components natively on your host:

#### Django Backend (Terminal 1)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

#### React Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

#### Go API (Terminal 3)
```bash
cd go-api
go run cmd/server/main.go
```

---

## 4. Coding Standards

### Python (Backend)
* Adhere to **PEP 8** style guidelines.
* Run a linter (like `flake8` or `black`) before committing.
* Ensure all functions and public methods have clear type hints.

### Go (Search API)
* Run `go fmt` on all files.
* Adhere to standard Go styling rules (`go vet`).
* Keep search and cache controllers modular.

### JavaScript/TypeScript (Frontend)
* Follow the ESLint/Prettier configuration in the project.
* Write reusable React hooks and components.
* Avoid inline styles; use CSS variables and classes.

---

## 5. Testing & Quality Assurance

All contributions must pass the test suites before they can be merged.

### Backend Test Suite
```bash
cd backend
python manage.py test
```

### Frontend Test Suite
```bash
cd frontend
# Unit tests
npm run test
# End-to-end integration tests (Playwright)
npm run test:e2e
```

---

## 6. Pull Request Process

1. **Fork the Repository:** Create a feature branch off `main` (e.g., `feature/custom-rack-grid`).
2. **Commit Messages:** Follow semantic commit guidelines (e.g., `feat(ui): add rack drag-and-drop`, `fix(auth): resolve session timeout loop`).
3. **Keep Branches Clean:** Rebase your branch against the latest upstream `main` to avoid merge conflicts.
4. **Run Verification:** Verify that all tests pass locally.
5. **Open the PR:** Describe the changes clearly, linking any relevant issue.
6. **PR Review:** A maintainer will review your code. Address feedback and modify your commits accordingly.

---

## 7. Contributor License Agreement (CLA)

By submitting a Pull Request to DMS-O2, you agree to the following contributor license terms:

* **Grant of Rights:** You grant Sahil Pradhan (the project owner) a non-exclusive, perpetual, worldwide, royalty-free, irrevocable license to use, reproduce, modify, distribute, and sublicense your contribution.
* **Dual Licensing Authorization:** You explicitly authorize the project owner to distribute your contribution under both the open-source **GNU AGPL-3.0** license and the **DMS-O2 Commercial License**.
* **Representation:** You represent that your contribution is your own original work and that you have the legal right to submit it.
