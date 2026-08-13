# Template Engine & Prompt Engine Microservice

Manages admin-curated, versioned starter workflow templates (e.g., E-Commerce Product Ad Suite, Social Video Production, Multilingual Voiceover & Avatar). Provides template forking into executable workflows on Workflow Engine, `{{variable}}` prompt interpolation, token budgeting, and safety linting.

## Responsibilities
- Starter template library management & filtering (category, modality).
- Template previewing and forking (`POST /v1/templates/:id/fork`).
- Prompt variable interpolation (`POST /v1/prompts/render`).
- Token budgeting and prompt safety linting (`POST /v1/prompts/lint`).

## Running Locally
```bash
npm install
npm run dev
```

## Running Tests
```bash
npm test
```
