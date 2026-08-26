# CampusMove AI — Product Requirements Document (PRD)

## 1. Problem Statement
Students on college campuses often do not know which college bus or shuttle to take, where the vehicle is currently located, when it will arrive at their stop, whether it is running behind schedule or crowded, or what alternative route/mode to use when a bus is delayed or cancelled. Transport schedules and notices are frequently fragmented across paper boards, static PDFs, and informal messaging groups.

Transport administrators lack a centralized real-time system to manage routes, track fleet positions, monitor delays and incidents, handle student complaints systematically, and gather mobility analytics.

## 2. Product Vision & Goal
CampusMove AI is an Intelligent Student Transport & Route Agent platform that combines real-time GPS fleet tracking, proactive student trip planning, predictive ETAs, smart multi-channel notifications, and automated replanning when campus conditions change.

The core guiding principle is: **Build real features first, AI second.** The system is grounded in trustworthy campus transport data rather than hallucinated schedules or fabricated bus positions.

---

## 3. User Personas & Roles

### 3.1 Student
- **Profile**: Daily commuter moving between hostels, academic blocks, labs, library, and campus gates.
- **Needs**:
  - Search routes from current location (e.g., Hostel 3) to destination (e.g., Block C) with required arrival times.
  - View real-time campus map with stops, routes, and live bus positions.
  - Receive actionable alerts (e.g., "Bus 12 arriving in ~2 min", "Bus 12 delayed, take Bus 7").
  - Submit transport complaints with photo/category attachments, track resolution progress, and verify/reopen issues.

### 3.2 Driver
- **Profile**: Campus bus or shuttle operator.
- **Needs**:
  - Ultra-simple, low-distraction interface for use before and during trips.
  - Start/End route tracking with one tap.
  - Report quick status events: traffic delays, route blockage, vehicle breakdown, or passenger capacity.

### 3.3 Transport Admin / Coordinator
- **Profile**: Campus transport manager responsible for fleet operations, safety, and schedules.
- **Needs**:
  - Manage database of Buses, Drivers, Routes, Stops, and Timetable Schedules (CRUD).
  - Live overview map of all operating vehicles and active route status.
  - Incident handling and complaint ticket resolution workflow (New → In Progress → Resolved → Reopened).
  - Analytics on route utilization, peak demand hours, and delay hotspots.

---

## 4. System Capabilities Matrix

| Module | Core Capability | Phase |
| :--- | :--- | :--- |
| **Authentication & RBAC** | JWT Auth with Student, Driver, Admin roles and permission guards | **Phase 1 (Current)** |
| **Fleet & Route CRUD** | Manage Buses, Routes, Stops, and Timetable Schedules | **Phase 1 (Current)** |
| **Campus Map** | Interactive Leaflet OpenStreetMap with stops & route polylines | **Phase 1 (Current)** |
| **Live GPS Tracking** | Driver GPS sharing & WebSocket real-time bus marker broadcasting | Phase 2 |
| **Trip Planner** | Origin-destination-arrival time query engine with safety buffers | Phase 3 |
| **AI Agent** | Tool-calling assistant for natural language trip queries & replanning | Phase 4 |
| **Smart Alerts** | Approaching bus, delay alerts, leave-now reminders | Phase 5 |
| **Complaints & Incidents** | Student complaint submission & admin lifecycle management | Phase 6 |
| **ML & Predictions** | Delay and crowd prediction based on historical trip records | Phase 7 |
| **Admin Intelligence** | Advanced fleet analytics and reporting | Phase 8 |

---

## 5. Phase 1 Deliverables (Foundation)
1. **Authentication & Roles**: Secure login/registration with `student`, `driver`, and `admin` roles.
2. **Database Models**: Schemas for User, Profiles, Stop, Route, Bus, Schedule, and schemas prepared for subsequent phases.
3. **Admin CRUD REST APIs**: Full endpoints to Create, Read, Update, and Delete Buses, Routes, Stops, and Schedules.
4. **Campus Map View**: Interactive OpenStreetMap centered on campus with stops and route paths.
5. **Role Portals**: Student dashboard, Driver dashboard, and Admin management panel.
