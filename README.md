# CampusMove AI — Intelligent Student Transport & Route Agent

CampusMove AI is an intelligent campus mobility platform designed to understand student travel requirements, check live transport conditions, recommend the best bus routes, provide live tracking, and automatically replan when campus conditions change.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v20+)
- [npm](https://npmjs.com/)

### 1. Installation
Install all dependencies for root, server, and client:

```bash
# Clone or navigate to the repository
cd campusmove-ai

# Install root, backend, and frontend dependencies
npm run install:all
```

### 2. Seed Campus Data
Populate the database with realistic campus stops (Hostel 3, Block C, Central Library, etc.), routes, buses, and demo user accounts:

```bash
npm run seed
```

### 3. Run Development Servers
Start both backend (Port 5000) and frontend (Port 5173) concurrently:

```bash
npm run dev
```

Visit the app at [http://localhost:5173](http://localhost:5173).

---

## 🔑 Demo Accounts (1-Click Login available on Auth Page)

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Student** | `student@campusmove.edu` | `student123` | Alex Chen — Student living at Hostel 3 |
| **Driver** | `driver@campusmove.edu` | `driver123` | John Smith — Campus Bus Driver (Bus 12) |
| **Transport Admin** | `admin@campusmove.edu` | `admin123` | Chief Sharma — Transport Coordinator |

---

## 📁 Repository Structure

```
campusmove-ai/
├── README.md                 # Setup guide and documentation
├── PRD.md                    # Product Requirements Document
├── ARCHITECTURE.md           # System architecture, schemas & API contracts
├── RULES.md                  # Agent rules and RBAC policies
├── PHASES.md                 # 9-Phase Development Roadmap
├── CHANGELOG.md              # Version and feature changelog
├── .env.example              # Environment variables template
├── server/                   # Express.js + Socket.IO + Mongoose Backend
│   └── src/
│       ├── config/           # Resilient DB connection (with auto in-memory fallback)
│       ├── models/           # Mongoose schemas (User, Bus, Route, Stop, Schedule...)
│       ├── middleware/       # JWT Auth & RBAC
│       ├── controllers/      # Auth & CRUD controllers
│       ├── routes/           # REST endpoints
│       ├── realtime/         # Socket.IO handlers
│       └── seed/             # Campus dataset seeder
└── client/                   # React 18 + Vite + Tailwind + Leaflet Frontend
    └── src/
        ├── api/              # Axios REST API client
        ├── context/          # Auth context & demo role switchers
        ├── components/       # Leaflet Map, Navbar, Modals, StatCards
        └── pages/            # Student, Driver, and Admin Portals
```

---

## 🏗️ Architecture & Development Phases
See [ARCHITECTURE.md](./ARCHITECTURE.md) and [PHASES.md](./PHASES.md) for detailed blueprints.
