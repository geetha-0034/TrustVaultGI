# TrustVault — Setup & Deployment Guide (SETUP.md)

This guide covers setting up, configuring, and operating TrustVault locally in development or production.

---

## 1. Environment Configuration

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

### Key Configuration Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the live backend API and dev server |
| `PRIVATE_STORAGE_PATH` | `./storage/documents` | Filesystem path for encrypted private document storage |
| `MAX_UPLOAD_SIZE_BYTES` | `26214400` | Maximum file upload size limit (25 MB) |
| `JWT_SECRET` | `trustvault-ephemeral-jwt-secret...` | Secret key for cryptographic session tokens |
| `DATABASE_URL` | `postgres://localhost:5432/trustvault` | PostgreSQL database connection string (Django) |
| `DJANGO_SECRET_KEY` | `django-insecure-trustvault...` | Django secret key for session management |
| `DJANGO_DEBUG` | `True` | Toggle Django debugging mode |

---

## 2. Running with Node.js / Express (Active Full-Stack System)

The full-stack application runs using Node.js and Express with Vite middlewares mounted in dev mode on port 3000.

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Launch the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser.

### Step 3: Run Automated Tests
```bash
npm test
```

### Step 4: Production Build
```bash
npm run build
npm start
```

---

## 3. Running with Python & Django (Reference Implementation)

The Django REST Framework backend is located in `/backend`.

### Step 1: Create and Activate Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 2: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Run Database Migrations
```bash
python backend/manage.py makemigrations vault
python backend/manage.py migrate
```

### Step 4: Run the Django Development Server
```bash
python backend/manage.py runserver 8000
```
API endpoints will be accessible at `http://localhost:8000/api/`.

### Step 5: Run Django Tests
```bash
python backend/manage.py test vault
```

---

## 4. Default Seed Personas & Access Credentials

| Persona | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Primary Administrator** | `ADMINISTRATOR` | `geetha03inaganti@gmail.com` | `GeethaAdmin2026!` |
| **Compliance Officer** | `ADMINISTRATOR` | `sarah.connor@trustvault.internal` | `CyberDyne2026!` |
| **Security Architect** | `OWNER` | `alex.rivera@trustvault.internal` | `EntropyKey99!` |
| **Corporate Treasury** | `OWNER` | `james.chen@trustvault.internal` | `FinanceVault24!` |
| **External Auditor** | `VIEWER` | `marcus.vance@trustvault.internal` | `AuditCheck88!` |
| **Risk Analyst** | `VIEWER` | `elena.rostova@trustvault.internal` | `RiskOfficer42!` |
| **Suspended Contractor** | `VIEWER (SUSPENDED)` | `david.sterling@trustvault.internal` | `Offboarded2026!` |

> **Note on 1-Click Access**: The login screen provides instantaneous persona buttons for convenient multi-role security testing without manual typing. Password input also features a show/hide toggle and validation.

---

## 5. Storage Directory Structure

```text
/
├── backend/                  # Django REST Framework reference implementation
│   ├── manage.py
│   ├── trustvault/           # Settings, WSGI, URLs
│   └── vault/                # Models, views, serializers, permissions, tests
├── data/
│   └── database.json         # Atomic persistent JSON database with hash-chain
├── storage/
│   └── documents/            # Private document storage directory (outside web root)
├── src/                      # React 19 Frontend application
│   ├── components/           # UI components, modals, tables, badges
│   ├── pages/                # Role-specific dashboards, document viewer, audit log
│   └── services/             # Live REST API client layer
├── tests/
│   └── backend.test.ts       # 19-scenario automated backend test suite
├── server.ts                 # Express full-stack API server + Vite middlewares
├── requirements.txt          # Python package requirements
└── package.json              # Node.js dependencies and scripts
```
