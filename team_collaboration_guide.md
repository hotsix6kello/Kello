# K-TRIP Team Collaboration Guide (Efficient Workflow Strategy)

## 0. Core Principle: "Operating" the Project
Just as the product shifts travel from "Search" to "Operating", the team should shift from "Task Completion" to "Product Operating".
- **Goal:** Deliver value, not just code.
- **Mindset:** Everyone is a Product Owner for their feature.

## 1. R&R (Roles & Responsibilities) Strategy
Instead of simple Front/Back division, organize by **Domain (Feature Squads)** for better ownership.

### A. Squad 1: Core Experience (The "Operating System")
- **Focus:** App Shell, Real-time Dashboard (Today Tab), Map/Transport Integration.
- **Key Tech:** Geolocation, Maps API, Real-time Notifications, Performance Optimization.
- **Members:** 1 FE (Lead), 1 BE (Realtime/Socket).

### B. Squad 2: Commerce & Booking (The "Business Logic")
- **Focus:** Booking Hub, Payment Integration, Partner Portal (for shop owners).
- **Key Tech:** Transaction management, Calendar scheduling logic, Payment Gateway (PG).
- **Members:** 1 FE (Admin/Form heavy), 1 BE (Database/Transaction Architect).

### C. Squad 3: Content & Community (The "Growth Engine")
- **Focus:** Content Feed, Reviews/Trust Score, Community features.
- **Key Tech:** Image processing, Recommendation logic, Social features.
- **Members:** 1 FE (UI/UX heavy), 1 BE (Data/Search).

*Note: If the team is smaller (e.g., 3-4 people), combine squads but keep the domain separation clear in code.*

## 2. Communication & Design System First
### 🎨 Design System is the "Law"
- **Problem:** "Button looks different on every page."
- **Solution:** Define a `design-system` package or folder first.
    - Colors (Premium Black, Neon Accents), Typography, Spacing.
    - Components: `Button`, `Card`, `Modal`, `Input`.
    - **Rule:** Do not hardcode hex codes in feature files. Use variables.

### 📑 API Contract-First Development
- **Problem:** Frontend waits for Backend API to be finished.
- **Solution:** Define the Interface (TS Types / Swagger) *before* implementation.
    - Agree on JSON structure for `User`, `Booking`, `Spot`.
    - Mock the data in Frontend and build UI parallel to Backend development.

## 3. Workflow & Process (Agile-Lite)
### 🔄 Weekly Sprint (1 Week Cycle recommended for MVP)
- **Mon:** **Planning** (Select tasks from Backlog, clear goals).
- **Wed:** **Sync** (Check blockers, adjust scope if needed).
- **Fri:** **Review & Merge** (Demo the feature, Merge PRs).

### 🛠 Git Strategy (GitHub Flow)
1.  `main` (Production-ready).
2.  `develop` (Integration).
3.  Feature Branches: `feat/booking-calendar`, `fix/login-error`.
    - **Rule:** No direct commits to `main` or `develop`.
    - **Rule:** Pull Requests (PR) must be reviewed by at least 1 other member.

## 4. Tools & Rules
- **Code:** GitHub (Convention: [Conventional Commits](https://www.conventionalcommits.org/))
    - `feat: add booking cancellation logic`
    - `ui: update glassmorphism effect on cards`
- **Docs/Tasks:** Notion or Jira (Keep it simple: To Do, In Progress, Done).
- **Communication:** Slack/Discord.
    - Create channels per Squad: `#dev-core`, `#dev-commerce`.

## 5. MVP "Cut" Strategy (Vital for Efficiency)
- **If it's not "Operating" the travel, cut it.**
- Example:
    - **Keep:** "Show my subway route based on reservation time." (Operating)
    - **Cut:** "General subway map with all stations." (Information/Search -> Use existing apps links initially if hard)
- **Focus on the "Happy Path":** Make the *Reservation -> Visit -> Review* flow perfect first. Handle edge cases later.

## 6. Project Structure (Monorepo-like recommended)
Even if using one repo, structure folders clearly:
```
/apps
  /user-app (Next.js)
  /partner-web (Next.js or same app with RBAC)
  /admin-web
/packages
  /ui (Shared Design System)
  /utils (Shared logic)
  /types (Shared TypeScript interfaces)
```
*(For this MVP, we will start with a simple Next.js structure but keep components modular.)*
