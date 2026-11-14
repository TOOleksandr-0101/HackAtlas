# Frontend Integration Guide

This guide explains how to run HackAtlas locally and connect its user interface to the existing learning and evaluation features.

## Local development

Use Node.js 24.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `.env.local`.
4. Start the application with `npm run dev`.

The development server serves the frontend and same-origin `/api` endpoints. See [API_CONTRACT.md](./API_CONTRACT.md) for HTTP request and response formats.

Keep the OpenRouter API key server-side. Never expose it through a `VITE_` environment variable or commit it to Git.

## Code organization

The presentation layer can be redesigned or replaced in these directories:

- `src/app/` — application shell and routes.
- `src/pages/` — page views.
- `src/components/` — reusable UI elements.
- `src/styles/` — visual styling.

Preserve compatibility with the existing functional modules:

- `shared/` — shared types, schemas, and field definitions.
- `src/hooks/` — API, evaluation, drafts, attempts, and progress hooks.
- `src/features/` — learning state and progress calculations.
- `src/lib/` — typed API client.
- `server/` — server-side request handling and AI evaluation.
- `data/` — challenge definitions and rubrics.
- `api/` — production API entry points.

Keep business logic out of presentation components. Coordinate any changes to shared interfaces with their consumers.

## Integration points

### Challenge discovery

`useChallenges()` loads the challenge library; `useChallenge(id)` loads a single challenge.

Both expose `{ data, error, isLoading, retry }`. Display loading and error states and offer retry where appropriate.

### Drafts

`useDraft(challengeId)` exposes `draft`, `updateDraft`, and `storageError`.

Initialize solution forms from the saved draft, the latest accepted attempt, or `emptyAnswers`, in that order. Persist edits with `updateDraft`.

### Validation

Use `solutionAnswersSchema.safeParse(answers)` before submitting. Shared `answerKeys`, `answerLabels`, and `MAX_ANSWER_LENGTH` keep form fields consistent with server validation.

### AI evaluation

Call `useEvaluation().evaluate(challengeId, answers)` to request a validated `EvaluationResult`.

Show a pending state while evaluation runs. On failure, display the API error and preserve the user's answers. Never replace a failed live request with fabricated scores.

### Attempts and comparisons

After a successful evaluation, save the result:

```ts
const evaluation = await evaluate(challengeId, answers);
await saveAttempt(challengeId, answers, evaluation);
```

`useAttempts(challengeId)` exposes `attempts`, `latest`, `previous`, `comparison`, `saveAttempt`, and `storageError`.

Display score differences directly from the comparison. A new attempt may score higher, lower, or the same.

### Progress

`useProgress()` exposes `progress` and `storageError`.

A challenge counts as completed after the first successfully evaluated and saved attempt. Show actual stored metrics, not sample results.

## Browser persistence

Drafts and attempts are saved anonymously in versioned browser `localStorage`. Revisions begin from the previously submitted answers.

If storage becomes unavailable, show the provided warning so users know changes may not persist after a refresh.

## Verification checklist

Before merging interface changes, verify:

1. Challenge list and detail pages load.
2. Solutions can be entered, validated, and submitted.
3. Evaluation displays real API responses.
4. API failures preserve user input.
5. Users can revise and resubmit solutions.
6. Comparisons display accurate signed score differences.
7. Progress and attempt history survive a page refresh.
8. Navigation and forms work on desktop and mobile.
9. `npm run build` succeeds.

This guide describes the integration contract; it does not claim that a live provider call or production deployment has already been verified.
