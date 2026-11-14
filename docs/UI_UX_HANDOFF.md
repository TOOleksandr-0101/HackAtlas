# HackAtlas UI/UX Handoff

This document describes the working frontend that a UI/UX pass may redesign. The current interface favors functional clarity over visual polish. Restyle the presentation freely, but preserve the API, validation, persistence, attempt, and progress contracts described below.

For request and response shapes, see [API_CONTRACT.md](./API_CONTRACT.md). For the system boundary, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Working pages

| Route | Page | Current behavior |
| --- | --- | --- |
| `/` | Landing | Introduces the learning flow, loads a real example challenge, handles loading/error/empty states, and links to the library and pricing. |
| `/challenges` | Challenge library | Loads the challenge catalog, filters it by difficulty, reports loading/errors, and links each card to its workspace. |
| `/challenges/:id` | Challenge workspace | Loads the brief, restores a draft or prior attempt, validates and submits five answers, displays real AI feedback, supports revisions, and compares attempts. A missing challenge has a dedicated not-found state. |
| `/progress` | Progress dashboard | Derives metrics, criterion averages, recent attempts, and consecutive revision history from saved attempts. It handles no-attempt and storage/catalog-error states. |
| `/pricing` | Pricing | Presents the available Free plan and a proposed Pro plan at `$12.99/month`. Pro is explicitly unavailable; there is no checkout or subscription action. |
| Any unmatched route | Page not found | Displays a recovery link to the challenge library. |

`AppErrorBoundary` wraps the routed page content and replaces a render failure with reload and safe alternate-route recovery actions. It does not replace the normal API error states rendered by individual pages.

## Component hierarchy

```text
src/main.tsx
└── BrowserRouter
    └── App
        ├── skip link
        ├── site header and primary navigation
        ├── AppErrorBoundary
        │   └── Routes
        │       ├── LandingPage
        │       │   └── LoadingNotice
        │       ├── ChallengeLibraryPage
        │       │   ├── LoadingNotice / ErrorNotice
        │       │   └── ChallengeCard × challenge
        │       ├── ChallengeWorkspacePage
        │       │   ├── LoadingNotice / ErrorNotice / challenge not-found state
        │       │   └── ChallengeWorkspace
        │       │       ├── ChallengeBrief
        │       │       └── SolutionForm or EvaluationFeedback
        │       │           └── AttemptComparison
        │       ├── ProgressPage
        │       │   ├── ErrorNotice
        │       │   └── AttemptComparison × revision
        │       ├── PricingPage
        │       └── global page-not-found state
        └── site footer
```

Supporting layers:

- `src/hooks/useApi.ts` owns challenge queries and evaluation request state.
- `src/hooks/useLearning.ts` adapts the external learning store for drafts, attempts, comparisons, and progress.
- `src/features/attempts/` owns versioned browser persistence and attempt creation.
- `src/features/progress/learningProgress.ts` owns score aggregation and comparison math.
- `src/lib/api.ts` is the validated same-origin API client.
- `shared/schemas.ts` and `shared/types.ts` are the frontend/backend source of truth for data shapes.

## Styling system

All application styling currently lives in `src/styles/app.css`. It imports Tailwind CSS, but the UI itself uses semantic class names and handwritten CSS rather than utility classes.

### Foundation

- Typeface: `"Instrument Sans", system-ui, sans-serif`. No external font file is currently loaded, so the system fallback is expected unless a future redesign adds the font asset.
- Page background: `#f8f9f6`.
- Default text: `#17251d`.
- Maximum content width: `1140px`, with responsive inline gutters through `.wrap`.
- Global focus indicator: `3px solid #3975ab` with a `3px` offset.
- Heading sizes use `clamp()`; cards and page spacing also use fluid values.

### CSS custom properties

| Token | Current value | Role |
| --- | --- | --- |
| `--muted` | `#53635a` | Secondary text |
| `--line` | `#d9e1db` | Borders and dividers |
| `--accent` | `#116445` | Primary actions and links |
| `--accent-hover` | `#0b5036` | Primary action hover state |
| `--surface` | `#fff` | Cards and raised surfaces |

Other colors are currently local declarations for the dark hero preview, difficulty badges, notices, score deltas, progress bars, and pricing emphasis. A redesign may promote these to tokens.

### Reusable visual patterns

- `.button`, `.button--primary`, and `.button--secondary` define shared actions.
- `.card` is the base surface for challenge cards, workspace panels, metrics, empty states, and pricing cards.
- `.notice` and `.notice--error` support loading, API, and storage states.
- `.difficulty--beginner`, `.difficulty--intermediate`, and `.difficulty--advanced` distinguish challenge levels.
- `.workspace-grid`, `.progress-grid`, `.challenge-grid`, `.metrics-grid`, and `.pricing-grid` own the main responsive layouts.
- `.disclosure` styles native `details`/`summary` controls used for rubrics, criterion feedback, saved answers, and history.
- `.score-table` and `.table-scroll` provide comparison tables with horizontal overflow on narrow screens.
- `.field-guidance` keeps each field hint and live character count together.
- `.pricing-card--featured` emphasizes the available Free plan; the proposed Pro action remains a disabled button.

## Files that are safe to restyle

The following files are presentation-oriented and may be changed without modifying backend scoring or persistence:

- `src/styles/app.css` — colors, typography, spacing, layout, breakpoints, and component appearance.
- `src/app/App.tsx` — shell markup, navigation presentation, footer, and global not-found presentation. Preserve route paths and the error-boundary wrapper.
- `src/components/AppErrorBoundary.tsx` — fallback presentation. Preserve a recovery path and avoid mutating stored learning data.
- `src/components/AttemptComparison.tsx`
- `src/components/ChallengeBrief.tsx`
- `src/components/ChallengeCard.tsx`
- `src/components/EvaluationFeedback.tsx`
- `src/components/SolutionForm.tsx`
- `src/components/Status.tsx`
- `src/pages/LandingPage.tsx`
- `src/pages/ChallengeLibraryPage.tsx`
- `src/pages/ChallengeWorkspacePage.tsx`
- `src/pages/PricingPage.tsx`
- `src/pages/ProgressPage.tsx`
- `index.html` — metadata and document-level presentation settings.

Changing JSX structure is safe when component props, accessible labels, form names, route destinations, state transitions, and the contracts below remain intact. Do not move scoring, storage, API calls, or progress calculations into visual components.

## Contracts to preserve

### Challenge and evaluation data

- Treat `shared/schemas.ts` and `shared/types.ts` as authoritative.
- The solution has exactly five keys: `problem`, `targetUser`, `proposedSolution`, `mvpFeatures`, and `validationStrategy`.
- Use the shared `answerKeys`, `answerLabels`, `emptyAnswers`, and `MAX_ANSWER_LENGTH`; each submitted answer is required, trimmed, and limited to 2,000 characters.
- Validate with `solutionAnswersSchema.safeParse()` before submission and keep field-level errors associated with their textareas.
- Never calculate or fabricate AI scores in the client. Render only a validated `EvaluationResult` returned by `/api/evaluate`.
- Preserve all five criterion scores out of 20, the total out of 100, explanations, evidence, suggestions, strengths, weaknesses, next steps, and summary.

### API hooks

- `useChallenges()` and `useChallenge(id)` return `{ data, error, isLoading, retry }`.
- `useEvaluation()` returns `{ evaluate, isEvaluating, error, resetError }`.
- Keep API calls same-origin through `src/lib/api.ts`: `GET /api/challenges`, `GET /api/challenges/:id`, and `POST /api/evaluate`.
- Preserve loading, retry, server field-error, rate-limit, provider, invalid-response, and network-error states. Failed evaluation must leave all answers available for correction or retry.
- OpenRouter credentials are server-only. Never introduce a `VITE_` provider key or call OpenRouter directly from browser code.

### Drafts, attempts, and progress

- `useDraft(challengeId)` returns `{ draft, updateDraft, storageError }`.
- Initialize the form from saved draft, then latest successful attempt, then `emptyAnswers`, in that order.
- Call `updateDraft` as answers change so unfinished work survives refresh when browser storage is available.
- `useAttempts(challengeId)` returns `{ attempts, latest, previous, comparison, saveAttempt, storageError }`.
- Save an attempt only after a real evaluation succeeds. Preserve the submitted answers together with that exact evaluation result.
- `useProgress()` returns `{ progress, storageError }`; render the derived values instead of sample activity.
- Attempt comparisons must use `compareAttempts` and show positive, negative, and zero deltas accurately.
- The storage key is the versioned `hackatlas.learning.v1`. Do not rename it or change its envelope without a migration.
- If `localStorage` is unavailable, the store keeps state for the current tab and exposes `storageError`. Keep that warning visible; do not promise refresh persistence in this state.

## Important interactions

### Challenge discovery

1. The landing preview loads a real beginner challenge when available.
2. Loading, failure with retry, and empty-catalog states appear inside the preview.
3. The library's difficulty buttons filter the loaded catalog without another request.
4. Challenge cards navigate to `/challenges/:id` with standard links.

### Solution and evaluation flow

1. The workspace loads the canonical challenge brief.
2. The form restores an unfinished draft or the latest submitted answers.
3. All five textareas are controlled. Each shows guidance, a character count, and the shared 2,000-character limit.
4. Every edit updates the draft and clears stale errors for that field/request.
5. Submission runs shared Zod validation, displays field errors, and focuses the first invalid field.
6. While evaluation is pending, the form is marked busy, fields and actions are disabled, and duplicate submissions are blocked.
7. API errors are shown without clearing the answers.
8. A successful evaluation is saved as a numbered attempt before feedback is shown.
9. Feedback focus moves to the AI evaluation heading after a successful save.
10. “Improve My Solution” reopens the form with the latest working answers. A new successful submission creates another attempt and compares it with the previous one.

### Feedback and progress

- Criterion details are native disclosures with score, explanation, optional evidence, and suggestions.
- Saved answer disclosures make each attempt inspectable.
- The workspace compares the latest two attempts for that challenge.
- The progress page shows aggregate metrics, criterion averages, up to 10 recent attempts, and every consecutive revision comparison available in stored history.
- If challenge titles cannot be refreshed, saved progress remains visible with a catalog warning.

### Pricing and recovery states

- Free is the only available plan.
- Pro is explanatory only. Keep its “not available” status, disabled action, and disclaimer unless subscriptions are actually implemented end to end.
- Unknown application routes and missing challenge IDs have separate recovery states.
- Render failures go through `AppErrorBoundary`; API failures stay in normal page state and should not trigger the boundary.

## Responsive and accessibility requirements

The current breakpoints are:

- Above `800px`: landing, workspace, and progress use multi-column layouts.
- At or below `800px`: the hero, workspace, and progress collapse to one column; challenge cards use two columns until the smaller breakpoint.
- At or below `530px`: challenge cards, steps, and pricing plans use one column; metrics retain two compact columns; page gutters and table cell padding shrink.

Any redesign must continue to:

- Work without horizontal page scrolling from at least 320px wide through desktop sizes.
- Keep comparison tables horizontally scrollable rather than compressing their content beyond readability.
- Allow the header and footer to wrap without obscuring navigation.
- Preserve readable long challenge and AI-generated text with wrapping and flexible grid children.
- Retain semantic links, buttons, headings, labels, fieldsets, progress elements, tables, and native disclosures.
- Keep the skip link, visible keyboard focus, `aria-live`/status/error announcements, field `aria-describedby` associations, and programmatic focus on validation and feedback transitions.
- Maintain distinguishable hover, focus, active, disabled, error, positive, negative, and unchanged states without relying on color alone where meaning would be lost.
- Test keyboard-only navigation and representative widths around 320px, 530px, 800px, and 1140px after layout changes.

## Known limitations

- There are no accounts, database, or cloud synchronization. Drafts and progress belong to the current browser profile.
- Browser storage may be unavailable or exceed quota. In that case changes last only for the current tab session.
- Live AI evaluation requires valid `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` server environment values and a model/provider combination that supports strict structured outputs.
- Automated tests use mocked provider responses; they do not prove that current OpenRouter credentials, provider availability, or a production deployment work.
- The MVP has three open challenges and no entitlement enforcement.
- Pro subscriptions, payments, accounts, entitlements, and cross-device storage are not implemented.
- The library difficulty filter is not encoded in the URL and resets on navigation or refresh.
- The workspace shows the latest-versus-previous comparison; the progress page holds the longer consecutive revision history.
- The application has no offline mode, service worker, telemetry, or remote error reporting. The error boundary logs render failures to the browser console.
- UI strings, number formatting, and date formatting currently target English/US presentation and are not localized.

## Run and test

Use Node.js 24 and npm.

Install the locked dependencies:

```sh
npm ci
```

For live evaluation, create a local environment file and set server-only provider values:

```sh
cp .env.example .env.local
```

Set `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and optionally `APP_URL` in `.env.local`. Do not prefix the key with `VITE_` and do not commit the file.

Start the development server and same-origin local API middleware:

```sh
npm run dev
```

Run the complete non-network test suite, including mocked API, storage/progress, and browser-level frontend flows:

```sh
npm test
```

Run tests interactively while developing:

```sh
npm run test:watch
```

Type-check and produce the production client build:

```sh
npm run build
```

Preview the production client with the local API middleware:

```sh
npm run preview
```

Before handing off a redesign, manually verify the full path: landing → library → challenge → draft refresh → invalid submit → successful evaluation → revision → comparison → progress refresh, plus pricing, missing routes, API failure, and narrow-screen keyboard navigation.
