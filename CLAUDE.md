# Cookers Delight — Claude Code Guide

## Project Overview

Cookers Delight is a premium West African restaurant web app built with **React 19 + TypeScript + Vite + Tailwind CSS v4** on the frontend and **Express + Prisma** on the backend.

## Dev Commands

```bash
npm run dev          # Start both client (Vite) and server (nodemon) concurrently
npm run client       # Vite dev server only
npm run server       # Express API server only (nodemon)
npm run build        # Production Vite build
npm run db:push      # Push Prisma schema to database
npm run db:generate  # Generate Prisma client
npm run seed         # Seed database
npm run studio       # Open Prisma Studio
```

## Architecture

```
src/                  # React frontend (TypeScript)
├── components/       # Shared UI components
├── admin/            # Admin dashboard pages
├── portal/           # Customer portal pages
├── api/              # Frontend API client helpers
├── hooks/            # React hooks
└── utils/            # Utility functions

server/               # Express backend
├── routes/           # API route handlers
├── models/           # Data models
├── middleware/        # Express middleware
├── lib/              # Server utilities
└── prisma/           # Database schema & migrations
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4
- **Animations**: Motion (Framer Motion v12)
- **Backend**: Express 4, Node.js
- **Database**: Prisma ORM
- **Icons**: Lucide React, React Icons
- **Charts**: Recharts
- **DnD**: @dnd-kit
- **Maps**: @react-google-maps/api
- **Auth**: @react-oauth/google

## AI Frameworks

This project integrates 6 AI development frameworks in `ai-frameworks/`:

### 1. Superpowers (`ai-frameworks/superpowers/`)
Agentic skills framework. Forces structured plan → spec → implement flow.
Skills are available in `.claude/skills/` (brainstorming, writing-plans, test-driven-development, etc).

### 2. Everything-Claude Code (`ai-frameworks/everything-claude-code/`)
Performance optimization system with 228+ skills, hooks, rules, and MCP configs.
Use the install script for full integration: `cd ai-frameworks/everything-claude-code && bash install.sh`

### 3. UI UX Pro Max (`ai-frameworks/ui-ux-pro-max-skill/`)
Design intelligence skill with 161 reasoning rules and 67 UI styles.
Skills available: `/ui-ux-pro-max`, `/ui-styling`, `/design-system`, `/design`, `/brand`, `/banner-design`.
Search command: `python3 ai-frameworks/ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>`

### 4. Browser-use (`ai-frameworks/browser-use/`)
Python library for AI browser control. Installed via pip.
Skills: `/browser-use`, `/open-source`, `/cloud`, `/remote-browser`.
```python
from browser_use import Agent
# Requires ANTHROPIC_API_KEY or other LLM API key
```

### 5. Claude-mem (`ai-frameworks/claude-mem/`)
Persistent memory plugin across Claude Code sessions. Uses SQLite + vector embeddings.
Skills: `/mem-search`, `/make-plan`, `/do`, `/learn-codebase`, `/smart-explore`.
Install: `cd ai-frameworks/claude-mem && npm install && npm run build-and-sync`

### 6. n8n-MCP (`ai-frameworks/n8n-mcp/`)
MCP server giving Claude knowledge of 1,650 n8n workflow automation nodes.
Configured in `.claude/settings.json` as `n8n-mcp` MCP server.
Requires: N8N_API_URL and N8N_API_KEY env vars for live workflow management.

## Available Skills (`.claude/skills/`)

| Skill | Source | Purpose |
|-------|--------|---------|
| `/brainstorming` | Superpowers | Plan before coding |
| `/writing-plans` | Superpowers | Create implementation plans |
| `/test-driven-development` | Superpowers | TDD workflow |
| `/systematic-debugging` | Superpowers | Debug systematically |
| `/verification-before-completion` | Superpowers | Pre-commit checklist |
| `/subagent-driven-development` | Superpowers | Multi-agent development |
| `/dispatching-parallel-agents` | Superpowers | Parallel agent coordination |
| `/executing-plans` | Superpowers | Execute multi-step plans |
| `/finishing-a-development-branch` | Superpowers | Branch cleanup workflow |
| `/receiving-code-review` | Superpowers | Handle review feedback |
| `/requesting-code-review` | Superpowers | Submit for review |
| `/using-git-worktrees` | Superpowers | Git worktree workflow |
| `/ui-ux-pro-max` | UI UX Pro Max | Full design intelligence |
| `/ui-styling` | UI UX Pro Max | Styling decisions |
| `/design-system` | UI UX Pro Max | Design system generation |
| `/design` | UI UX Pro Max | Design decisions |
| `/brand` | UI UX Pro Max | Brand identity |
| `/browser-use` | Browser-use | AI browser automation |
| `/mem-search` | Claude-mem | Search past sessions |
| `/make-plan` | Claude-mem | Phased planning |
| `/do` | Claude-mem | Execute phased plans |
| `/learn-codebase` | Claude-mem | Learn project structure |

## Coding Conventions

- TypeScript strict mode — no `any` without justification
- Tailwind CSS v4 utility classes (no custom CSS unless necessary)
- React functional components with hooks only
- No comments unless explaining a non-obvious WHY
- API calls go through `src/api/` helpers, not inline fetch
- Prisma models are the source of truth for data shapes

## Environment Variables

```bash
# Server (.env in server/)
DATABASE_URL=          # PostgreSQL connection string
GOOGLE_CLIENT_ID=      # Google OAuth
GOOGLE_CLIENT_SECRET=  # Google OAuth
GEMINI_API_KEY=        # Google Gemini AI

# n8n-MCP (optional)
N8N_API_URL=           # n8n instance URL
N8N_API_KEY=           # n8n API key

# Browser-use (optional)
ANTHROPIC_API_KEY=     # For browser-use agent
```
