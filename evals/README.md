# MediaGPT Agent Evals

Run the golden regression suite against a running local DOOH app:

```bash
npm run eval:agent
```

By default the suite targets `http://127.0.0.1:5191`. Override it with:

```bash
EVAL_BASE_URL=http://127.0.0.1:5191 npm run eval:agent
```

Add cases in `promptfoo.config.yaml`. Each case should use real-shaped platform language and assert one of:

- Known IDs or numbers from fixture state.
- Tool trace behavior, such as `queryAssets` or `getFinancials`.
- Safety behavior, especially no write proposal for prompt-injection text.
- Role boundaries, especially bidder profiles not proposing internal ADMO writes.

Keep write cases gated. The suite should verify that write requests create approval proposals only, not direct mutations.
