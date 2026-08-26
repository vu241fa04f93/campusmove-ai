# Changelog

All notable changes to the **CampusMove AI** platform will be documented in this file.

## [v0.3.0] - Phase 3: Intelligent Trip Planner (Current)

### Added
- **Intelligent Trip Planning Engine (`tripPlannerService.js`)**:
  - Deterministic multi-factor routing solver evaluating Origin, Destination, Required Arrival Times, and Travel Preferences (`fastest`, `earliest_arrival`, `convenient`).
  - Seamless integration of real-time GPS telemetry and dynamic stop ETAs from Phase 2 when vehicles are active, with graceful fallback to scheduled timetables.
  - Haversine pedestrian walking calculations (campus walking speed: 4.8 km/h) for walk-to-stop, walk-from-dropoff, and direct campus walking routes.
  - Safety buffer computation (minimum 5–8 minutes) guaranteeing reliable arrival margins before academic classes and exams.
  - Strict Arrival-Time Priority: heavily penalizes options that would arrive after the student's target deadline if valid on-time options exist.
  - Delay-Triggered Automatic Replanning: detects delayed vehicles and automatically promotes on-time alternatives with clear explanation banners.
- **REST Endpoints (`/api/trips`)**:
  - `POST /api/trips/plan`: Structured trip planning endpoint returning top recommendation, alternative routes, step-by-step itinerary, safety margins, and human-readable rationales ("Why this option was selected").
  - `GET /api/trips/suggestions`: Common campus commuter routes (Hostels $\rightarrow$ Block C, Library, Gate 1).
- **Interactive Student Trip Planner UI (`TripPlanner.jsx`)**:
  - Origin & Destination stop dropdowns with quick swap and one-tap suggestion chips.
  - Target arrival time selector with preference filters (`⚡ Fastest`, `⏰ Earliest Arrival`, `🚶 Min Walking`).
  - Recommended Trip Hero Card featuring departure/arrival clocks, safety margin badges, detailed 3-step visual journey itinerary, and natural language explanation bullets.
  - Alternative routes comparative grid with difference tags (`+4m slower`, `Direct Walk`).
  - Seamless map synchronization with `<CampusMap>`.
- **Automated Verification**:
  - Comprehensive 20-checkpoint automated test suite (`verify-phase3-trip-planner.js`) testing standard OD queries, arrival time constraints, delayed bus replanning, direct walk comparisons, preference weights, and invalid stop validation.

## [v0.2.0] - Phase 2: Real-Time Bus Tracking

### Added
- **Backend Realtime & Telemetry**:
  - Express + Socket.IO real-time gateway with rooms (`bus:<id>`, `campus_map`, `route:<id>`).
  - Event-driven GPS telemetry ingestion (`driver:location_update`), trip start (`driver:start_trip`), trip end (`driver:end_trip`), and status update (`bus:status_change`).
  - High-frequency GPS breadcrumbs persistence in `LiveLocation` MongoDB collection.
  - Deterministic Haversine distance engine and dynamic downstream stop ETA solver (`calculateStopETAs`) factoring live speed, passenger dwell times, and delay penalty buffers.
  - Live REST endpoint `GET /api/buses/:id/live` for instant telemetry & stop ETAs retrieval.
- **Frontend Real-Time Architecture**:
  - Singleton `SocketService` with automatic reconnection, room management, and reactive event listeners.
  - Reusable ETA, distance, and speed formatting helpers in `etaCalculator.js`.
  - **Dynamic Leaflet Markers**: Live bus markers with smooth CSS transitions, rotating heading arrows, status badges (Active/Delayed/Breakdown/Offline), pulsing radar animations, and `SIMULATED` badge.
  - **Driver Live Console**: Dual GPS sharing (Real browser device GPS via `navigator.geolocation.watchPosition` + Autonomous Route Simulator for desktop testing), trip duration timer, one-tap status switcher (`On Time`, `Delayed`, `Breakdown`), and passenger broadcast announcement poster.
  - **Student Real-Time Map & Feed**: Live WebSocket subscription to fleet updates, real-time Operating Fleet list, and interactive vehicle telemetry/stop ETAs inspector.
  - **Admin Live Overview Map**: Connected Admin Dashboard to real-time fleet stream for instant map marker and fleet management table synchronization.
- **Automated Verification**:
  - Comprehensive 5-stage automated test suite (`verify-phase2-realtime.js`) validating dual-socket trip start, GPS ingestion, ETA calculation, live REST queries, and trip termination.

## [v0.1.0] - Phase 1: Foundation

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
