# SprintHub - Team Radiant Rabbits

## Description
SprintHub is a Next.js application for managing a GitHub-backed student project team. It supports GitHub authentication, group creation and switching, sprint tracking, teammate visibility, dashboard analytics, and AI-assisted sprint review generation.

The app stores group and sprint data in MongoDB, uses GitHub for identity and repository access, and can use Redis for caching and sync-related workflows. Sprint review and contribution summary features can also call an LLM provider through environment configuration.

## Included Features
- GitHub sign-in and session handling
- GitHub repository connection and fetch of issues based on iterations in GitHub Projects
- Group onboarding, including join, create, and switch-group flows
- Dashboard with sprint and contribution analytics
- Current sprint view with task, focus, timeline components and AI generated contributor workload summaries
- Past sprints with an AI summary provided for each
- Teammate views with leave group functionality
- Sprint review generation and review summary workflows
- GitHub repository syncing and group-member management APIs
- Test coverage for dashboard, sprint, join, sync, and review routes and services
- Responsive UI based on tab size

## File Structure
```text
.
├── public/
│   └── logo-options/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (group-change)/
│   │   ├── (main)/
|   |   |   ├── components/
│   │   │   ├── current-sprint/
│   │   │   ├── dashboard/
│   │   │   ├── group/
│   │   │   ├── join/
│   │   │   ├── past-sprints/
│   │   │   ├── repository/
│   │   │   ├── sprint/
│   │   │   ├── summary/
│   │   │   ├── tasks/
│   │   │   └── teammates/
│   │   ├── api/
│   │   ├── database/
│   │   ├── lib/
│   │   ├── test/
│   │   └── utils/
│   ├── components/
│   │   ├── auth/
│   │   ├── current-sprint/
│   │   ├── dashboard/
│   │   ├── group-change/
│   │   ├── landing-page/
│   │   ├── past-sprint/
│   │   ├── shared/
│   │   └── teammates/
│   ├── lib/
│   └── types/
├── biome.json
├── jest.config.js
├── jest.config.ts
├── jest.setup.ts
├── lefthook.yaml
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## Dependencies
Main runtime dependencies:
- Next.js
- React and React DOM
- next-auth for GitHub authentication
- mongodb and mongoose for database access
- ioredis for Redis-backed sync/caching
- lucide-react for icons

Main development and test dependencies:
- TypeScript
- Biome
- Jest
- ts-jest
- Testing Library
- mongodb-memory-server
- supertest
- Tailwind CSS
- lefthook

## Prerequisites
- Node.js 20 or newer
- npm
- A MongoDB connection string
- GitHub OAuth app credentials
- A Redis URL if you want sync and cache features enabled
- An OpenAI or Gemini API key if you want AI-generated sprint reviews and summaries

Required environment variables:
- `MONGODB_URL`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `REDIS_URL`
- `OPENAI_API_KEY` or `GEMINI_API_KEY`
- Optional model overrides such as `OPENAI_MODEL` or `GEMINI_MODEL`

## How To Run
Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.


## Still To Be Implemented (DELETE LATER; FOR OUR REFERENCE)
- Incorrect metrics in Dashboard (many bugs)
- Landing page with inconsistent colour scheme UI
- Data caching
