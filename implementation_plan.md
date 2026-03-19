# K-TRIP Operating System Implementation Plan (PRD v3.0)

## 1. Project Overview
- **Product:** K-TRIP (Integrated K-Mate / DailyK)
- **Concept:** Korea Travel Operating System (Foreign Local Experience OS)
- **Vision:** "Operating" not just "Searching". Automating the travel experience from arrival to departure.
- **Tech Stack:**
  - **Frontend:** Next.js (React) - PWA / Mobile Web (App-like UX)
  - **Backend:** Supabase (Auth, DB, Storage)
  - **Styling:** Vanilla CSS / CSS Modules (Premium Glassmorphism)
  - **AI:** OpenAI API + Whisper (Planner, Translator)
  - **Maps:** Google Maps + Naver Map API (Hybrid)

## 2. Service Architecture (7 Core Pillars)
1.  **Daily Travel Feed (Operation Home):** "TODAY IN KOREA" dashboard. Real-time schedule, weather, routing.
2.  **Smart Trip Planner (AI):** Auto-generated itinerary based on budget/interest.
3.  **Smart Transport Navigator:** Subway/Bus integrated navigation.
4.  **Integrated Booking Hub:** Beauty, Dining, Tours, Stay.
5.  **Carecation Engine:** K-Beauty/Medical styling & booking (Key Revenue).
6.  **Real-time Events Map:** Pop-ups, Festivals, K-Culture spots.
7.  **Community & Marketplace:** Travel Meetup & Used Goods Trading.

## 3. MVP (P0) Scope Execution Strategy

### Phase 1: Core Foundation (Current)
- **Objective:** Setup "OS" Environment (App Shell, Design System).
- **Tasks:**
  - [x] Next.js Initialization & PWA Config.
  - [x] Premium Glassmorphism Design System (`globals.css`).
  - [ ] Global Layout (Bottom Navigation, Status Bar).
  - [ ] Supabase Auth Integration.

### Phase 2: Operating Dashboard (Pillar 1)
- **Objective:** The "Home" screen where the OS "operates" the user's day.
- **Features:**
  - [ ] "TODAY IN KOREA" Header & Status.
  - [ ] Timeline View (Active & Upcoming Items).
  - [ ] Real-time Weather & Context widgets.

### Phase 3: Smart Trip Planner & Transport (Pillar 2 & 3)
- **Objective:** AI Connection of Schedule + Movement.
- **Features:**
  - [ ] AI Input Form (Date, Interest, Budget).
  - [ ] Itinerary Generation Logic.
  - [ ] Transport Route Detail View (Subway/Bus).

### Phase 4: Booking & Carecation (Pillar 4 & 5)
- **Objective:** Revenue Generation.
- **Features:**
  - [ ] Reservation Detail Page (Beauty/Dining).
  - [ ] "Verified Price" Display.
  - [ ] Carecation Portfolio Gallery.

### Phase 5: Trust & Community (Pillar 7)
- **Objective:** User Retention & Validation.
- **Features:**
  - [ ] User Passport (Profile & Trust Score).
  - [ ] Review Logic (Verified Booking only).

## 4. Immediate Development Targets
1.  **Refine "Today Feed":** Update `page.tsx` to match the "Operating Dashboard" spec (Status Bar, Timeline).
2.  **Implement Bottom Navigation:** Ensure smooth transition between "Today", "Move", "Book".
3.  **Data Structure:** Define Supabase Schema for `Itinerary`, `Booking`, `User`.
