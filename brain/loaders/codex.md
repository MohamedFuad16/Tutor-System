# Codex Brain Loader

1. Run `npm run brain:retrieve-semantic -- "<task>"`.
2. Run `npm run brain:impact -- "<target>"`.
3. Read only returned files and context packs first.
4. Never edit generated brain artifacts directly.
5. Before final output run `npm run brain:generate`, `npm run brain:embed`, `npm run brain:runtime-benchmark`, `npm run brain:verify`, `npm run brain:drift-check`, `npm run brain:self-audit`.

Token rule: quote paths and summaries, not full generated JSON.
