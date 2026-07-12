# Copyright Notice & Intellectual Property Statement

This document details the ownership and copyright terms governing the DMS-O2 codebase and its components.

---

## 1. Copyright Statement

```text
Copyright (C) 2024 - 2026 Sahil Pradhan. All rights reserved.
```

All original source code, design assets, and documentation in this repository are the sole intellectual property of Sahil Pradhan, except where explicitly noted otherwise.

---

## 2. Licensing Context

The software in this repository is dual-licensed:
* **Open Source:** Available under the terms of the [GNU Affero General Public License version 3 (AGPL-3.0)](LICENSE).
* **Commercial:** Available under a proprietary [Commercial License](LICENSE-COMMERCIAL.md) for organizations unable to comply with AGPL-3.0 requirements.

All users, contributors, and downstream redistributors must respect the terms of the chosen license.

---

## 3. Third-Party Components & Dependency Notices

DMS-O2 utilizes third-party libraries and frameworks, each distributed under their respective open-source licenses. These include, but are not limited to:

### Backend Stack
* **Django Web Framework:** BSD 3-Clause License
* **Django REST Framework:** BSD 2-Clause License
* **Psycopg2 (PostgreSQL adapter):** LGPL 3.0 / BSD License
* **Celery & Redis Client:** BSD 3-Clause License

### Go Search API Stack
* **Go Programming Language:** BSD 3-Clause License
* **Meilisearch Go SDK:** MIT License
* **Go Redis Client:** BSD 2-Clause License

### Frontend Stack
* **React & React-DOM:** MIT License
* **Vite build tool:** MIT License
* **PostCSS & Tailwind CSS:** MIT License

For full dependency licensing details, please review the relevant package manifests:
* Backend: [backend/requirements.txt](backend/requirements.txt)
* Go API: [go-api/go.mod](go-api/go.mod)
* Frontend: [frontend/package.json](frontend/package.json)
