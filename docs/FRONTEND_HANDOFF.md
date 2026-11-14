# Frontend handoff

## Run locally

Use Node 24. Run `npm install`, copy `.env.example` to `.env.local`, set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`, then run `npm run dev`. The dev server serves both the app and API. See `API_CONTRACT.md` for HTTP behavior. Never prefix the private key with `VITE_`.

## Ownership

`src/app/`, `src/pages/`, `src/components/` and `src/styles/` hold the fallback interface. Medina can replace these presentation components. Retain the shared types and schemas and the data flow exposed by `src/hooks/`, `src/features/`, and `src/lib/`. The evaluation handler, challenge content, and Vercel adapters live under `server/`, `data/`, and `api/`.

## Integration

- `useChallenges()` and `useChallenge(id)` load the library and challenge detail. Each exposes `{ data, error, isLoading, retry }`.
- `useDraft(challengeId)` exposes `draft`, `updateDraft`, and `storageError`. Initialize forms from the draft, the latest accepted attempt, or `emptyAnswers` in that order.
- Use `solutionAnswersSchema.safeParse(answers)` for field validation. `answerKeys`, `answerLabels`, and `MAX_ANSWER_LENGTH` are available for the form.
- Call `useEvaluation().evaluate(challengeId, answers)` when submitting. It returns a validated `EvaluationResult`. Keep the form available following a failure and show the API error.
- After successful evaluation, await `useAttempts(challengeId).saveAttempt(challengeId, answers, evaluation)`. The hook also exposes `attempts`, `latest`, `previous`, `comparison`, and `storageError`. Show scores signed as returned by the comparison, including negative and zero deltas.
- `useProgress()` returns `progress` and `storageError`. A challenge is complete after its first successfully evaluated and saved attempt.

Attempts and drafts are anonymous and versioned in this browser's localStorage. After a successful save, the next attempt starts from the prior answers. Present a storage error if the browser denies a write, so users know the attempt might disappear after reload.
