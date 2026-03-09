# 🤖 Agent Context: Router Automation Project

Welcome! This file provides the complete context, architectural decisions, and current state of the Router Automation backend project. Use this file to get up to speed quickly when continuing development across different machines or sessions.

## 🎯 Project Overview
This project is a Node.js/Express backend designed to automate the configuration of various hardware routers. It interfaces with:
1. **IoT Relays (NodeMCU):** To toggle power to specific routers.
2. **Host OS Wi-Fi:** To dynamically connect the host machine to a target router's network.
3. **Playwright:** To automate browser interactions (login, change security settings) on the router's admin page.

## 🛠️ Tech Stack & Conventions
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** SQLite (using `better-sqlite3` for synchronous, high-performance queries)
* **Authentication:** JWT (JSON Web Tokens) stored in HTTP-Only, `SameSite=lax` cookies. No HTTPS required for local development.
* **Logging:** `winston` and `winston-daily-rotate-file` (unzipped, 30-day retention).
* **Hardware Requests:** `axios`
* **Automation:** `playwright`

### Established Patterns
* Controllers use `try...catch` blocks and standard JSON error responses.
* Database operations use raw SQL strings via `db.prepare()`.
* Protected routes use the `isAuthenticated` middleware.
* Operations modifying the database require the `isAdmin` middleware.
* API inputs are generally case-insensitive (e.g., action: "ON" or "on" are handled correctly).

## 🗄️ Database Schema
The database uses a single SQLite file (`src/db/database.sqlite`). If deleted, the `src/db/seed.js` script will automatically recreate tables and populate dummy data.

**`users`**
* `id` (PK)
* `email` (Unique)
* `password_hash`
* `role` ('admin' or 'user')

**`switch_nodes`** (IoT Relays)
* `id` (PK)
* `switch_node_ip`
* `switch_node_mac` (Unique)

**`routers`**
* `id` (PK)
* `manufacturer`, `model`, `country`, `serial_number`, `category`
* `power_status` ('on' or 'off')
* `switch_node_id` (FK -> switch_nodes.id)
* `position_in_switch` (0-9)
* `wireless_ssid_24ghz`, `wireless_ssid_5ghz`, `wireless_ssid_6ghz`
* `wireless_password`
* `security_types` (JSON String array: e.g., '["WPA2", "WPA3"]')
* `admin_page_url`, `admin_page_username`, `admin_page_password`

## 📁 Directory Structure
```text
/src
 ├── app.js               
 ├── server.js            # Entry point
 ├── db/                  
 │   ├── init.js          # DB connection and schema creation
 │   ├── seed.js          # Dummy data population
 │   └── database.sqlite  
 ├── controllers/         # Express route handlers
 ├── routes/              # Express router definitions
 ├── middleware/          # Auth and Admin checks
 ├── services/            # Core business logic (switchService, wifiService, etc.)
 ├── scripts/             # Playwright automation scripts (Target for Phase 6)
 └── utils/               
     └── logger.js        # Winston configuration
```

## 🚥 Current Progress (Completed)
* ✅ **Phase 1:** Project Setup, Logging, DB Initialization, Seeding.
* ✅ **Phase 2:** JWT Authentication & HTTP-Only Cookies.
* ✅ **Phase 3:** CRUD Operations for Switches and Routers (Admin/User RBAC applied).
* ✅ **Phase 4:** Hardware Service (`switchService.js`). Communicates with NodeMCU via HTTP to toggle single relays (`/D0/on`) or entire switches (`/all/off`).

## 🚀 Pending Work (Next Steps)

### Phase 5: Wi-Fi Service (Windows Only)
**Goal:** Allow the backend to scan for networks and connect to a specific SSID.
* **Implementation:** Wrap Windows OS-level commands using Node's `child_process.exec` to run `netsh wlan`.
* **Requirements:** Require `WIFI_INTERFACE` (e.g., `"Wi-Fi"`) from `.env`. Assume a default WPA2 security type for the XML profiles generated.
* **Note:** When developing on WSL (Arch), testing `netsh` will fail because WSL does not have direct access to the Windows Wi-Fi adapter. Code must be written in WSL but executed in standard Windows Node.js.

### Phase 6: Playwright Orchestrator
**Goal:** Dynamically load and execute scripts to configure routers.
* **Implementation:** `src/services/automationService.js`.
* **Flow:** 
  1. Receive request to configure router X.
  2. Use Wi-Fi service to connect to router X's SSID.
  3. Load specific script from `src/scripts` based on Manufacturer/Model.
  4. Launch Playwright, execute script, catch errors, and cleanup.

## 📝 Developer Notes
* **WSL Workflow:** You can write code in WSL, but run `npm run dev` from a standard Windows terminal (PowerShell) pointing to the WSL UNC path (`\\wsl$\...`) to test Wi-Fi and UI automation.
* **Environment Variables:** Ensure `.env` includes `PORT`, `JWT_SECRET`, and `WIFI_INTERFACE`.
