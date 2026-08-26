# Changelog

All notable changes to the **CampusMove AI** platform will be documented in this file.

## [v0.1.0] - Phase 1: Foundation (Current)

### Added
- **Architecture & Specifications**: Comprehensive `PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `PHASES.md`, and `.env.example`.
- **Backend Core**:
  - Express.js API server with Morgan logging, CORS, and Helmet headers.
  - Resilient Mongoose connection supporting both external MongoDB Atlas / local MongoDB, with auto in-memory fallback.
  - Complete Data Models: `User`, `StudentProfile`, `DriverProfile`, `Stop`, `Route`, `Bus`, `Schedule`, `LiveLocation`, `Trip`, `Complaint`, `Incident`.
  - JWT Authentication & RBAC middleware for `student`, `driver`, and `admin` roles.
  - Full CRUD REST APIs for `/api/buses`, `/api/routes`, `/api/stops`, `/api/schedules`, and `/api/users`.
  - Realistic Campus dataset seeder with 8 stops (Hostel 3, Block C, Central Library, etc.), 3 bus routes, 4 buses, and 3 demo accounts.
  - WebSocket / Socket.IO integration foundation for live tracking in Phase 2.
- **Frontend Foundation**:
  - React 18 + Vite SPA styled with Tailwind CSS and Lucide icons.
  - Interactive Leaflet Campus Map displaying campus stops, markers, and color-coded route polylines.
  - Global `AuthContext` with instant 1-click Demo Account switches for Student, Driver, and Admin.
  - **Student View**: Interactive campus map, stop explorer, and bus timetables.
  - **Admin Panel**: Fleet overview map, plus full CRUD management tabs for Buses, Routes, Stops, and Schedules.
  - **Driver Portal**: Vehicle assignment overview, route checkpoints, and schedule viewer.
