# 🚍 University Transport Management System

A full-stack transport management platform with real-time GPS tracking, ETA predictions, role-based access, and cross-platform mobile apps for drivers and students.

---

## 📌 Features

- **Role‑Based Access** – Admin dashboard, driver app, student app with distinct permissions.
- **Bus & Route Management** – CRUD operations for buses, routes, and stops.
- **Driver & Student Management** – Create accounts with Identity, manage profiles, attendance, and assignments.
- **Assignment Scheduling** – Schedule buses to routes with multiple time slots per day.
- **Real‑Time GPS Tracking** – Drivers report location every 15 seconds; students see live bus positions on an interactive map.
- **AI‑Powered ETA** – Prediction model using distance and real‑time speed (85% accuracy; TensorFlow integration planned).
- **Driver Attendance** – Mark check‑in/out, track daily status (Present/Late/Absent/OnLeave).
- **Dashboard Analytics** – Charts for weekly assignments, bus utilization, and upcoming schedules.

---

## 🧰 Tech Stack

| Layer          | Technologies                                                                 |
|----------------|------------------------------------------------------------------------------|
| Backend API    | .NET Core, ASP.NET Core Identity, Entity Framework Core, PostgreSQL            |
| Frontend (Web) | React 18, TypeScript, Material UI, React Hook Form, Zod, ApexCharts         |
| Mobile         | React Native (Expo), TailwindCSS (NativeWind), Leaflet (map via WebView)    |
| Real‑Time      | REST with auto‑refresh (15s intervals) – WebSockets planned                 |
| DevOps         | Docker, Git, GitHub Actions (planned)                                       |

---

## 🏗️ Architecture

- **Backend** – Minimal APIs with feature slices, FluentValidation, JWT/cookie auth.
- **Database** – PostgreSQL with indexes for location history and assignment queries.
- **Caching** – Redis (planned) for active bus locations.
- **Mobile** – Driver app auto‑reports location; student app displays live buses on list/map.
- **Admin Dashboard** – Full CRUD for buses, routes, drivers, students, assignments, attendance.
