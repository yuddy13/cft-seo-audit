# Source Map Starter Pack Builder — Setup Guide

## Prerequisites
- Node.js 18+
- npm 9+
- An OpenRouter API key (https://openrouter.ai/keys)

---

## Quick Start

```bash
cd source-map-builder
cp .env.example .env.local
# Edit .env.local: set ENCRYPTION_KEY to a random 32-char string
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to the dashboard.

---

## First-time workflow

1. **API Settings** → Enter your OpenRouter key → Save
2. **Niches** → Enable the niches you want → click the refresh icon to generate queries
3. **Queries** → Review and edit queries for your first niche
4. **Runs** → Create a pilot run (1 niche, ~75 API calls) → confirm and start
5. **Results** → Review extracted citations while the run is in progress
6. **QA Checks** → Resolve any warnings
7. **Results** → Download XLSX per niche (4 tabs: Raw Data, Publisher Frequency, Model Comparison, Action Summary)

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ENCRYPTION_KEY` | `default-dev-key-change-in-production!!` | AES-256-GCM key for API key encryption |
| `DATABASE_PATH` | `./data/smb.db` | Path to SQLite database file |
| `NODE_ENV` | `development` | Set to `production` for prod builds |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | SQLite via better-sqlite3 |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Spreadsheet export | xlsx |
| Encryption | Node.js crypto (AES-256-GCM) |

---

## Architecture

```
source-map-builder/
├── src/
│   ├── app/
│   │   ├── api/          # API routes (server-side)
│   │   │   ├── settings/ # API key + model config
│   │   │   ├── niches/   # CRUD niches
│   │   │   ├── queries/  # Query generation + editing
│   │   │   ├── runs/     # Job management
│   │   │   │   ├── start/   # Kicks off background processing
│   │   │   │   ├── status/  # Progress polling
│   │   │   │   └── pause/   # Pause/resume flag
│   │   │   ├── citations/   # Browse raw citations
│   │   │   ├── export/      # XLSX/CSV download
│   │   │   ├── dashboard/   # Aggregate stats
│   │   │   ├── qa/          # Quality checks
│   │   │   └── cost/        # Spend tracking
│   │   ├── dashboard/    # Stats overview
│   │   ├── settings/     # API key UI
│   │   ├── niches/       # Niche management
│   │   ├── queries/      # Query review/edit
│   │   ├── runs/         # Create & monitor runs
│   │   ├── results/      # Browse citations
│   │   ├── qa/           # QA warnings
│   │   └── cost/         # Cost report
│   ├── lib/
│   │   ├── db.ts          # SQLite init + migrations
│   │   ├── crypto.ts      # AES-256-GCM encrypt/decrypt
│   │   ├── openrouter.ts  # OpenRouter API client
│   │   ├── query-generator.ts  # 25 queries × niche
│   │   ├── extractor.ts   # URL/citation extraction
│   │   ├── exporter.ts    # XLSX workbook builder
│   │   ├── settings.ts    # Shared settings helpers
│   │   └── run-state.ts   # In-memory pause flags
│   └── components/
│       └── Sidebar.tsx
└── data/                  # SQLite DB (gitignored)
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `settings` | Key/value store (API key encrypted, model config) |
| `niches` | Niche definitions |
| `queries` | 25 queries per niche |
| `runs` | Job runs with progress + spend tracking |
| `run_results` | Individual model × query call results |
| `citations` | Extracted URLs and domain citations |

---

## Default Models (OpenRouter)

| Label | Model ID |
|---|---|
| ChatGPT | openai/gpt-4o |
| Gemini | google/gemini-2.0-flash-001 |
| Perplexity | perplexity/sonar-pro |

Edit any model ID in **API Settings**.

---

## Security

- API keys are AES-256-GCM encrypted before storage
- Keys are never logged or returned to the browser
- All model responses are treated as untrusted input
- Spreadsheet cells are sanitised to prevent formula injection (`=`, `+`, `-`, `@`)
- High-volume runs require explicit confirmation checkbox before starting

---

## Production Deployment

```bash
npm run build
npm start
```

Or deploy to any Node.js host (Vercel, Railway, Render, VPS).

For Vercel: note that `better-sqlite3` requires native bindings — use a VPS/Railway for persistent SQLite, or swap to a hosted Postgres with `pg` for Vercel deployments.

---

## Testing Checklist

- [ ] API key saves and encrypts correctly (Settings page)
- [ ] Key is not exposed in browser network tab
- [ ] Niches generate 25 queries each
- [ ] Query editing persists after page reload
- [ ] Pilot run starts and shows live progress
- [ ] Citation extraction captures URLs from markdown and plain text
- [ ] Pause/resume works mid-run
- [ ] XLSX export has all 4 tabs: Raw Data, Publisher Frequency, Model Comparison, Action Summary
- [ ] Publisher Frequency sorted by Total descending
- [ ] Action Summary has headers but no data (ready for analyst)
- [ ] CSV export downloads correctly
- [ ] QA page flags runs with < 50 unique domains
- [ ] Cost report tracks spend per model and niche
- [ ] Formula injection test: insert `=SUM(A1)` as a query — export should prefix with `'`
