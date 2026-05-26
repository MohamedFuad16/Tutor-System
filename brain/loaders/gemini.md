# Gemini Brain Loader

Use semantic retrieval before source inspection:

```bash
npm run brain:retrieve-semantic -- "<task>"
```

Then load impact and invariants:

```bash
npm run brain:impact -- "<target>"
npm run brain:verify
```

Keep context small: prefer context packs, source snippets, and impact summaries.
