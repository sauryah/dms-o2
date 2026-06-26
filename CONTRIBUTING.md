# Contributing to Die Management System (DMS)

Thank you for your interest in contributing to the Die Management System! This guide will help you get started with contributing.

---

## 📖 Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [How Can I Contribute?](#how-can-i-contribute)
3. [Local Development Setup](#local-development-setup)
4. [Testing & Quality Assurance](#testing--quality-assurance)
5. [Pull Request Process](#pull-request-process)

---

## Code of Conduct

This project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## How Can I Contribute?

*   **Report Bugs**: Open an issue describing the bug, steps to reproduce, and expected vs. actual behavior.
*   **Suggest Features**: Propose new ideas or enhancements via issues.
*   **Submit Pull Requests (PRs)**: Fix bugs, improve performance, or implement roadmap features.

---

## Local Development Setup

To set up a local development environment:

### 1. Prerequisites
*   [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (V2+)
*   [Node.js](https://nodejs.org/) (v18+) & `npm`
*   [Python 3.11](https://www.python.org/downloads/)

### 2. Quick Stack Launch
Use the helper scripts to start the complete local stack:
```bash
# On Linux/macOS
./setup.sh

# On Windows (PowerShell)
./setup.ps1
```

### 3. Manual Local Setup
For faster developer loops without Docker build latency, run services locally:

*   **Django Backend**:
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # venv\Scripts\activate on Windows
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py runserver 8000
    ```

*   **React Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

## Testing & Quality Assurance

Before submitting any code changes, ensure all tests pass.

### Backend Tests
Run the Django unit tests:
```bash
cd backend
python manage.py test
# Or inside docker
docker compose exec django python manage.py test
```

### Frontend Tests
Run Vitest unit tests:
```bash
cd frontend
npm run test
```

Run Playwright E2E tests:
```bash
cd frontend
npm run test:e2e
```

---

## Pull Request Process

1.  **Fork** the repository and create a branch: `git checkout -b feature/your-feature-name`.
2.  **Commit** your changes following semantic commit guidelines (e.g., `feat: ...`, `fix: ...`).
3.  **Validate** that all tests pass locally.
4.  **Open a Pull Request** against the `main` branch. Provide a clear description of the problem solved and the implementation details.
5.  **Review**: A maintainer will review your PR and merge it once approved.
