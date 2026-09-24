# Paytm TaskMate

> **AI financial teammate that owns the workflow while the user keeps control of the money.**

Paytm TaskMate is an autonomous AI financial assistant built for hackathon demonstration. It transforms traditional conversational chatbots into an actionable execution agent: the user states their financial goal in natural language (e.g., *"Handle my electricity bill"*), and TaskMate coordinates permitted backend tools, fetches verified bill data, prepares a locked payment preview, requests deterministic user approval, safely triggers isolated UPI authentication, executes payments with idempotency and retry safeguards, and provides an immutable audit trail with live Server-Sent Events (SSE).

---

## Architecture

```text
                    ┌─────────────────────────┐
                    │    Next.js 15 Web UI    │
                    │  (React + Tailwind CSS) │
                    └────────────┬────────────┘
                                 │
                     SSE Stream  │ HTTP / JSON
                                 ▼
                    ┌─────────────────────────┐
                    │      Hono API Core      │
                    │  (Validation & Events)  │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      ┌─────────────────────┐         ┌─────────────────────┐
      │     AI Agent        │         │   Inngest Workflow  │
      │  (Vercel AI SDK)    │         │  (Durable Steps)    │
      └──────────┬──────────┘         └──────────┬──────────┘
                 │                               │
                 ▼                               ▼
      ┌─────────────────────┐         ┌─────────────────────┐
      │  Permissioned Tools │         │  Mock Payment GW    │
      │  (Least Privilege)  │         │  (Retry & Recovery) │
      └──────────┬──────────┘         └──────────┬──────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │    PostgreSQL Database  │
                    │      + Drizzle ORM      │
                    └─────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Immutable Audit Log   │
                    └─────────────────────────┘
```

---

## Key Features

1. **Deterministic Approval Gate**: The LLM *never* sets payment amounts or payees. Payment previews are built exclusively from verified tool outputs (`get_bill`).
2. **Zero-Knowledge PIN Isolation**: The mock UPI authentication modal is architecturally decoupled from the AI agent. The 4-digit PIN is never stored, never logged, and never included in LLM context or database tables.
3. **Idempotent Payment Engine**: Every payment requires a unique idempotency key. Network timeouts and gateway retries reuse the same key, strictly preventing duplicate transactions.
4. **Intelligent Retry Policy**:
   - *Technical Failure*: Retries exactly once with the same idempotency key.
   - *Insufficient Balance*: Rejects immediately without retries and alerts the user.
   - *Pending*: Polls status with backoff without assuming false success.
5. **Live Backend Trace via SSE**: The UI receives real-time execution steps directly from backend tool invocations and durable workflow events.
6. **Live Demo Scenario Switcher**: Judges can switch scenarios (*Success*, *Technical Error*, *Low Balance*, *Pending*, *Unknown Result*) with one click.

---

## Tech Stack

- **Monorepo**: pnpm Workspaces + Turborepo
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Lucide React
- **Backend API**: Hono, Node.js, Server-Sent Events (SSE)
- **Workflows**: Inngest durable workflows (steps, wait-for-event, retries, cron)
- **Database & ORM**: PostgreSQL, Drizzle ORM (with embedded PGlite for zero-config local runs)
- **Validation**: Zod (shared schemas across full stack)
- **Testing**: Vitest (unit & integration), Playwright (end-to-end)
- **Containerization**: Docker Compose

---

## Monorepo Structure

```text
taskmate/
│
├── apps/
│   ├── web/              # Next.js frontend with Paytm-style fintech UI
│   ├── api/              # Hono HTTP API & SSE event streaming
│   └── worker/           # Inngest durable workflows & cron jobs
│
├── packages/
│   ├── shared/           # Zod schemas, TypeScript types, constants
│   ├── db/               # Drizzle schemas, client, and realistic seed data
│   ├── tools/            # Permissioned tools with least-privilege scoping
│   ├── agent/            # Vercel AI SDK planner & event bus
│   └── ui/               # Shared design tokens & utilities
│
├── tests/                # Vitest integration tests & Playwright E2E tests
├── docker-compose.yml    # Docker services orchestration
├── package.json
└── pnpm-workspace.yaml
```

---

## Getting Started

### 1. Prerequisites

- Node.js >= 20.0.0
- pnpm (`npm install -g pnpm`)
- Docker (Optional: TaskMate automatically runs embedded PGlite if no Postgres container is running)

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Seed Demo Data

Seeds demo user **Aarendra Singh** (₹25,000 balance, ₹10,000 transaction limit), electricity (₹2,450), internet (₹999), mobile (₹599), and water bills:

```bash
pnpm db:seed
```

### 4. Run Locally

To start the API, Worker, and Web frontend concurrently:

```bash
pnpm dev
```

Or run individual services:

```bash
# Terminal 1: Hono API (port 4000)
pnpm --filter @taskmate/api dev

# Terminal 2: Inngest Worker (port 4001)
pnpm --filter @taskmate/worker dev

# Terminal 3: Next.js Web (port 3000)
pnpm --filter @taskmate/web dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Tests

### Unit & Integration Tests (Vitest)

Tests Zod schemas, least privilege permissions, deterministic approval enforcement, ₹10,000 transaction limits, idempotency key replay, and technical error retry policies:

```bash
pnpm test
```

### End-to-End Tests (Playwright)

Tests the complete user journey from Dashboard → TaskMate → "Handle my electricity bill" → Approval → Mock UPI PIN → Payment Success → Transaction update → Audit trail:

```bash
pnpm test:e2e
```

---

## Running with Docker Compose

To run the complete stack (PostgreSQL, Hono API, Worker, and Web App):

```bash
docker-compose up --build
```

Access the application at [http://localhost:3000](http://localhost:3000).

---

## Hackathon Demonstration Walkthrough

1. **Dashboard (`/`)**: Note the greeting, balance of ₹25,000, and upcoming electricity bill for ₹2,450. Click **"Ask TaskMate"**.
2. **Natural Language Execution (`/taskmate`)**:
   - Send: `"Handle my electricity bill"`
   - Watch the live backend SSE activity trace: `Understanding request` → `Finding electricity bill` → `Checking amount` → `Waiting for approval`.
3. **Deterministic Approval**:
   - Notice the locked approval card displays ₹2,450 for Maharashtra Electricity (derived strictly from tool output).
   - Click **"Approve Payment"**.
4. **Isolated Mock UPI Authentication**:
   - The isolated PIN screen opens. Enter `1234` on the numeric keypad and click **"Confirm"**.
   - Notice: PIN is never sent to agent logs or database.
5. **Success & Ledger Update**:
   - Payment succeeds with transaction ID `TXN-...`.
   - Check `/transactions` to verify the debit record.
   - Check `/bills` to confirm the bill is marked **PAID**.
   - Check `/audit` to inspect the full, immutable actor trace (`USER`, `AGENT`, `TOOL`, `SYSTEM`).
6. **Demonstrate Failure & Retry**:
   - Click **"Tech Error (Retry 1x)"** in the top demo bar.
   - Trigger payment and observe the automatic 1-time retry with the identical idempotency key.
