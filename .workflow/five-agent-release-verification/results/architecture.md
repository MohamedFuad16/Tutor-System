# Result: Architecture And Voice

Accepted finding: executable background model ids still used the bare
`gpt-5.5` slug in browser auth payloads, test fixtures, and example config.

Integrated fix: server default, ChatPanel auth payload, `.env.example`, and
system tests now use `openai/gpt-5.5` for OpenRouter. Human-readable
documentation still refers to the GPT-5.5 background layer as product prose.
