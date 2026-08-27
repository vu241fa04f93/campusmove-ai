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

## 🤖 Phase 4: Natural Language AI Transport Assistant

CampusMove AI includes a conversational assistant that understands natural language queries, extracts transport entities, and interfaces with the live telemetry and Phase 3 Trip Planner engine without requiring paid external LLM APIs.

### Supported Intents:
- **`BUS_ETA`**: *"When will Bus 12 arrive?"* / *"ETA for Bus 07 at Hostel 3"*
- **`BUS_LOCATION`**: *"Where is Bus 04 right now?"* / *"Where is my bus?"*
- **`ROUTE_SEARCH`**: *"I need to reach college from Hostel 3 by 9 AM"* / *"Fastest route to Library"*
- **`NEXT_STOP`**: *"What is the next stop for Bus 12?"*
- **`BUS_STATUS`**: *"Show delayed buses"* / *"Is Bus 04 running?"*
- **`GENERAL_HELP`**: *"What can you do?"* / *"Help"*

### API Endpoints:
- `POST /api/assistant/chat` (alias `POST /api/agent/chat`)
  - Request: `{ "message": "When will Bus 12 arrive?", "context": { "currentTime": "08:35" } }`
  - Response: `{ "success": true, "intent": "BUS_ETA", "response": "...", "data": { ... } }`
- `GET /api/assistant/suggestions`

---

## 🔔 Phase 5: Proactive Push Alerts & Stop Geofences

CampusMove AI autonomously tracks live bus movements against 150m stop arrival perimeters and 400m approach zones, generating instant push notifications over WebSockets.

### Core Features:
- **Autonomous Geofencing**: Detects when active shuttles enter or approach campus stop geofences (`BUS_ARRIVED`, `BUS_APPROACHING`).
- **Proactive "Leave Now" Alarms**: Triggers urgent alarms when a bus is within student's lead time (e.g. 2-3 mins).
- **Fleet Delay & Resumed Broadcasts**: Real-time warning push notifications when routes experience delays.
- **Student Alert Subscriptions**: Allows students to configure preferred stops, lead times (2, 3, 5 mins), and alert toggles.
- **Geofence Radar UI**: Live radar showing platform occupancy and approaching buses across all campus stops.

### API Endpoints:
- `GET /api/alerts` — Fetch recent alerts (with filtering by unread, type, severity).
- `PUT /api/alerts/:id/read` — Mark single alert as read.
- `PUT /api/alerts/read-all` — Mark all alerts as read.
- `GET /api/alerts/geofences` — Live geofence monitoring snapshot for all campus stops.
- `GET /api/alerts/subscription` — Retrieve student alert preferences.
- `POST /api/alerts/subscription` — Update student alert rules.
- `POST /api/alerts/test` — Trigger simulated alert.

---

## 🏗️ Architecture & Development Phases
See [ARCHITECTURE.md](./ARCHITECTURE.md) and [PHASES.md](./PHASES.md) for detailed blueprints.


