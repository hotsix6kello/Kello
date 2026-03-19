# mypage QA Result Template

## 1. Purpose

Use this document to record QA results in a consistent format after running:

- manual QA
- AI-assisted browser QA

This is a **result log template**, not a test plan.

- [mypage-handoff.md](C:/Users/USER/Desktop/kello/docs/mypage-handoff.md#L1) = branch state / implementation summary
- [mypage-qa-runbook.md](C:/Users/USER/Desktop/kello/docs/mypage-qa-runbook.md#L1) = execution procedure
- this document = session result capture and triage format

---

## 2. Test Session Meta

Copy and fill this block for each QA session.

```md
## QA Session Meta

- Date:
- Tester:
- QA Mode: Manual / AI-assisted / AI-only
- Environment: Local / Preview / Staging
- Branch:
- Commit:
- Locale: ko / en / mixed
- Viewport / Device:
- Booking Context: Generic / Booking-aware / Mixed
- Seeded localStorage: Yes / No
- Runbook sections covered:
- Notes:
```

---

## 3. Quick Summary Table

Fill this once per QA session.

```md
## QA Summary

| Metric | Count / Notes |
| --- | --- |
| Total issues |  |
| Blockers |  |
| High |  |
| Medium |  |
| Minor |  |
| Documented limitations |  |
| Passed flows |  |
| Untested flows |  |
```

---

## 4. Issue Entry Template

Copy this block once per issue.

```md
## Issue: QA-XXX

- ID:
- Route / Flow:
- Scenario:
- Preconditions:
- Steps to reproduce:
  1.
  2.
  3.
- Expected:
- Actual:
- Severity: Blocker / High / Medium / Minor / Won't fix / Documented limitation
- Type: Bug / UI polish / Copy-locale / Documented limitation
- Tags:
- Booking-aware or Generic:
- Viewport / Device:
- Screenshot / Evidence:
- Console / Network notes:
- Notes:
- Suggested owner / next action:
```

Recommended `Route / Flow` examples:

- `/my/bookings -> /my/support`
- `/my/bookings -> /planner`
- `/planner focused booking`
- `/my/saved recent normalization`
- `/explore/[id] fallback`
- `/help/medical mobile`

---

## 5. Severity Guide

Use these definitions consistently.

### Blocker

- user is blocked from continuing a core flow
- wrong route or broken context in booking-aware flow
- misleading safe/unsafe detail behavior that opens the wrong destination
- crash, blank page, or broken navigation

### High

- core flow completes incorrectly but user can still recover manually
- planner focus lands on wrong item/day
- booking-aware banner/CTA loses the booking context
- unsafe detail CTA appears where it must not appear

### Medium

- flow works but important UX logic is noticeably wrong
- wrong CTA order
- incorrect fallback destination that still keeps user unblocked
- old recent normalization behaves inconsistently

### Minor

- spacing, wrapping, height imbalance, dense first-screen layout
- copy inconsistency
- viewport-specific visual polish issues

### Won't fix / Documented limitation

- already known limitation listed in handoff/runbook
- not a regression
- product currently behaves as documented

---

## 6. Type Guide

### Bug

- incorrect behavior
- broken state propagation
- wrong route / wrong data / wrong matching

### UI polish

- spacing
- wrapping
- density
- visual priority

### Copy / locale

- label mismatch
- translation gap
- awkward wording

### Documented limitation

- known limitation confirmed during QA
- no code change required unless product direction changes

---

## 7. Common Tags

Use one or more tags per issue.

- `booking-aware`
- `generic`
- `planner-focus`
- `safe-detail`
- `saved-recent`
- `mobile-density`
- `cta-wrapping`
- `locale-ko`
- `locale-en`
- `support`
- `phrases`
- `help-flow`
- `medical`
- `police`
- `lost`
- `settings`
- `saved`
- `bookings`
- `community`
- `viewport-360`
- `viewport-390`
- `viewport-430`
- `documented-limitation`

---

## 8. Pass / Fail Session Summary Template

Use this at the end of a QA run.

```md
## Session Summary

- Scope covered:
- Main flows passed:
- Main flows failed:
- Blockers found:
- High-priority fixes:
- Minor polish items:
- Confirmed documented limitations:
- Untested areas:
- Recommended next session focus:
```

---

## 9. AI QA Result Logging Tips

Use these rules when copying AI-generated QA findings into the template.

### Human verification required

- any route mismatch
- any safe/unsafe detail conclusion
- planner focus mismatch
- booking-aware context loss
- CTA visibility logic

### False positive risk is high for

- purely visual density judgments without screenshot evidence
- locale/copy issues when the agent did not switch locale explicitly
- “wrong item highlighted” claims without checking route params and visible title
- unsupported `/explore/[id]` claims without verifying the actual id value used

### Strong evidence types

- screenshot of the first screen
- exact route visited
- query string shown in URL
- console error or network error
- before/after viewport comparison

---

## 10. Example Entries

### Example A. Mobile CTA wrapping issue

```md
## Issue: QA-001

- ID: QA-001
- Route / Flow: /help/medical
- Scenario: Generic mobile first-screen CTA layout
- Preconditions: No booking query params, locale ko, viewport 360x800
- Steps to reproduce:
  1. Open /help/medical
  2. Observe top CTA row on first screen
- Expected: Call-first CTA is readable, secondary CTA wraps cleanly, no severe height imbalance
- Actual: Secondary CTA wraps into 3 lines and becomes visually taller than the call CTA
- Severity: Minor
- Type: UI polish
- Tags: help-flow, medical, cta-wrapping, mobile-density, locale-ko, viewport-360
- Booking-aware or Generic: Generic
- Viewport / Device: 360x800
- Screenshot / Evidence: Attach first-screen screenshot
- Console / Network notes: None
- Notes: Logic is correct, visual rhythm is off on small viewport only
- Suggested owner / next action: CSS polish pass on top CTA row
```

### Example B. Unsafe explore detail fallback issue

```md
## Issue: QA-002

- ID: QA-002
- Route / Flow: /my/saved recent normalization
- Scenario: Old recent place entry with unsupported /explore/[id]
- Preconditions: saved_hub_recent contains place href /explore/p1-1
- Steps to reproduce:
  1. Seed old recent localStorage data
  2. Open /my/saved?tab=recent
  3. Tap the unsafe place recent CTA
- Expected: Entry is normalized and user is routed to /explore
- Actual: Entry still attempts to open /explore/p1-1
- Severity: High
- Type: Bug
- Tags: saved-recent, safe-detail, booking-aware, viewport-390
- Booking-aware or Generic: Generic
- Viewport / Device: 390x844
- Screenshot / Evidence: Screenshot + route after tap
- Console / Network notes: None
- Notes: This would violate current safe-detail guard policy
- Suggested owner / next action: Check normalizeSavedHubRecentEntry consumer path
```

### Example C. Documented limitation

```md
## Issue: QA-003

- ID: QA-003
- Route / Flow: /my/bookings -> View in Plan
- Scenario: User expects dedicated booking detail page
- Preconditions: Booking exists in Upcoming tab
- Steps to reproduce:
  1. Open /my/bookings
  2. Tap View in Plan
- Expected: Planner opens focused booking state
- Actual: Planner opens focused booking state; no dedicated booking detail route exists
- Severity: Won't fix / Documented limitation
- Type: Documented limitation
- Tags: bookings, planner-focus, documented-limitation
- Booking-aware or Generic: Booking-aware
- Viewport / Device: 390x844
- Screenshot / Evidence: Optional
- Console / Network notes: None
- Notes: Current product policy is planner fallback, not dedicated booking detail
- Suggested owner / next action: None unless booking detail route becomes a real roadmap item
```

---

## 11. Blank Session Template

Copy this whole section to start a real QA report.

```md
# QA Report - mypage Branch

## QA Session Meta

- Date:
- Tester:
- QA Mode:
- Environment:
- Branch:
- Commit:
- Locale:
- Viewport / Device:
- Booking Context:
- Seeded localStorage:
- Runbook sections covered:
- Notes:

## QA Summary

| Metric | Count / Notes |
| --- | --- |
| Total issues |  |
| Blockers |  |
| High |  |
| Medium |  |
| Minor |  |
| Documented limitations |  |
| Passed flows |  |
| Untested flows |  |

## Session Summary

- Scope covered:
- Main flows passed:
- Main flows failed:
- Blockers found:
- High-priority fixes:
- Minor polish items:
- Confirmed documented limitations:
- Untested areas:
- Recommended next session focus:

## Issue: QA-001

- ID:
- Route / Flow:
- Scenario:
- Preconditions:
- Steps to reproduce:
  1.
  2.
  3.
- Expected:
- Actual:
- Severity:
- Type:
- Tags:
- Booking-aware or Generic:
- Viewport / Device:
- Screenshot / Evidence:
- Console / Network notes:
- Notes:
- Suggested owner / next action:
```
