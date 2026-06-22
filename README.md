# Wintrip Site

Static front-end pages for the Wintrip Projects dashboard and related member-management pages.

![Wintrip dashboard afbeelding](https://github.com/user-attachments/assets/edf72bba-17ef-4e47-902d-a996a0f36460)

The repository is primarily HTML, CSS, and JavaScript. It expects a hosting environment that serves the files from the repository root and provides the `/api/...` endpoints used by the dashboard, user, and member-management screens.

## What is included

- **Dashboard**: `dashboard.html` renders a column-based project/link dashboard using `assets/dashboard.js`.
- **User management**: `gebruikers.html` provides an admin interface for managing dashboard users.
- **Member pages**: the `leden/` directory contains sign-up, member list, member approval, and access-code management pages.
- **Agenda and Kanban pages**: `agenda.html` and `Kanban.html` are standalone utility pages.
- **Choir site export**: `koorsite/klein-koor.html` contains an exported choir landing page.
- **Shared assets**: `assets/` contains shared styling, images, icons, and JavaScript.

## Repository structure

```text
.
├── index.html                  # Redirects visitors to /dashboard.html
├── dashboard.html              # Main Wintrip Projects dashboard
├── gebruikers.html             # Dashboard user-management page
├── agenda.html                 # Agenda page
├── Kanban.html                 # Standalone Kanban page
├── assets/
│   ├── style.css               # Shared site styling
│   ├── dashboard.js            # Dashboard rendering logic
│   ├── gebruikers.js           # User-management logic
│   └── icons/                  # Dashboard icons
├── leden/
│   ├── aanmelden.html          # Member sign-up form
│   ├── leden.html              # Member list page
│   ├── ledenbeheer.html        # Member approval/management page
│   ├── ledentoegangbeheer.html # Access-code management page
│   ├── leden.css               # Member-page styling
│   └── leden.js                # Member-page logic
└── koorsite/
    └── klein-koor.html         # Exported choir page
```

## Running locally

Because the pages use root-relative paths such as `/assets/style.css`, serve the repository root instead of opening files directly in a browser.

```sh
cd /path/to/wintrip-site
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/` for the default redirect to the dashboard
- `http://localhost:8000/dashboard.html` for the dashboard
- `http://localhost:8000/leden/aanmelden.html` for the member sign-up page

Some pages depend on backend API routes and may only fully work in the deployed environment.

## Expected backend API routes

The front-end calls these API routes:

- `GET /api/state`
- `GET /api/files/{name}`
- `POST /api/login`
- Member management:
  - `POST /api/leden/login`
  - `POST /api/leden/aanmelden`
  - `GET /api/leden/items`
  - `POST /api/leden/approve/{id}`
  - `POST /api/leden/delete/{id}`
  - `GET /api/leden/download/{id}/{filename}`
  - `GET /api/leden/access`
  - `POST /api/leden/access/upsert`
  - `POST /api/leden/access/delete/{label}`

These endpoints are not implemented in this repository.

## Development notes

- Keep links and asset references root-relative unless the deployment path changes.
- Shared dashboard styling lives in `assets/style.css`.
- Member-specific styling and behavior live in `leden/leden.css` and `leden/leden.js`.
- Avoid committing generated export folders or large bundles; `.gitignore` already excludes old export directories.
