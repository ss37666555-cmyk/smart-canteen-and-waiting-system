# ⚡ SmartQueue: AI-Based SmartQueue and Waiting Time Prediction System for a College Canteen

A responsive, lightweight web application prototype engineered to streamline college dining queues, eliminate congestion, and predict student waiting times using real-time operational queuing theory and algorithmic throughput modeling.

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [Problem Statement](#-problem-statement)
3. [Objectives](#-objectives)
4. [Current Features](#-current-features)
5. [System Architecture](#-system-architecture)
6. [Frontend & Backend Responsibilities](#-frontend--backend-responsibilities)
7. [Folder Structure](#-folder-structure)
8. [Queue Workflow](#-queue-workflow)
9. [Token Workflow](#-token-workflow)
10. [Waiting-Time Prediction Formula](#-waiting-time-prediction-formula)
11. [Comprehensive API Documentation](#-comprehensive-api-documentation)
12. [Error Handling & Error Boundaries](#-error-handling--error-boundaries)
13. [Unit Testing & Test Suite](#-unit-testing--test-suite)
14. [Test Execution Guide](#-test-execution-guide)
15. [Data Model & Schema Documentation](#-data-model--schema-documentation)
16. [Future Database Schema (Migration Plan)](#-future-database-schema-migration-plan)
17. [Current Limitations](#-current-limitations)
18. [Future Improvements](#-future-improvements)
19. [Review 2 / Technical Improvements](#-review-2--technical-improvements)
20. [How to Run](#-how-to-run)

---

## 📌 Project Overview
**SmartQueue** is an engineering prototype designed for institutional college dining environments. It introduces a decentralized token dispensing model paired with a deterministic wait-time prediction algorithm inspired by multi-server queuing theory (Little's Law approximation). Students can monitor canteen footfall, generate virtual queue tokens, and track order progress remotely, while canteen staff manage order throughput via a dedicated administrative console.

---

## ⚠️ Problem Statement
College canteens face severe rush-hour surges during brief recess intervals and lunch breaks. Traditional manual counter lines lead to:
- **Chaotic Lobby Congestion**: Unorganized crowds blocking canteen entrances and serving windows.
- **Unpredictable Wait Times**: Students queuing blindly without knowing when their order will be ready, leading to late attendance for lectures.
- **Counter Inefficiencies**: Kitchen staff overwhelmed by manual token announcements and order confusion.
- **Zero Remote Visibility**: Lack of live crowd transparency, forcing students to physically walk to the canteen to assess queue lengths.

---

## 🎯 Objectives
1. **Queue Virtualization**: Enable students to claim queue slots digitally from any device without standing in physical lines.
2. **Throughput Prediction**: Calculate accurate, dynamic service wait times based on live queue volume, counter service rate, and active operational counters.
3. **Staff Dispatch Optimization**: Provide canteen staff with an intuitive control interface to advance queues and complete tokens with immediate student synchronization.
4. **Resilient System Design**: Implement strict input validation, HTTP status standards, client-side error boundaries, and comprehensive unit/integration test coverage.

---

## 🚀 Current Features

### 1. Student Live Dashboard
- **Live Crowd Monitoring**: Displays active students in the canteen (baseline `42 Students`) with automated status badges (`⚡ Moderate Crowd`, `Peak Rush`, or `Low Rush`).
- **Now Serving Display**: Highlights the active token currently being fulfilled at the counter (`A119`).
- **Operational Counters Indicator**: Real-time counter capacity tracking (`3 Counters`).
- **AI Predicted Wait**: Instant wait-time projection based on live queue depth (`8 Minutes`).
- **Live Service Progress Bar**: Visual stage breakdown tracking order flow from preparation to counter pickup.
- **Quick Action Navigation**: Seamless switching between Dashboard, Token Generator, My Queue, Menu, and Staff Admin.

### 2. Digital Token Dispenser ("Get Queue Token")
- Generates a branded digital ticket with immediate queue assignment.
- **Baseline Demo Assignment**: Token `A127` at Position `8` with `7` students ahead and `8 Minutes` predicted wait.
- **Subsequent Token Auto-Increment**: Sequential token issuance (`A132`, `A133`...) for subsequent student requests.
- **Ticket Visuals**: Clear status indicators (`WAITING` vs `NOW SERVING`), counter routing instructions, and timestamping.

### 3. Real-Time Personal Queue Tracker ("My Queue")
- Dedicated view bound to the student's claimed token (persisted via `localStorage`).
- Live countdown of people ahead and remaining wait minutes.
- Dynamic transition to **"🔔 NOW SERVING - PLEASE PROCEED TO COUNTER"** with animated green visual status when called.

### 4. Canteen Food Menu
- Food item catalog displaying item name, price, category tag, and special badges:
  - 🍗 **Chicken Rice** — ₹80 (`Meals`, `Bestseller`)
  - 🥗 **Veg Rice** — ₹60 (`Meals`, `Popular`)
  - 🥞 **Dosa** — ₹40 (`Tiffin`, `Crispy`)
  - ⚪ **Idli** — ₹30 (`Tiffin`, `Steam Hot`)
  - ☕ **Tea** — ₹15 (`Beverages`, `Special`)
  - ☕ **Coffee** — ₹20 (`Beverages`, `Filter Coffee`)

### 5. Staff Admin Control Panel
- **Real-Time Operational Tally**: Displays students waiting (`12`), now serving (`A119`), completed orders (`86`), and operational counters (`3`).
- **`📢 Call Next`**: Advances the queue by calling the next waiting student, updating serving displays and recalculating wait estimates.
- **`✅ Complete Token`**: Marks the active order fulfilled and increments cumulative throughput.
- **Dynamic Counter Adjustment**: `+` and `-` controls to scale operational pickup counters between 1 and 10 with instant wait-time recalculation.
- **Interactive Queue Stream**: Visual stream of waiting token chips with highlight markers for the active demo user.
- **Demo State Reset**: One-click restore button restoring baseline prototype data.

---

## 🏗️ System Architecture

```
+-------------------------------------------------------------------------+
|                         CLIENT TIER (Browser)                           |
|                                                                         |
|  +--------------------+  +--------------------+  +-------------------+  |
|  | Student Dashboard  |  |  Token Generator   |  |   My Queue View   |  |
|  +--------------------+  +--------------------+  +-------------------+  |
|  |    Canteen Menu    |  | Staff Admin Panel  |  |   Toast Boundary  |  |
|  +--------------------+  +--------------------+  +-------------------+  |
|                                                                         |
|  Client Logic: Vanilla ES6+ | SafeFetch API Client | LocalStorage Sync   |
+------------------------------------+------------------------------------+
                                     |  HTTP REST / JSON
                                     v
+------------------------------------+------------------------------------+
|                         SERVER TIER (Node.js)                           |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | Express Application (server.js)                                   |  |
|  | - JSON Parser & Malformed Body Interceptor                        |  |
|  | - CORS Middleware & Static File Server                            |  |
|  | - REST Route Controllers & Status Standardizers                   |  |
|  | - Global 404 & 500 Error Boundaries                               |  |
|  +---------------------------------+---------------------------------+  |
|                                    | Internal Method Calls              |
|                                    v                                    |
|  +-------------------------------------------------------------------+  |
|  | Queue Engine Core (queueEngine.js)                                |  |
|  | - Little's Law Waiting-Time Algorithm                             |  |
|  | - Queue State Machine (QueueManager)                              |  |
|  | - Token Validation & Sequential Generator                         |  |
|  | - Operational Counter Bounds Validator                            |  |
|  +---------------------------------+---------------------------------+  |
|                                    | State Read / Mutate                |
|                                    v                                    |
|  +-------------------------------------------------------------------+  |
|  | In-Memory Data Store (JavaScript State Container)                 |  |
|  | - Active Queue Array | Serving Token | Counters | Menu Catalog    |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## ⚖️ Frontend & Backend Responsibilities

### Frontend (`index.html`, `style.css`, `script.js`)
- **Presentation & Responsive UI**: Clean academic blue/white design system with CSS Grid, Flexbox, custom status pills, and responsive breakpoints.
- **Client-Side State Tracking**: Persists the student's claimed token in browser `localStorage` across page refreshes.
- **Polling & Synchronization**: Automatically polls `/api/dashboard` and `/api/queue` every 4 seconds to maintain real-time telemetry.
- **Error Boundaries**: Uses `safeFetch` wrapper to catch network timeouts and display contextual error messages via colored toast notifications without crashing the UI.

### Backend (`server.js`, `queueEngine.js`)
- **RESTful API Delivery**: Serves endpoints conforming to standard HTTP semantics and status codes.
- **Algorithmic Computations**: Executes deterministic queuing calculations and handles edge cases (e.g., active counters = 0).
- **State Integrity**: Enforces business rules (cannot call next token when queue is empty, counters must be between 1 and 10).
- **Security & Validation**: Intercepts malformed JSON payloads and returns structured 400 Bad Request error envelopes.

---

## 📁 Folder Structure

```
smartqueue-canteen/
├── index.html                 # Single-page HTML5 application interface
├── style.css                  # Modern blue/white design system & responsive styling
├── script.js                  # Frontend controller, state sync & error boundaries
├── server.js                  # Express HTTP server, routes & API error handling
├── queueEngine.js             # Pure algorithmic business logic & QueueManager class
├── package.json               # Project manifest, dependencies & test scripts
├── package-lock.json          # Locked dependency tree
├── README.md                  # Granular technical documentation
├── .gitignore                 # Standard Node.js git exclusion rules
└── tests/                     # Automated test suites
    ├── queueEngine.test.js    # Unit tests for queue logic, formulas & state
    └── api.test.js            # Integration tests for Express REST endpoints
```

---

## 🔄 Queue Workflow

```
[Student Requests Token]
           │
           ▼
[Check: Does Student have active token?]
     ├── YES ──► [Return Existing Token & Current Queue Standing]
     └── NO  ──► [First Demo User? Claim A127 / Else Generate Sequential Token (A132...)]
                       │
                       ▼
         [Append Token to In-Memory Queue Array]
         [Increment Current Crowd Count (+1)]
         [Recalculate Dynamic Waiting Time]
                       │
                       ▼
           [Staff Clicks "Call Next"]
                       │
                       ▼
           [Check: Is Queue Empty?]
                ├── YES ──► [Return 400 Bad Request: QUEUE_EMPTY]
                └── NO  ──► [Shift First Token from Queue]
                            [Set Token as 'nowServing']
                            [Increment completedToday (+1)]
                            [Decrement Crowd Count (-1)]
                            [Notify Student: "NOW SERVING"]
                                   │
                                   ▼
                      [Staff Clicks "Complete Token"]
                                   │
                                   ▼
             [Fulfill Current Order & Advance to Next Token]
```

---

## 🎟️ Token Workflow
1. **Issuance**: Student clicks **"Get Queue Token"** or **"Generate Token Now"**. The backend validates the request, claims token `A127` (or generates sequential `A132...`), registers position `8`, and marks status as `WAITING`.
2. **Persistence**: The token ID is stored in client `localStorage` under `smartqueue_user_token`.
3. **Queue Advancement**: As canteen staff call tokens (`POST /api/queue/next`), the student's relative position drops (`8` $\to$ `7` $\to$ `6`...).
4. **Counter Announcement**: When the token reaches index 0 and is called, the server assigns `nowServing = token`. The client status flips to `NOW SERVING`, turning green with an urgent counter collection alert.
5. **Completion**: Staff click `Complete Token`, transitioning the student's status to `COMPLETED / READY`.

---

## 🧠 Waiting-Time Prediction Formula

The waiting time is estimated using multi-server queuing approximations adapted from Little's Law:

$$\text{waitingTime} = \frac{\text{queueLength} \times \text{averageServiceTime}}{\text{activeCounters}}$$

### Parameters:
- $\text{queueLength}$ ($Q$): Total students currently waiting in the active queue array.
- $\text{averageServiceTime}$ ($S$): Empirical average service duration per student ($2\text{ minutes}$).
- $\text{activeCounters}$ ($C$): Number of operational pickup counters ($3\text{ counters}$ by default).

### Baseline Demo Calculation:
$$\text{waitingTime} = \frac{12 \times 2}{3} = \frac{24}{3} = 8\text{ Minutes}$$

### Dynamic Adaptation:
If canteen staff increase operational counters from $3$ to $4$ using the admin toggle:
$$\text{waitingTime} = \frac{12 \times 2}{4} = \frac{24}{4} = 6\text{ Minutes}$$

### Edge Case Handled:
- If $\text{activeCounters} \le 0$: Division by zero is intercepted. The system returns an explicit error indicating that counters are offline (`PREDICTION_UNAVAILABLE`).
- If $\text{queueLength} = 0$: Returns $0\text{ minutes}$ (immediate service availability).

---

## 📡 Comprehensive API Documentation

All endpoints return JSON responses. Successful responses include `"success": true`, while error responses include `"success": false`, an descriptive `"error"` message, and an error `"code"`.

### 1. `GET /api/dashboard`
- **Purpose**: Fetches real-time canteen telemetry for the student dashboard.
- **Parameters**: None.
- **Example Request**:
  ```http
  GET /api/dashboard HTTP/1.1
  Host: localhost:3000
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "currentCrowd": 42,
    "crowdStatus": "Moderate Crowd",
    "nowServing": "A119",
    "activeCounters": 3,
    "estimatedWait": 8,
    "queueLength": 12,
    "completedToday": 86
  }
  ```
- **Error Responses**:
  - `500 Internal Server Error`: Server exception during state snapshot.

---

### 2. `GET /api/queue`
- **Purpose**: Returns the full waiting queue stream, active counters, and throughput parameters.
- **Parameters**: None.
- **Example Request**:
  ```http
  GET /api/queue HTTP/1.1
  Host: localhost:3000
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "nowServing": "A119",
    "queue": ["A120", "A121", "A122", "A123", "A124", "A125", "A126", "A127", "A128", "A129", "A130", "A131"],
    "queueLength": 12,
    "activeCounters": 3,
    "averageServiceTime": 2,
    "estimatedWait": 8,
    "completedToday": 86
  }
  ```

---

### 3. `POST /api/queue/join`
- **Purpose**: Generates and assigns a digital queue token for a student.
- **Request Body (Optional)**:
  - `preferredToken` (string, optional): Desired token identifier (format `/^[A-Z][0-9]{2,}$/`).
  - `requestedBy` (string, optional): Student nickname or identifier.
- **Example Request**:
  ```http
  POST /api/queue/join HTTP/1.1
  Host: localhost:3000
  Content-Type: application/json

  {
    "requestedBy": "Student Demo"
  }
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "token": "A127",
    "position": 8,
    "peopleAhead": 7,
    "estimatedWait": 8,
    "status": "WAITING"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`:
    ```json
    {
      "success": false,
      "error": "Invalid token format. Token must begin with an uppercase letter followed by numbers (e.g., A127).",
      "code": "INVALID_TOKEN_FORMAT"
    }
    ```

---

### 4. `GET /api/queue/prediction`
- **Purpose**: Returns detailed formula variables and the computed AI waiting time.
- **Parameters**: None.
- **Example Request**:
  ```http
  GET /api/queue/prediction HTTP/1.1
  Host: localhost:3000
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "queueLength": 12,
    "averageServiceTime": 2,
    "activeCounters": 3,
    "waitingTime": 8,
    "formula": "(queueLength × averageServiceTime) / activeCounters",
    "calculation": "(12 × 2) / 3 = 8 Minutes",
    "message": "AI-Based Predicted Waiting Time: 8 Minutes"
  }
  ```
- **Error Responses**:
  - `503 Service Unavailable` (e.g. counters = 0):
    ```json
    {
      "success": false,
      "error": "Active counters must be at least 1. Counters are currently offline.",
      "code": "PREDICTION_UNAVAILABLE",
      "activeCounters": 0,
      "queueLength": 12
    }
    ```

---

### 5. `POST /api/queue/next`
- **Purpose**: Admin action to shift the waiting line and call the next student to the pickup counter.
- **Request Body**: None.
- **Example Request**:
  ```http
  POST /api/queue/next HTTP/1.1
  Host: localhost:3000
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Now serving A120",
    "nowServing": "A120",
    "queueLength": 11,
    "completedToday": 87,
    "currentCrowd": 41,
    "estimatedWait": 7,
    "queue": ["A121", "A122", "A123", "A124", "A125", "A126", "A127", "A128", "A129", "A130", "A131"]
  }
  ```
- **Error Responses**:
  - `400 Bad Request` (Empty Queue):
    ```json
    {
      "success": false,
      "error": "Queue is empty. No students are currently waiting to be called.",
      "code": "QUEUE_EMPTY"
    }
    ```

---

### 6. `POST /api/queue/complete`
- **Purpose**: Admin action to mark the current order fulfilled and shift to the next token.
- **Request Body**: None.
- **Example Request**:
  ```http
  POST /api/queue/complete HTTP/1.1
  Host: localhost:3000
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Completed token A119. Now serving A120",
    "nowServing": "A120",
    "queueLength": 11,
    "completedToday": 87,
    "currentCrowd": 41,
    "estimatedWait": 7,
    "queue": ["A121", "A122", "A123", "A124", "A125", "A126", "A127", "A128", "A129", "A130", "A131"]
  }
  ```
- **Error Responses**:
  - `400 Bad Request` (No Active Token & Queue Empty):
    ```json
    {
      "success": false,
      "error": "No active token is currently being served, and queue is empty.",
      "code": "NO_ACTIVE_TOKEN"
    }
    ```

---

### 7. `GET /api/menu`
- **Purpose**: Returns canteen menu catalog and prices.
- **Parameters**: None.
- **Example Request**:
  ```http
  GET /api/menu HTTP/1.1
  Host: localhost:3000
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "menu": [
      { "id": 1, "name": "Chicken Rice", "price": 80, "category": "Meals", "icon": "🍗", "badge": "Bestseller" },
      { "id": 2, "name": "Veg Rice", "price": 60, "category": "Meals", "icon": "🥗", "badge": "Popular" },
      { "id": 3, "name": "Dosa", "price": 40, "category": "Tiffin", "icon": "🥞", "badge": "Crispy" },
      { "id": 4, "name": "Idli", "price": 30, "category": "Tiffin", "icon": "⚪", "badge": "Steam Hot" },
      { "id": 5, "name": "Tea", "price": 15, "category": "Beverages", "icon": "☕", "badge": "Special" },
      { "id": 6, "name": "Coffee", "price": 20, "category": "Beverages", "icon": "☕", "badge": "Filter Coffee" }
    ]
  }
  ```

---

### 8. `POST /api/counters`
- **Purpose**: Configures operational counter capacity (limits: 1 to 10).
- **Request Body**:
  - `counters` (integer, required): Target counter capacity.
- **Example Request**:
  ```http
  POST /api/counters HTTP/1.1
  Host: localhost:3000
  Content-Type: application/json

  {
    "counters": 4
  }
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "activeCounters": 4,
    "estimatedWait": 6,
    "message": "Active counters updated to 4"
  }
  ```
- **Error Responses**:
  - `400 Bad Request` (Missing field):
    ```json
    {
      "success": false,
      "error": "Missing required field \"counters\" in request body.",
      "code": "MISSING_REQUIRED_FIELD"
    }
    ```
  - `400 Bad Request` (Value out of bounds or non-numeric):
    ```json
    {
      "success": false,
      "error": "Counter value out of range. Must be between 1 and 10.",
      "code": "INVALID_COUNTER_VALUE"
    }
    ```

---

### 9. `POST /api/reset`
- **Purpose**: Restores in-memory state back to original demo benchmark values.
- **Request Body**: None.
- **Example Request**:
  ```http
  POST /api/reset HTTP/1.1
  Host: localhost:3000
  ```
- **Successful Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Demo state reset successfully to baseline values."
  }
  ```

---

### 10. `ALL /api/*` (Unregistered Route Boundary)
- **Purpose**: Catches any non-existent API requests and responds with standard JSON.
- **Response (`404 Not Found`)**:
  ```json
  {
    "success": false,
    "error": "API route not found: GET /api/unknown-endpoint",
    "code": "ENDPOINT_NOT_FOUND"
  }
  ```

---

## 🛡️ Error Handling & Error Boundaries

### Backend Error Handling:
1. **JSON Body Interceptor**: Middleware catches malformed JSON strings sent to Express and responds with HTTP 400 (`INVALID_JSON_BODY`) instead of crashing.
2. **Boundary Validation**: Every parameter (counter bounds, token strings, empty queue operations) is validated before state mutation occurs.
3. **Dedicated 404 Route Catcher**: Prevents unmatched `/api/*` endpoints from serving HTML pages.
4. **Global Express Error Middleware**: Catches unhandled runtime exceptions and returns standard HTTP 500 JSON envelopes.

### Frontend Error Boundaries:
1. **`safeFetch()` Wrapper**: Intercepts `window.fetch`, inspects HTTP status codes (`res.ok`), and parses JSON safely. If the server returns a 4xx or 5xx code, it surfaces the backend error message cleanly.
2. **Contextual Toast System**: Errors are highlighted in red toast banners (e.g. `⚠️ Queue is empty. No students are currently waiting to be called.`), informing the user without breaking page layout.
3. **Network Resiliency**: If the Node.js server goes down or is unreachable, the client catches the network exception and displays an actionable offline warning.

---

## 🧪 Unit Testing & Test Suite

The project includes real, executable automated test suites powered by Node.js's native test runner (`node:test`) and assertion module (`node:assert`), with HTTP integration tests via `supertest`.

### Summary of Tests:

| Test Suite | File | Tests Count | Scope |
|---|---|---|---|
| **Queue Engine Unit Tests** | `tests/queueEngine.test.js` | 27 tests | Algorithmic formulas, division by zero guards, position indexing, token validation, QueueManager state machine |
| **REST API Integration Tests** | `tests/api.test.js` | 18 tests | HTTP endpoints, status codes, payload validation, malformed JSON, 404 handler |
| **Total Automated Tests** | — | **45 tests** | **100% Pass Rate** |

### Code Coverage:
- **`queueEngine.js`**: `98.13%` Line Coverage, `100.00%` Function Coverage
- **`server.js`**: `86.73%` Line Coverage, `78.57%` Function Coverage
- **Overall Codebase**: `93.11%` Line Coverage

---

## 🚦 Test Execution Guide

Run the automated test suites using the standard npm scripts:

```bash
# 1. Run all unit and integration tests
npm test

# 2. Run all tests with code coverage analysis
npm run test:coverage
```

### Expected Output:
```text
✔ REST API - Integration Test Suite (18 tests passed)
✔ Queue Engine - Unit Test Suite (27 tests passed)
ℹ tests 45
ℹ pass 45
ℹ fail 0
ℹ Line Coverage: 93.11%
```

---

## 💾 Data Model & Schema Documentation

> **IMPORTANT ARCHITECTURAL NOTE:**
> The current SmartQueue prototype intentionally uses **in-memory JavaScript data structures** inside Node.js memory instead of a persistent database engine (such as MongoDB, MySQL, or PostgreSQL). This architecture was chosen for rapid prototyping, zero external database setup requirements, and ultra-fast in-memory queue lookups.

### Actual In-Memory Data Structures:

#### 1. Queue Stream Entity (`Array<string>`)
An ordered JavaScript array representing students standing in the virtual queue:
```javascript
let queue = [
  'A120', 'A121', 'A122', 'A123', 'A124', 'A125', 
  'A126', 'A127', 'A128', 'A129', 'A130', 'A131'
];
```
- **Type**: `Array<string>`
- **Constraints**: FIFO (First-In, First-Out). Front of array (`queue[0]`) is the next token to be served.

#### 2. Canteen Operational Metrics Container
```javascript
{
  activeCounters: 3,        // Number (integer, 1 - 10): Operational pickup counters
  averageServiceTime: 2,    // Number (minutes): Average duration to fulfill 1 token
  currentCrowd: 42,         // Number: Estimated total students inside the canteen area
  completedToday: 86,       // Number: Cumulative orders fulfilled since morning opening
  nowServing: "A119",       // String: Active token ID displayed at counter pickup screen
  tokenCounter: 132,        // Number: Cursor for generating sequential token IDs
  userToken: "A127"         // String | null: Token ID bound to active demo session
}
```

#### 3. Menu Item Entity
```javascript
{
  id: 1,                    // Number (primary key within catalog)
  name: "Chicken Rice",     // String: Food dish title
  price: 80,                // Number: Price in INR (₹)
  category: "Meals",        // String: Menu grouping ("Meals", "Tiffin", "Beverages")
  icon: "🍗",               // String: Unicode emoji icon for UI display
  badge: "Bestseller"       // String: Promotional badge
}
```

---

## 🗄️ Future Database Schema (Migration Plan)

To transition from the in-memory prototype to an enterprise production deployment, the following relational and document schemas are designed:

### 1. Relational Database Schema (PostgreSQL / MySQL)

```sql
-- 1. Counters Table
CREATE TABLE counters (
    counter_id SERIAL PRIMARY KEY,
    counter_number INT NOT NULL UNIQUE,
    staff_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Canteen Daily Sessions & Parameters Table
CREATE TABLE canteen_sessions (
    session_id SERIAL PRIMARY KEY,
    session_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    average_service_time_minutes NUMERIC(4, 2) DEFAULT 2.00,
    active_counters_count INT DEFAULT 3,
    estimated_crowd INT DEFAULT 42,
    completed_orders_count INT DEFAULT 0
);

-- 3. Menu Catalog Table
CREATE TABLE menu_items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price NUMERIC(6, 2) NOT NULL,
    icon VARCHAR(10),
    badge VARCHAR(50),
    is_available BOOLEAN DEFAULT TRUE
);

-- 4. Queue Tokens Table
CREATE TABLE queue_tokens (
    token_id SERIAL PRIMARY KEY,
    token_code VARCHAR(10) NOT NULL UNIQUE, -- e.g. 'A127'
    student_id VARCHAR(50),                 -- e.g. College Roll / Email
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'SERVING', 'COMPLETED', 'CANCELLED'
    queue_position INT,
    estimated_wait_minutes INT,
    counter_id INT REFERENCES counters(counter_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    served_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for lightning-fast queue lookups
CREATE INDEX idx_queue_tokens_status ON queue_tokens(status);
CREATE INDEX idx_queue_tokens_created_at ON queue_tokens(created_at);
```

### 2. Document Database Schema (MongoDB / NoSQL alternative)

```javascript
// Collection: queue_tokens
{
  "_id": ObjectId("665f1a2b9c8d1e001a2b3c4d"),
  "tokenCode": "A127",
  "student": {
    "studentId": "CS-2024-042",
    "deviceFingerprint": "browser_hash_abc123"
  },
  "status": "WAITING", // WAITING | SERVING | COMPLETED | CANCELLED
  "orderItems": [
    { "itemId": 1, "name": "Chicken Rice", "quantity": 1, "price": 80 }
  ],
  "metrics": {
    "queuePosition": 8,
    "peopleAhead": 7,
    "estimatedWaitMinutes": 8
  },
  "assignedCounter": 3,
  "timestamps": {
    "issuedAt": ISODate("2026-10-05T12:00:00Z"),
    "servingStartedAt": null,
    "completedAt": null
  }
}
```

---

## ⚠️ Current Limitations
1. **Volatile Memory Storage**: If the Node.js server process restarts, queue state returns to the pre-seeded demo baseline.
2. **Single Campus Canteen Scope**: The current logic models a single shared food pickup counter area rather than multiple independent vendor stalls.
3. **Client-Side Polling**: Telemetry sync uses 4-second HTTP polling rather than bi-directional WebSockets (SSE / Socket.IO).
4. **Static Service Duration**: The average service time per student is fixed at 2 minutes rather than calculated dynamically from individual food prep complexity.

---

## 🔮 Future Improvements
1. **Computer Vision Crowd Density Estimation**: Connect canteen entrance CCTV feeds with a lightweight YOLOv8 model to automate footfall monitoring.
2. **WebSocket Real-Time Broadcasts**: Replace interval polling with Socket.IO for sub-millisecond counter change broadcasts.
3. **SMS & WhatsApp Order Notifications**: Push automated alerts when a student's token is 2 positions away.
4. **Item-Specific Prep Estimation**: Adjust service time weights dynamically (e.g. Tea = 45s, Dosa = 4m).
5. **Multi-Canteen Vendor Routing**: Support multiple specialized queue tracks (Snack Counter vs Full Meals).

---

## 🏆 Review 2 / Technical Improvements

Addressing Evaluator Feedback:

1. **Unit & Integration Testing Implemented**:
   - Integrated Node.js native test runner (`node:test`) and `supertest`.
   - Built **45 comprehensive automated tests** across `tests/queueEngine.test.js` and `tests/api.test.js`.
   - Validated wait-time formulas, queue positions, token generation, boundary values, empty queue conditions, and HTTP status codes.
   - Reached **93.11% overall test coverage** (98.13% on core queue engine).

2. **Error Handling & Error Boundaries**:
   - Added malformed JSON body interceptors to Express.
   - Enforced HTTP 400 Bad Request responses with structured error codes (`QUEUE_EMPTY`, `INVALID_COUNTER_VALUE`, `INVALID_TOKEN_FORMAT`).
   - Added dedicated 404 JSON handlers for unregistered `/api/*` routes.
   - Implemented `safeFetch` error boundary on the frontend with colored toast error notifications to prevent silent UI failures.

3. **Expanded Code Comments**:
   - Documented architectural decisions, Little's Law formula mechanics, queue state machines, and edge case rationale in `queueEngine.js`, `server.js`, and `script.js`.
   - Preserved code clarity by avoiding trivial comments and highlighting technical decisions.

4. **Documented REST API Endpoints & Data Schema**:
   - Formatted comprehensive documentation for all 9 API endpoints, detailing methods, URLs, parameters, example payloads, success responses, and error codes.
   - Accurately documented current in-memory data structures while transparently acknowledging that a database is not yet integrated.
   - Provided an actionable SQL DDL and NoSQL migration plan for future database integration.

---

## 💻 How to Run

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended; verified on Node v24.11)
- npm (Node Package Manager)

### Step-by-Step Instructions:

1. **Navigate to the Project Directory**:
   ```bash
   cd smartqueue-canteen
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run the Automated Tests**:
   ```bash
   npm test
   ```

4. **Check Test Coverage**:
   ```bash
   npm run test:coverage
   ```

5. **Start the Canteen Server**:
   ```bash
   npm start
   ```

6. **Access the Web App**:
   Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 📄 License
This project is open-source and developed for academic demonstration purposes under the **MIT License**.
