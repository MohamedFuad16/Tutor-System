# Result: Runtime Performance

Accepted findings:

- Custom Deepgram Speak control frames could be dropped under output
  backpressure instead of being bounded and retried.
- Legacy Deepgram Voice Agent forwarding did not consistently check websocket
  send capacity or cap pre-ready client frames.
- Admin learner tables read entire stores.
- Study PDF object URLs reused a cached URL even if the Blob changed.
- MisoTTS aborts were swallowed before the live-deadline telemetry branch.

Integrated fixes: bounded queues, send-capacity checks, 500-row Admin limits,
Blob-aware object URL cache invalidation, and AbortError rethrow for Miso
deadline reporting.
