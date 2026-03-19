# Place Recent Provenance Minimal Contract Audit

## Purpose

This note evaluates whether `SavedHubRecentEntry` needs extra provenance fields
for `place` entries, and if so, what the smallest future-safe contract should
look like.

This is an audit only.

- no runtime behavior changes
- no `saved_hub_recent` schema migration in this pass
- no safe-detail policy changes

## Files Reviewed

- `src/lib/savedHub.ts`
- `src/app/explore/page.tsx`
- `src/app/planner/page.tsx`
- `src/app/community/[id]/page.tsx`
- `src/app/my/saved/page.tsx`
- `src/lib/exploreDetail.ts`
- `docs/saved-recent-href-provenance-recompute-audit.md`
- `docs/external-provenance-introduction-criteria.md`

## Current State

`SavedHubRecentEntry` currently stores:

- `id`
- `type`
- `title`
- `href`
- `viewedAt`
- `subtitle?`

Producer split:

- `place`
  - produced by Explore
  - stores safe `/explore/[id]` href only
- `plan`
  - produced by Planner
  - stores `/planner`
- `community`
  - produced by community detail
  - stores `/community/${id}`

Current mitigation already exists:

- `normalizeSavedHubRecentHref()`
- `normalizeSavedHubRecentEntry()`

These helpers already re-check `place` detail hrefs and downgrade unsafe ones
to `/explore`.

## Need Assessment

### What still works without extra provenance

For current behavior, place recent entries are still usable with:

- `id`
- stored `href`
- safe helper revalidation at read time

That is enough to support:

- safe detail reopening for known catalog ids
- `/explore` fallback for stale or unsafe place hrefs

### What extra provenance would solve later

Extra place provenance would become useful when:

- external nearby items must be distinguished from catalog place items
- old `href` values should be trusted less than stored source metadata
- new consumers besides `/my/saved` need a consistent recompute rule
- place recent entries need provider-aware migration logic

### Cost of adding fields now

Adding fields now would introduce cost before a strong consumer exists:

- more complex recent entry model
- old localStorage compatibility surface grows
- place-only meaning leaks into a shared entry type
- producers would need to populate metadata that current consumers do not yet
  require

## Conclusion

Recommended conclusion: **B. A minimal place-only provenance field set would be
useful for future migration, but it should not be added yet.**

Why:

- current helper-based normalization is sufficient for present behavior
- the future migration path is clearer if a minimal contract is written down now
- there is still no stable nearby-to-catalog mapping source

So the branch does not need an immediate schema change, but it does benefit from
having a documented smallest-next-step contract.

## Minimal Contract Draft

If place recent provenance is added later, prefer a **place-only nested
contract** instead of adding flat provenance fields to every recent entry.

Suggested shape:

```ts
type SavedHubRecentEntry =
  | {
      id: string;
      type: "place";
      title: string;
      href: string;
      viewedAt: string;
      subtitle?: string;
      placeSource?: {
        sourceType: "catalog" | "external";
        sourceCatalogId?: string | null;
        sourceProvider?: "nearby" | "google_places";
        sourceExternalId?: string;
      };
    }
  | {
      id: string;
      type: "plan";
      title: string;
      href: string;
      viewedAt: string;
      subtitle?: string;
    }
  | {
      id: string;
      type: "community";
      title: string;
      href: string;
      viewedAt: string;
      subtitle?: string;
    };
```

## Why This Contract Is Minimal

- `sourceType`
  - required to separate catalog from external place items
- `sourceCatalogId`
  - optional because only some place entries can safely map to catalog detail
- `sourceProvider`
  - only needed for external items
- `sourceExternalId`
  - only needed for external items

Not recommended right now:

- `safeDetailEligible`
  - this is better derived from helper logic than stored as stale state
- flat provenance fields on every recent entry
  - plan/community do not need them

## Entry-Type Policy

### Place

Place is the only recent type that may need provenance metadata later.

Reason:

- detail safety can change
- external/catalog distinction matters
- fallback behavior depends on source quality

### Plan

Plan does not need provenance metadata right now.

Reason:

- current href is always `/planner`
- route is generic and stable
- no detail safety decision depends on plan source

### Community

Community does not need provenance metadata right now.

Reason:

- route is deterministically derived from id
- no safe-detail ambiguity exists
- no external/catalog distinction is relevant here

## Migration Outline

If this is introduced later:

1. Keep `placeSource` optional for backward compatibility.
2. Populate it only in `type: "place"` producers.
3. Leave old entries valid and continue using:
   - stored `href`
   - `normalizeSavedHubRecentEntry()`
4. Gradually prefer `placeSource` over raw href only when enough metadata
   exists.

Producer implications:

- Explore would be the first writer to populate `placeSource`.
- Planner/community producers do not need changes.

Consumer implications:

- `normalizeSavedHubRecentEntry()` would remain the main read-time policy entry
  point.
- `/my/saved` should continue consuming normalized entries instead of owning the
  policy directly.

## Final Position

Right now:

- do not expand `SavedHubRecentEntry` yet
- keep helper-based place normalization
- document the smallest credible place-only provenance contract

Revisit this only when a real producer or consumer needs provider-aware place
recompute beyond current safe helper logic.
