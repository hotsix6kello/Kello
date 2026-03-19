# Locale Naming Strategy

## Purpose

This document defines the canonical locale naming strategy for the 9-language mypage rollout while preserving compatibility with legacy locale codes already used in the repo.

## Canonical Locale Codes

The canonical locale codes for the mypage rollout are:

- `ko`
- `en`
- `ja`
- `zh-CN`
- `zh-HK`
- `vi`
- `th`
- `id`
- `ms`

The repo also keeps existing non-mypage locales supported as-is:

- `es`
- `fr`
- `de`
- `ar`
- `pt`
- `ru`

## Legacy Alias Mapping

Legacy values are still accepted and resolved to canonical codes:

- `jp` -> `ja`
- `cn` -> `zh-CN`
- `tw` -> `zh-HK`
- `hk` -> `zh-HK`
- `zh-TW` -> `zh-HK`

## Storage And Runtime Rule

- `ktrip_lang` should now store canonical locale codes
- `i18n.changeLanguage()` should resolve any alias to canonical before applying
- browser language detection should also resolve into canonical codes

This means old stored values such as `jp`, `cn`, and `tw` remain compatible, but new writes should prefer `ja`, `zh-CN`, and `zh-HK`.

## Resource Folder Rule

Resource folders are not renamed in this step.

Current resource folder mapping stays:

- `ja` -> `public/locales/jp/common.json`
- `zh-CN` -> `public/locales/cn/common.json`
- `zh-HK` -> `public/locales/tw/common.json`

All other supported locales map directly to same-name folders.

This keeps the current repo structure stable while letting product code use canonical locale codes.

## External Provider Mapping

Some external providers may need a provider-specific language code.

Current example:

- Google Maps uses `zh-TW` for canonical `zh-HK`

This mapping should stay provider-specific and should not change the canonical locale stored in app state.

## Current Scope

Implemented in product:

- canonical locale resolution helper
- legacy alias compatibility for `jp/cn/tw/hk`
- canonical storage in `ktrip_lang`
- canonical `i18n.language` values
- resource lookup mapped back to existing legacy folder names

Not done in this step:

- no locale folder rename
- no 9-language content completion
- no wider refactor of legacy non-i18n translation data such as mock object field names

## Practical Rule For Future Work

When adding new UI or locale-sensitive logic:

1. use canonical locale codes in product logic
2. use alias resolution only at boundaries
3. use resource/provider mapping only where a legacy folder name or third-party API requires it
