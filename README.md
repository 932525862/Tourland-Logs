# Tourland CRM — Director's Hub

A modern, role-based CRM admin dashboard for **Tourland**, built with React 19, TanStack Start, and Tailwind CSS v4. Provides separate, scoped experiences for **Directors** and **Employees** with real-time updates via WebSockets.

---

## Features

### Director Role
- 📊 **Dashboard** — Overview stats and analytics with Recharts
- 👥 **Employees** — Manage employee records and profiles
- 🏢 **Departments** — View and organize departments
- ✅ **Tasks** — Create and assign tasks, real-time sync
- 📋 **Forms** — Review and manage submitted forms
- 🧑‍💼 **Clients** — Full client management
- 📅 **Attendance** — Track employee attendance
- 🗃️ **Archive** — Archived records

### Employee Role
- 🏠 **Dashboard** — Personal summary and stats
- ✅ **Tasks** — View and update assigned tasks in real-time
- 📋 **Forms** — Submit and track forms
- 🏢 **Departments** — View department info
- 📅 **Attendance** — View personal attendance
- 👤 **Profile** — Manage personal profile
- 🗃️ **Archive** — Personal archived records

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) |
| UI | React 19, Radix UI, shadcn/ui primitives |
| Styling | Tailwind CSS v4 |
| Forms | React Hook Form + Zod |
| Data Fetching | TanStack Query v5 |
| Real-time | Socket.IO Client |
| Charts | Recharts |
| Build | Vite 7 |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm / pnpm

### Installation

```bash
# Clone the repo
git clone git@github.com:Kamalov-Q/Tourland-CRM-Admin.git
cd Tourland-CRM-Admin

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root (see `.env.example` if available):

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Project Structure

```
src/
├── routes/
│   ├── index.tsx              # Login / landing
│   ├── director.tsx           # Director layout
│   ├── director.index.tsx     # Director dashboard
│   ├── director.employees.tsx
│   ├── director.tasks.tsx
│   ├── director.forms.tsx
│   ├── director.clients.tsx
│   ├── director.departments.tsx
│   ├── director.attendance.tsx
│   ├── director.stats.tsx
│   ├── director.archive.tsx
│   ├── employee.tsx           # Employee layout
│   ├── employee.index.tsx     # Employee dashboard
│   ├── employee.tasks.tsx
│   ├── employee.forms.tsx
│   └── ...
├── components/                # Shared UI components
└── lib/                       # API clients, utilities
```

---

## Deployment

This project is configured for **Vercel** deployment. The `vercel.json` rewrites all routes to `index.html` for client-side routing.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Push to `main` to trigger an automatic Vercel deployment.

---

## License

Private — © Tourland. All rights reserved.
