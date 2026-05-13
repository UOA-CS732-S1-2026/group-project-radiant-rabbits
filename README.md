# SprintHub - Team Radiant Rabbits

## Overview
SprintHub is a Next.js 16 app for managing student team sprints backed by GitHub data. It supports authentication, group lifecycle flows, sprint tracking, teammate visibility, dashboard analytics, and AI-assisted sprint summaries/reviews.

## Core Features
- GitHub authentication with NextAuth
- Group lifecycle: create, join, switch, leave, archive
- Main app shell with persistent sidebar and top bar
- Dashboard metrics and contribution breakdown
- Current sprint workflow (tasks, timeline, focus, status)
- Past sprint history and summaries
- Teammate view and membership actions
- Group sync and sprint transition APIs
- Jest unit/integration coverage and Playwright E2E coverage

## Tech Stack
- Next.js 16 (App Router)
- TypeScript
- React 19 + Tailwind CSS 4
- next-auth
- MongoDB + Mongoose
- ioredis (optional cache/sync integration)
- Jest, Testing Library, Supertest, Playwright
- Biome + Lefthook

## Project Structure
```text
.
├── .github/
│   └── workflows/
├── public/
│   └── logo-options/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (group-change)/
│   │   ├── (main)/
│   │   │   ├── components/
│   │   │   ├── current-sprint/
│   │   │   ├── dashboard/
│   │   │   ├── past-sprints/
│   │   │   ├── summary/
│   │   │   └── teammates/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── groups/
│   │   │   └── user/
│   │   ├── database/
│   │   ├── docs/
│   │   ├── lib/
│   │   ├── test/
│   │   ├── utils/
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── auth/
│   │   ├── current-sprint/
│   │   ├── dashboard/
│   │   ├── group-change/
│   │   ├── landing-page/
│   │   ├── main/
│   │   ├── past-sprint/
│   │   ├── shared/
│   │   └── teammates/
│   ├── lib/
│   ├── types/
│   └── auth.ts
├── tests/
│   └── e2e/
├── .env.example
├── biome.json
├── jest.config.ts
├── jest.setup.ts
├── lefthook.yaml
├── next.config.ts
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## Why Two Component Folders?
- `src/app/(main)/components`: shell components specific to the `(main)` route layout (`PageTopBar`, `SideNav`).
- `src/components`: reusable shared feature/UI components consumed across route groups.

## Prerequisites
- Node.js 20+
- npm
- MongoDB connection string
- GitHub OAuth app credentials
- Optional Redis URL
- Optional OpenAI or Gemini API key for AI-generated summaries/reviews

## Environment Variables
Copy `.env.example` to `.env` and configure values.

Common variables:
- `MONGODB_URL`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `AUTH_SECRET`
- `REDIS_URL` (optional)
- `OPENAI_API_KEY` or `GEMINI_API_KEY` (optional)
- `OPENAI_MODEL` / `GEMINI_MODEL` (optional)

E2E/test-mode variables used by Playwright local server setup:
- `TEST_MODE=true`
- `NEXT_PUBLIC_TEST_MODE=true`

When enabled, these disable GitHub OAuth and activate a test login provider so Playwright can sign in deterministically without hitting GitHub. Leave both set to `false` for normal development.

## Scripts
- `npm run dev`: start dev server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: Biome checks
- `npm run format`: format with Biome
- `npm test`: run Jest tests
- `npm run test:e2e`: run Playwright tests
- `npm run test:e2e:ui`: run Playwright UI mode

## Run Locally
```bash
npm install
npm run dev
```

Default URL: `http://localhost:3000`

`npm install` also runs a `postinstall` step that installs Lefthook git hooks (Biome checks on commit). No extra setup needed.

## Testing
```bash
npm test
npm run test:e2e
```

Both suites also run automatically in CI via GitHub Actions: [.github/workflows/jest.yml](.github/workflows/jest.yml) and [.github/workflows/playwright.yml](.github/workflows/playwright.yml) execute on push and pull requests.

## Note for Markers / Testers
To fully exercise SprintHub's functionality, the signed-in GitHub account must be a member of a repository that contains:
- GitHub Projects iterations
- Issues assigned to those iterations
- Completed iterations with commits, pull requests, and closed issues

Our project repository (`group-project-radiant-rabbits`) has all of the GitHub data required to showcase the app end-to-end. If you are testing with a different repository that does not have this data, some dashboard metrics, sprint history, and contribution views may appear empty even though the app is working correctly.

The app also has built-in guidance for configuring the required GitHub Projects iteration fields, accessible in-app under `/docs/github-iteration-fields` (source: [src/app/docs/github-iteration-fields/](src/app/docs/github-iteration-fields/)).
