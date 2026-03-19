Git Guide
Purpose

Keep all code work manageable in a 6-person team.
Define branch ownership and merge rules by feature.
Prevent merge conflicts through clear ownership and process.
Make Antigravity Agent outputs deterministic and reviewable.
Scope

This guide applies to k-trip and any similar team web-app projects.
Branching, PR, and merge rules are mandatory for all members and agents.
0) GitHub Workflow Overview
Use this branch model:

main: production-ready branch, always deployable.
develop: integration branch for the current cycle.
feature/<area>/<ticket>-<short>: feature work by area.
release/<version>: stabilization branch for release.
hotfix/<issue-id>-<short>: urgent production fixes.
chore/<area>/<ticket>-<short>: non-feature infra tasks (lint, deps, CI, docs tooling).
1) Functional Branching (Mandatory)
1.1 Area-based branch ownership
Each feature area should be owned by one responsible person to reduce overlap:

map : location/search/navi
reserve : reservation flow and status machine
schedule : schedule, timezone, booking timeline
community : reviews/posts/tags
payment : payments, webhook handling, refunds
notify : email/SMS/push notifications
infra : CI/CD, secrets, deployment
auth : login, roles, permissions
1.2 Naming rules
Use a strict naming format:

<type>/<area>/<issue-id>-<short-korean-romanized-or-english-kebab>

Examples:

feature/map/search-result-reorder-214
feature/reserve/dup-guard-219
fix/notify/email-fallback-310
chore/infra/github-actions-cache-221
Rules:

Lowercase only
kebab-case only
Max 3 path segments total
Use ticket number first or last consistently for traceability
No spaces, no special chars
1.3 Issue-to-branch workflow
Open/receive GitHub issue.
Create branch from develop only.
Prefix by area and link to one issue.
Branch title must include ticket number.
2) Commit Message Convention
Use Conventional Commits (example):

feat(reserve): add duplicate booking guard
fix(map): handle Kakao API timeout with fallback
refactor(community): split review card component
chore(ci): add branch protection check
test(reserve): add webhook replay test
3) PR Rules (No exception)
Each PR should include:

Summary
What changed
Why changed
Files changed
Linked issue (must include issue/branch mapping)
Tests
Unit/integration/end-to-end that ran and passed
Risk notes
Feature risk and rollback plan
Screenshots or API sample for UI/API behavior changes
Merge conditions:

At least one reviewer approval.
All tests pass in CI.
No unresolved TODO comments introduced.
No direct push to main.
4) Merge conflict prevention (required)
4.1 Domain isolation
One PR should cover one feature domain.
Do not touch shared files outside your area unless explicitly coordinated.
If two areas share same files (e.g., auth middleware, DB schema), sync with owners first.
4.2 File ownership
Create these ownership guidelines and keep it in repo root:

/frontend/src/pages/map -> @map
/frontend/src/components/map -> @map
/backend/src/reserve -> @reserve
/backend/src/notify -> @notify
/backend/src/payment -> @payment
(Adjust to actual paths.)

4.3 Branch synchronization
Before coding: git pull origin develop and git rebase develop before each PR.
Before review request: rebase one final time to include latest develop.
Keep PR lifespan under 1-2 days when possible.
4.4 Code formatting lock
Always run format/lint before commit.
Do not mix formatter/indentation changes with logic changes.
Prefer small PRs over large rewrites.
4.5 API and schema changes
If API response shape changes, coordinate with:
frontend owner
QA owner
one reviewer from backend and one from frontend
Update schema docs in same PR.
5) Merge Conflict Handling Procedure
When conflict happens:

Pause merge and assign resolver owner.
Re-open latest develop.
git fetch --all
git rebase origin/develop (prefer rebase over merge for feature branches).
Resolve each conflict file manually.
Resolve by business rule and current ownership:
Keep feature-specific logic in feature branch owner.
Keep shared logic in domain owner branch only.
Add test covering conflict area.
Re-run CI checks before pushing.
Document conflict case in PR thread.
6) Protection and access rules
main and develop require status checks.
Enforce:
at least one code review
passing CI
no conflicts
main allows merge only from release/*.
Auto-delete feature branches on merge.
7) Antigravity Agent execution policy
7.1 For agents: mandatory startup checklist
Read this git_guide.md before code changes.
Confirm issue scope from assigned ticket.
Create branch with naming rule.
Inspect last 5 commits from area owner branch before editing.
Make minimal, domain-focused changes.
Run tests locally.
Open PR using template.
7.2 Safe Agent task template
When generating code changes, include:

Scope (files + area)
Expected behavior (happy path + failure path)
Test plan with pass/fail criteria
Conflict risk (same files as others? yes/no)
Rollback note
7.3 Example Agent prompt
Implement duplicate reservation prevention for k-trip. Use branch feature/reserve/dup-guard-219. Update: backend booking API, unit tests for race condition, and OpenAPI schema only in /backend/src/reserve. Add tests for retry case and add one QA note in PR description.

8) Daily operating rhythm (6 members)
Daily 5-minute sync:
done / in progress / blocked
Every code change references one issue.
Any file touched by 2+ members is moved to temporary freeze and edited by one owner.
9) Release discipline
release branch should only include:
bug fixes from develop
migration if needed
docs for deployment checklist
Hotfix path:
create hotfix/<id>-short from main
patch + test + release alignment + emergency deploy
10) Do-nots
Do not create branches directly from main.
Do not merge unrelated features into one PR.
Do not leave merge conflict unresolved for >1 day.
Do not change docs and tests only by agent if implementation is missing.