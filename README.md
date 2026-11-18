# HackAtlas

HackAtlas helps career switchers practice product development. Choose an original business case, draft a solution, submit it for AI feedback, revise, and compare attempts. The core workflow runs without an account. Drafts and progress stay in the current browser.Submitted answers are sent to OpenRouter for evaluation.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
```

Copy `.env.example` to `.env.local` and configure `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`. Use `openai/gpt-4.1-mini` or another [OpenRouter model and provider that support strict structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs). Optionally set `APP_URL` for OpenRouter attribution. Keep these variables server-side and leave `.env.local` out of Git.

```sh
npm run dev
```

Open the URL printed by Vite. It serves the app and `/api` on the same origin. Health and challenge browsing work without provider configuration. Evaluation requires a configured OpenRouter key and model.

```sh
npm test          # non-network tests, including mocked provider responses
npm run build     # TypeScript checking and production client build
npm run preview   # production client preview with the local API middleware
```

## Deploy on Vercel

1. Import the repository, select the intended branch, and use the Vite preset. The project uses Node.js 24 and outputs the app to `dist`.
2. Add `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and optionally `APP_URL` in the Vercel environment settings. Configure both Preview and Production when testing in both environments.
3. Deploy. The `api/` files run as Vercel Node.js Functions. The SPA rewrite preserves direct navigation to nested pages and keeps `/api` routes separate.
4. Verify `/api/health`, `/api/challenges`, and a direct load of `/challenges/household-food-waste`. Submit an original solution and a revision. Check that the result has five scores, the comparison shows signed deltas, and the progress page retains both attempts after reload.

## Team handoff

- [API contract](docs/API_CONTRACT.md)
- [Frontend handoff](docs/FRONTEND_HANDOFF.md)
- [UI/UX handoff](docs/UI_UX_HANDOFF.md)
- [Architecture](docs/ARCHITECTURE.md)
