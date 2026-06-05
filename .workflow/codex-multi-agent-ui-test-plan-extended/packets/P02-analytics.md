# P02 Analytics Lead

Objective:
Audit and expand tests around Analytics progress views, usage signals, plan/provider indicators, and settings-driven display state.

Graphify files:
- `src/views/AnalyticsView.tsx`
- `src/store/index.ts`
- `src/components/SettingsModal.tsx`
- `src/lib/accessPlans.ts`
- `src/lib/brainRuntimeSettings.ts`

Ownership:
- Proposed or direct test changes under `tests/analytics-*.test.mjs` and `tests/runtime-settings.test.mjs`.

Do:
- Verify Zustand usage and persisted settings contracts.
- Cover usage and provider signal assumptions without live provider calls.

Do not:
- Add browser-only dependencies without approval.
- Edit unrelated page tests.

Expected output:
- Coverage notes and changed test files, or blocked dependency rationale.

Verification:
- Focused new tests, then `npm test`.
