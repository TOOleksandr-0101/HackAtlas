# HackAtlas API contract

All routes use same-origin `/api` URLs and return JSON with `Cache-Control: no-store`. `shared/schemas.ts` defines the runtime shapes. `shared/types.ts` exports their TypeScript types.

| Method | Path | Success |
| --- | --- | --- |
| GET | `/api/health` | `200` with `{ "status": "ok" }`. Confirms the HTTP handler is available. |
| GET | `/api/challenges` | `200` with `Challenge[]`. |
| GET | `/api/challenges/:id` | `200` with a single `Challenge`. |
| POST | `/api/evaluate` | `200` with `EvaluationResult`. |

`Challenge` includes the slug `id`, `title`, `category`, `difficulty` (`beginner`, `intermediate`, `advanced`), `estimatedMinutes`, `scenario`, `businessContext`, `targetUser`, and arrays `constraints`, `expectedDeliverables`, `learningObjectives`, and optional `hints`. `rubric` maps each criterion key to `description` and four string anchors named `weak`, `average`, `good`, and `excellent`.

## Evaluate a submission

Send `Content-Type: application/json`.

```json
{
  "challengeId": "household-food-waste",
  "answers": {
    "problem": "People forget which produce should be used first.",
    "targetUser": "People who buy groceries weekly for a household of two or more.",
    "proposedSolution": "A lightweight list highlights produce to use in the next two days.",
    "mvpFeatures": "Quick item entry, a use-soon list, and one opt-in reminder.",
    "validationStrategy": "Track discarded items for a week, then repeat with the prototype."
  }
}
```

All five answers are required and trimmed. Each accepts 1–2,000 characters after trimming. The request body has a 64 KiB limit. The server uses the challenge ID to load the rubric. On success each criterion score is an integer from 0 through 20 and the server sums the scores to get `totalScore` out of 100.

This example illustrates the response shape.

```json
{
  "totalScore": 65,
  "criteria": {
    "problemUnderstanding": {"score": 13, "explanation": "Identifies a concrete cause of produce waste.", "evidence": ["forget which produce should be used first"], "suggestions": ["Identify when produce stops being visible."]},
    "targetAudience": {"score": 12, "explanation": "Names who shops and how often.", "evidence": ["buy groceries weekly"], "suggestions": ["Choose households that report weekly waste."]},
    "solutionQuality": {"score": 13, "explanation": "Makes the next action easy to find.", "evidence": ["use in the next two days"], "suggestions": ["Explain how dates are set."]},
    "mvpFeasibility": {"score": 15, "explanation": "Scopes three features around one loop.", "evidence": ["one opt-in reminder"], "suggestions": ["Explain what users can enter in ten seconds."]},
    "validationStrategy": {"score": 12, "explanation": "Includes a baseline and a behavioral metric.", "evidence": ["Track discarded items"], "suggestions": ["Set a success threshold before the test."]}
  },
  "strengths": ["Clear waste mechanism.", "Focused feature list.", "Behavioral metric."],
  "weaknesses": ["Recruitment criteria are broad.", "Date entry is unspecified.", "The test has no success threshold."],
  "nextSteps": ["Narrow recruitment to frequent produce waste.", "Prototype the date entry flow.", "Define a measurable threshold for the trial."],
  "summary": "The scoped workflow is testable. Clarify recruitment and what result would merit continued development."
}
```

Each criterion has zero to three evidence entries and one to three suggestions. Each overview array has three entries. Scores are estimates for learning.

## Errors

The envelope is `{"error":{"code":"INVALID_INPUT","message":"Check your answers and try again.","fieldErrors":{"answers.problem":"Enter an answer."}}}`. `fieldErrors` is optional and uses dotted paths.

| HTTP | `error.code` | Cause |
| --- | --- | --- |
| 400 | `INVALID_INPUT` | Body or parameters fail validation. |
| 404 | `CHALLENGE_NOT_FOUND` | Challenge ID is unknown. |
| 404 | `NOT_FOUND` | API path is unknown. |
| 405 | `METHOD_NOT_ALLOWED` | HTTP method is unsupported. `Allow` lists the accepted method. |
| 413 | `PAYLOAD_TOO_LARGE` | Body exceeds the request limit. |
| 429 | `RATE_LIMITED` | Local limit or provider limit reached. Read `Retry-After` when present. |
| 500 | `INTERNAL_ERROR` | Unexpected server failure. |
| 502 | `PROVIDER_FAILURE` | Provider request failed. |
| 502 | `INVALID_MODEL_OUTPUT` | Response was missing, invalid JSON, or failed schema validation. |
| 503 | `EVALUATION_NOT_CONFIGURED` | Required evaluation configuration is missing. |
| 504 | `PROVIDER_TIMEOUT` | Evaluation exceeded the provider timeout. |
