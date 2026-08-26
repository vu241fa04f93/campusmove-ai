# CampusMove AI — Agent Rules & Business Logic

## 1. Core Operating Principles

1. **Grounded in Truth**: Never fabricate bus locations, timetables, or delays. If live GPS data is unavailable, explicitly state that schedule estimates are being shown instead.
2. **Arrival-Time Priority**: If a student specifies a desired arrival time (e.g. "reach Block C by 9:00 AM"), never recommend a route option expected to arrive after that time if a valid on-time option exists.
3. **Safety Buffer**: Always factor in a reasonable buffer (minimum 5-10 minutes) for walking from the bus stop to the final building/classroom and handling campus traffic variability.
4. **Availability Filtering**: Automatically exclude any bus or route marked `out_of_service`, `breakdown`, or `cancelled` from trip recommendations.
5. **Real-time Replanning**: When an active bus encounters a delay that jeopardizes the student's arrival time, trigger automatic alternative route evaluation and notify the student.

---

## 2. Role-Based Access Control (RBAC) Rules

| Resource / Action | Student | Driver | Transport Admin |
| :--- | :---: | :---: | :---: |
| **View Campus Map & Stops** | Allowed | Allowed | Allowed |
| **View Bus Routes & Schedules** | Allowed | Allowed | Allowed |
| **Plan Trip / Query Agent** | Allowed | Allowed | Allowed |
| **Share GPS Live Location** | - | Allowed (Assigned Bus) | - |
| **Update Bus Trip Status** | - | Allowed (Assigned Bus) | Allowed (All) |
| **Report Breakdown / Delay** | - | Allowed (Assigned Bus) | Allowed (All) |
| **Create / Edit / Delete Buses** | Denied | Denied | Allowed |
| **Create / Edit / Delete Routes & Stops** | Denied | Denied | Allowed |
| **Create / Edit / Delete Schedules** | Denied | Denied | Allowed |
| **Submit Complaint** | Allowed | Allowed | Allowed |
| **Resolve / Reopen Complaint** | Confirm / Reopen | - | Resolve / Assign |
| **Manage Users & Role Assignment** | Denied | Denied | Allowed |

---

## 3. Bus & Trip Status Definitions

- `active` (Emerald): Operating on schedule along the assigned route.
- `delayed` (Amber): Operating behind schedule (> 5 minutes delay detected or driver reported).
- `breakdown` (Rose): Vehicle malfunction; requires immediate passenger re-routing.
- `out_of_service` (Gray): Parked at depot or undergoing routine maintenance.
