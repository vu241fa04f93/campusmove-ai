# CampusMove AI — Development Roadmap & Phases

| Phase | Title | Scope & Key Deliverables | Status |
| :--- | :--- | :--- | :---: |
| **Phase 0** | **Discovery & Data** | Collect campus bus routes, stops, schedules, driver workflows, and common complaints. | Completed |
| **Phase 1** | **Foundation** | Auth & RBAC (Student, Driver, Admin), Database Models, CRUD REST APIs for Buses, Routes, Stops, Schedules, and Interactive Campus Map UI. | Completed |
| **Phase 2** | **Live Tracking** | Driver GPS sharing & Autonomous Route Simulator, Socket.IO real-time broadcast gateway, Haversine stop ETA engine, and live Leaflet bus marker animation across Student, Driver, and Admin portals. | Completed |
| **Phase 3** | **Trip Planner** | Origin/destination/arrival query solver with multi-factor ranking (ETA, walking, buffer, preferences), delay-triggered rerouting, and student trip planning UI. | Completed |
| **Phase 4** | **AI Agent** | Natural-language query interface, deterministic NLP & LLM provider abstraction, Phase 3 trip planner tool calling, conversational missing info prompts & delay replanning. | Completed |
| **Phase 5** | **Smart Notifications** | Autonomous 150m stop geofences, proactive leave-now alarms, approaching radar alerts, live delay broadcasts, and student alert subscriptions. | **Completed** |
| **Phase 6** | **Complaints & Incidents** | Student complaint submission, ticket tracking, admin resolution workflow, and student confirmation/reopen. | Planned (Next) |
| **Phase 7** | **Prediction (ML)** | Machine Learning ETA refinement, crowd estimation, and demand forecasting based on trip history. | Planned |
| **Phase 8** | **Admin Intelligence & Pilot** | Comprehensive analytics dashboards, fleet utilization metrics, and pilot deployment testing. | Planned |
