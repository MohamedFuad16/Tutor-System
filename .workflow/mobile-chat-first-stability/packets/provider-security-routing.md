# Packet: provider-security-routing

## Objective

Audit how OpenRouter and Deepgram keys flow through the server and browser, then
propose the safest server-side environment fallback contract.

## Ownership

- Read-only source audit.
- `.workflow/mobile-chat-first-stability/results/provider-security-routing.md`

## Do

- Inspect only Graphify-connected provider routing files.
- Identify browser key leakage, server fallback behavior, websocket constraints,
  and test gaps.
- Do not read `.env` values.

## Do Not

- Do not edit application source.
- Do not send provider traffic or expose secrets.
