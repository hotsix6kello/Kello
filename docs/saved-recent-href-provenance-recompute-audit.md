# Saved/Recent Href Provenance-Recompute Audit

## Scope

This note checks whether saved/recent entries should keep storing raw `href`
values, or whether some entry types should move toward provenance-based link
recomputation.

This is an audit only.

- no runtime behavior changes
- no safe-detail rule changes
- no saved/recent schema migration in this pass

## Files Reviewed

- `src/lib/savedHub.ts`
- `src/app/my/saved/page.tsx`
- `src/app/explore/page.tsx`
- `src/app/planner/page.tsx`
- `src/app/community/[id]/page.tsx`
- `src/lib/exploreDetail.ts`
- `src/lib/contexts/TripContext.tsx`

## Current Storage Model

### Saved places

Saved places do **not** store hrefs.

`saved_items` stores raw ids only:

- source: Explore save toggle
- storage: `localStorage["saved_items"]`
- consumer: `/my/saved`

`/my/saved` already recomputes the place link at render time:

- safe detail id -> `/explore/[id]`
- unsafe/unknown id -> `/explore`

So saved places are already on the "store data, compute link later" side.

### Recent entries

Recent entries do store raw `href`.

`SavedHubRecentEntry` currently stores:

- `id`
- `type`
- `title`
- `href`
- `viewedAt`
- `subtitle?`

Storage location:

- `localStorage["saved_hub_recent"]`

## Current Raw Href Producers

### Place recent

Producer:

- `src/app/explore/page.tsx`

Stored shape:

- `id: selectedItem.id`
- `type: "place"`
- `href: detailHref`

Important detail:

- `detailHref` is already guarded by `getSafeExploreDetailHref(...)`
- unsafe nearby/runtime items do not get a detail href written into recent

### Plan recent

Producer:

- `src/app/planner/page.tsx`

Stored shape:

- `id: "current-plan"`
- `type: "plan"`
- `href: "/planner"`

This href is generic and stable.

### Community recent

Producer:

- `src/app/community/[id]/page.tsx`

Stored shape:

- `id: String(post.id)`
- `type: "community"`
- `href: /community/${post.id}`

This href is deterministic from the entry id.

## Current Consumers

Primary consumer:

- `src/app/my/saved/page.tsx`

Current normalization already exists for place recents:

- if `type !== "place"`, keep stored href
- if `type === "place"` and href starts with `/explore/`, re-check the raw id
  through `getSafeExploreDetailHref(...)`
- if unsafe, downgrade to `/explore`

So recent place entries already have a partial provenance-aware correction layer
at read time.

## Recompute Feasibility by Entry Type

### Place

Feasibility: **partial and useful**

What can be recomputed today:

- safe explore detail href from known supported id
- fallback to `/explore`

What cannot be recomputed safely today:

- external nearby item detail
- direct catalog mapping for external ids
- richer place routing without more provenance metadata

Conclusion:

- place entries are the strongest candidate for provenance-based recompute
- in fact, `/my/saved` already does a limited version of this

### Plan

Feasibility: **not necessary**

Current stored href is `/planner`, which is:

- stable
- generic
- not provenance-sensitive

There is no strong reason to replace this with recomputation right now.

### Community

Feasibility: **possible but low value**

Community href can be recomputed from:

- `type === "community"`
- `id`

But current raw href is already deterministic and stable enough.

There is little practical benefit in moving community entries to provenance
recompute now.

## Risk Assessment

### Risk of continuing raw href storage

Main risks:

- stale explore place href when safe-detail rules evolve
- old localStorage entries may contain now-unsafe `/explore/[id]` values
- mixed provenance can make place links less trustworthy than plan/community
  links

Current mitigation already exists:

- `/my/saved` normalizes recent place hrefs before rendering

### Risk of moving fully to recompute too early

Main risks:

- not enough provenance metadata on all recent entry types
- migration burden for old localStorage payloads
- recompute rules would be inconsistent across place/plan/community
- external-source place entries still cannot be resolved beyond generic
  fallback

## Recommendation

Recommended conclusion: **B. Move only place entries toward provenance-based
recompute, keep plan/community on raw href for now.**

Why this is the most realistic option:

- saved places already follow this pattern
- recent place entries already have a normalization layer
- plan and community hrefs are stable and not currently problematic
- a full cross-type provenance redesign would be overkill for current needs

## Migration Outline

If this evolves further, the safest sequence is:

1. Keep current storage backward-compatible.
2. Treat `place` entries as the only provenance-sensitive type.
3. When enough metadata exists, reduce trust in stored place `href` and prefer:
   - `id`
   - `type`
   - future provenance fields
4. Continue accepting old entries with stored `href`, but normalize on read.

Minimum extra data needed before stronger recompute:

- trusted source kind for place entries
- optional provider identity for external items
- optional catalog mapping when one truly exists

## Final Position

Right now:

- `saved_items` structure is already fine
- `saved_hub_recent` does not need a full rewrite
- only `place` recent entries are good candidates for provenance-based link
  recompute
- `plan` and `community` should continue using raw href for now
