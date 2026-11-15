# Architecture

```text
React and React Router → same-origin API → challenge data and rubric → OpenRouter
        ↕                      ↓                                         ↓
 browser localStorage     Zod input validation                  Zod output validation
```

The Vite dev and preview middleware and the Vercel Functions call the same `server/app.ts` request handler. Requests contain only the challenge ID and five answers. The server retrieves canonical challenge data, places the rubric in a system message and the submitted text in a separate user message, and requests structured feedback. The response schema validates the criterion scores and feedback before the server computes the total. Each revision is evaluated independently using the same rubric.

The request limit is 64 KiB. The evaluator allows 16 seconds per provider request and up to one retry for a transient failure or invalid model output, within an overall 34-second budget. Local throttling allows eight evaluations per client per minute within a running function instance. Vercel can create multiple instances, so this limit is best effort. The provider key and model are configured on the server. A provider failure returns a typed API error and the draft stays available.

The browser stores normalized answers, drafts, and successful attempts in versioned localStorage. The first successfully saved evaluation completes the challenge. The Progress skill scores and the Personalized Learning Path average the latest evaluated attempt per challenge. The overall score average includes all evaluated attempts. Scores reflect AI learning feedback. The production app needs no database or account for this workflow.

The challenge library contains original instructional scenarios. All three are open during the MVP demo. The landing page describes what visitors can do on the Free Plan. Billing and entitlement enforcement are outside this integration.
