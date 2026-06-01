# Packet S: Correction propagation and traceability

## Objective

Close the local beta trust loop opened by correction requests and diagnostics:
apply non-destructive correction overlays to affected local learner-brain rows,
show request timelines in Admin, carry the existing PDF chip UI fixes forward,
and update the in-app architecture/design books.

## Context

Graphify routed this slice through:

- `src/memory/correction.events.ts`
- `src/memory/beta.diagnostics.ts`
- `src/views/AdminView.tsx`
- `src/lib/userBrainArchitectureBook.ts`
- `src/lib/tutorBook.json`
- `src/views/RevisionView.tsx`
- `src/views/StudyView.tsx`
- `src/components/PdfViewer.tsx`

## Ownership

Main agent owns integration. Sidecars are read-only unless explicitly assigned a
final verification pass.

## Do

- Add non-destructive propagation helpers for correction events.
- Mark affected rows with correction metadata instead of deleting rows.
- Reflect correction overlays in Beta Diagnostics exports.
- Add Admin request timelines grouped by request id.
- Include existing Study/Pdf PDF-chip UI fixes in the pushed phase.
- Update the System Architecture, User Brain Architecture, and App Design books.
- Regenerate Graphify because the phase explicitly changes code architecture
  artifacts and the user asked to keep the code architecture graph current.

## Do Not

- Do not implement AWS/cloud persistence.
- Do not hard-delete learner data.
- Do not claim embeddings or graph facts are fully rebuilt from corrections yet.
- Do not stage unrelated old workflow directories.

## Verification

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run format:check`
- Browser QA for Admin Activity, Corrections, Beta Diagnostics, Study PDF chip
  rail, and App Design/User Brain books.
- Graphify regeneration and smoke query.
