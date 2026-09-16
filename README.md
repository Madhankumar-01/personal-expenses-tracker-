# Personal Expense Tracker

A full-stack CRUD web application for tracking personal expenses, built to satisfy the
SOP for Complete CRUD-Based Web Application Development.

## Overview

Users can add, view, edit, delete, search, filter, and sort personal expenses, and see
summary analytics (total spend, spend by category, spend by month).

## Tech Stack

| Layer            | Technology                          |
|-------------------|--------------------------------------|
| Frontend           | React (Vite), plain CSS             |
| Backend / REST API | Node.js, Express                    |
| Database           | SQLite (via better-sqlite3)         |
| API testing        | curl / Postman (see below)          |
| Version control    | Git                                  |

This mirrors the SOP's Django/Spring Boot + SQL stack conceptually — a REST API server,
an ORM-style data layer, and a relational (SQL) database — using Node/Express/SQLite as
a lightweight equivalent that runs with zero external services.

## Project Structure

```
expense-tracker/
├── backend/
│   ├── server.js        # Express app, all REST routes, validation, DB schema
│   ├── package.json
│   └── .env              # PORT config
├── frontend/
│   ├── src/
│   │   ├── api.js                    # fetch wrapper for all API calls
│   │   ├── App.jsx                   # top-level state & CRUD orchestration
│   │   ├── index.css                 # design system / styling
│   │   └── components/
│   │       ├── ExpenseForm.jsx       # create/edit form + client validation
│   │       ├── ExpenseList.jsx       # table of expenses, edit/delete actions
│   │       ├── FilterBar.jsx         # search, category filter, date range, sort
│   │       ├── SummaryPanel.jsx      # totals + top categories
│   │       └── ConfirmModal.jsx      # delete confirmation dialog
│   ├── index.html
│   ├── package.json
│   └── .env               # VITE_API_URL
└── README.md
```

## Database Design

**Table: `expenses`**

| Column      | Type    | Constraints                          |
|-------------|---------|---------------------------------------|
| id          | INTEGER | PRIMARY KEY, AUTOINCREMENT            |
| title       | TEXT    | NOT NULL                              |
| amount      | REAL    | NOT NULL, CHECK (amount > 0)          |
| category    | TEXT    | NOT NULL                              |
| date        | TEXT    | NOT NULL (ISO format YYYY-MM-DD)      |
| notes       | TEXT    | nullable                              |
| created_at  | TEXT    | default: current timestamp            |
| updated_at  | TEXT    | default: current timestamp, refreshed on update |

Single-entity design (this is intentionally simple, matching an "Expense Tracker" from
the SOP's project list). The schema and constraints are created automatically on first
server run — no manual migration step needed.

## REST API Endpoints

| Operation  | Method | Endpoint              | Description                          |
|------------|--------|------------------------|----------------------------------------|
| Health     | GET    | `/api/health`          | Liveness check                        |
| Create     | POST   | `/api/expenses`        | Create a new expense                  |
| Read All   | GET    | `/api/expenses`        | List expenses (supports query params) |
| Read One   | GET    | `/api/expenses/:id`    | Get a single expense                  |
| Update     | PUT    | `/api/expenses/:id`    | Update an existing expense (partial ok) |
| Delete     | DELETE | `/api/expenses/:id`    | Delete an expense                     |
| Summary    | GET    | `/api/summary`         | Totals, by-category, by-month figures |

**Query params on `GET /api/expenses`:** `category`, `search`, `from`, `to`, `sortBy`
(`date`\|`amount`\|`title`\|`category`\|`created_at`), `order` (`ASC`\|`DESC`).

### Example requests

```bash
# Create
curl -X POST http://localhost:5000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"title":"Groceries","amount":45.50,"category":"Food","date":"2026-09-10","notes":"Weekly shop"}'

# Read all, filtered
curl "http://localhost:5000/api/expenses?category=Food&sortBy=amount&order=DESC"

# Update
curl -X PUT http://localhost:5000/api/expenses/1 \
  -H "Content-Type: application/json" -d '{"amount":50.00}'

# Delete
curl -X DELETE http://localhost:5000/api/expenses/1
```

## Validation Rules

- `title`: required, non-empty, max 100 characters
- `amount`: required, numeric, must be > 0
- `category`: required, must be one of the fixed category list
- `date`: required, valid date, cannot be in the future
- `notes`: optional, max 500 characters

All rules are enforced **server-side** (the source of truth) and mirrored **client-side**
for immediate feedback, per the SOP's validation requirements.

## Setup & Run Instructions

### Prerequisites
- Node.js 18+ and npm

### 1. Backend

```bash
cd backend
npm install
npm start
```

Runs on `http://localhost:5000`. The SQLite database file (`expenses.db`) is created
automatically on first run in the `backend/` folder.

### 2. Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` (Vite default) and talks to the backend at the URL set
in `frontend/.env` (`VITE_API_URL`).

### 3. Use the app

Open `http://localhost:5173` in a browser. Add an expense, edit it, filter/search the
list, and delete it to exercise all four CRUD operations.

## Testing Performed

- **Create**: valid data → 201 + record returned; empty title, negative amount, invalid
  category, and future date → 400 with descriptive error list.
- **Read**: empty table → empty array with count 0; populated table → correct records,
  filtering, search, and sorting all verified.
- **Update**: valid partial update → 200 + updated record; non-existent ID → 404.
- **Delete**: valid ID → 200 + confirmation; non-existent ID → 404.
- **Frontend**: responsive at desktop and narrow/mobile widths (single-column layout
  under 860px); form validation blocks submission with inline errors; toast notifications
  confirm success/failure; delete requires confirmation modal.
- **Error handling**: frontend shows a banner if the backend is unreachable.

## Security Notes

- No secrets are hard-coded; `PORT` and `VITE_API_URL` are read from `.env` files
  (excluded from version control via `.gitignore`).
- All SQL is parameterized via `better-sqlite3` prepared statements — no string-built
  queries, so the app is not vulnerable to SQL injection.
- Server-side validation is authoritative; client-side validation is a UX convenience
  only, matching the SOP's requirement that server-side checks exist even when
  client-side validation is present.

## Future Enhancements

- User authentication (per-user expense lists)
- Recurring expenses / budgets per category with alerts
- CSV/PDF export of filtered results
- Pagination for very large expense lists
- Switch to PostgreSQL/MySQL for multi-user deployment

## Completion Checklist (per SOP §17)

- [x] Application starts without errors
- [x] Database connection works correctly
- [x] Create operation works
- [x] Read/list operation works
- [x] Update operation works
- [x] Delete operation works
- [x] Validation works (client + server)
- [x] Search/filter/sort implemented
- [x] API endpoints demonstrated (see examples above)
- [x] Source code and documentation included
