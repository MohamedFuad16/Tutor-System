# OpenHands Brain Loader

Use `/brain` as the context orchestrator:

- retrieval: `npm run brain:retrieve-semantic -- "<task>"`
- impact: `npm run brain:impact -- "<target>"`
- enforcement: `npm run brain:verify && npm run brain:drift-check`

For autonomous execution use `npm run brain:execute -- --task "<task>" --mode plan` first.
