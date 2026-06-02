# Packet RR: voice request correlation

## Lane

Admin observability and voice runtime correlation.

## Scope

- `server.ts`
- `src/components/ChatPanel.tsx`
- `tests/system-activity.test.mjs`
- `.workflow/brain-architecture-implementation-program/*`
- `graphify-out/*` through explicit Graphify regeneration

## Objective

Make client-side voice model/tool rows and server-side voice system activity
share one request id so Admin request timelines can group the whole voice
session instead of splitting the browser and server halves.

## Boundaries

- Keep the default live voice provider path unchanged.
- Do not add cloud/AWS synchronization.
- Do not manually edit generated Graphify artifacts.
