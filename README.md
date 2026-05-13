# SprintHub - Team Radiant Rabbits

SprintHub is a web-based project management tool designed specifically for student software engineering teams. It connects directly to GitHub Projects and GitHub repositories, turning raw issue and commit data into sprint dashboards, AI-generated sprint reviews, and per-contributor workload summaries, removing the manual overhead of tracking progress across a team.

---

## Features

| Area | What you can do |
|---|---|
| **Authentication** | Sign in with GitHub OAuth; sessions are issued and verified by NextAuth |
| **Group management** | Create a group, join via invite link, switch between groups, or leave a group |
| **Repository connection** | Link a GitHub repository and project board; SprintHub syncs issues per iteration automatically |
| **Dashboard** | View sprint velocity, contribution breakdown by member, and task completion trends across all sprints |
| **Current sprint** | See open tasks, a timeline, focus metrics, and AI-generated per-contributor workload summaries |
| **Past sprints** | Browse completed sprints with an AI-written review summary for each |
| **Sprint review** | Generate and download a full sprint review document for any completed sprint |
| **Teammates** | View each teammate's GitHub profile and contribution stats |
| **Archived groups** | Rejoin or browse groups you previously left; download their sprint reviews |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) with React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Authentication | NextAuth v4 with GitHub OAuth provider |
| Database | MongoDB via Mongoose |
| Caching / sync | Redis via ioredis |
| AI generation | OpenAI or Google Gemini (configurable) |
| Linting / formatting | Biome |
| Git hooks | Lefthook (runs Biome on staged files before every commit) |
| Unit / integration tests | Jest + ts-jest + Testing Library + mongodb-memory-server |
| End-to-end tests | Playwright |

---

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

---

## Why Two Component Folders?

- `src/app/(main)/components` — shell components specific to the `(main)` route layout (`PageTopBar`, `SideNav`).
- `src/components` — reusable shared feature/UI components consumed across route groups.

---

## Prerequisites

- **Node.js 20+** and **npm**
- A **MongoDB** connection string (MongoDB Atlas free tier works fine)
- A **GitHub OAuth App** (create one at [github.com/settings/developers](https://github.com/settings/developers)) with the callback URL set to `http://localhost:3000/api/auth/callback/github` for local development
- *(Optional)* A **Redis** URL for caching and sync workflows
- *(Optional)* An **OpenAI** or **Google Gemini** API key for AI-generated sprint reviews and summaries

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/UOA-CS732-S1-2026/group-project-radiant-rabbits.git
cd group-project-radiant-rabbits
npm install
```

> `npm install` also runs a `postinstall` step that installs Lefthook git hooks (Biome checks on commit). No extra setup needed.

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URL` | Yes | MongoDB connection string |
| `AUTH_SECRET` | Yes | Long random string for session encryption (generate with `openssl rand -base64 32`) |
| `AUTH_GITHUB_ID` | Yes | GitHub OAuth App client ID |
| `AUTH_GITHUB_SECRET` | Yes | GitHub OAuth App client secret |
| `REDIS_URL` | No | Redis connection URL; enables caching and background sync |
| `OPENAI_API_KEY` | No | Enables OpenAI-backed sprint review generation |
| `OPENAI_MODEL` | No | Model override (default: `gpt-4o-mini`) |
| `GEMINI_API_KEY` | No | Enables Gemini-backed sprint review generation (used if OpenAI key is absent) |
| `GEMINI_MODEL` | No | Model override (default: `gemini-flash-latest`) |

### 3. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Running Tests

### Unit and integration tests (Jest)

Jest tests live in `src/app/test/` and cover API routes, service logic, database aggregations, and React components. They use `mongodb-memory-server` to spin up an in-memory MongoDB instance, so no external database is needed.

```bash
npm test
```

### End-to-end tests (Playwright)

Playwright tests live in `tests/e2e/` and cover sign-in/sign-out flows, group switching, modal behaviour, navigation, and error states. They run against the development server using a test-mode auth bypass so no real GitHub account is required.

```bash
npm run test:e2e
```

To open the interactive Playwright UI:

```bash
npm run test:e2e:ui
```

> **Note:** Playwright starts the Next.js dev server automatically with `TEST_MODE=true`. You do not need to start the server separately before running E2E tests.

### Continuous integration

Both suites also run automatically in CI via GitHub Actions on every push and pull request:

- [.github/workflows/jest.yml](.github/workflows/jest.yml) — runs the Jest suite
- [.github/workflows/playwright.yml](.github/workflows/playwright.yml) — runs the Playwright suite

---

## Note for Markers / Testers

To fully exercise SprintHub's functionality, the signed-in GitHub account must be a member of a repository that contains:

- GitHub Projects iterations
- Issues assigned to those iterations
- Completed iterations with commits, pull requests, and closed issues

Our project repository (`group-project-radiant-rabbits`) has all of the GitHub data required to showcase the app end-to-end. If you are testing with a different repository that does not have this data, some dashboard metrics, sprint history, and contribution views may appear empty even though the app is working correctly.

The app also has built-in guidance for configuring the required GitHub Projects iteration fields, accessible in-app under `/docs/github-iteration-fields` (source: [src/app/docs/github-iteration-fields/](src/app/docs/github-iteration-fields/)).
