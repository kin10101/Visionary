# ERNI Solutions Refiner

An AI-powered specification generator and refinement tool. Upload raw context documents (PDFs, Word docs, images, text files) and transform them into structured, implementation-ready technical specifications using GPT-4o via LangGraph workflows. Iteratively refine specs section-by-section with natural language feedback, track version history, compare diffs, and export finalized markdown.

## Features

- **AI-powered spec generation** from uploaded documents (PDF, DOCX, images, markdown, text)
- **Section-level AI revision** with real-time streaming output (Server-Sent Events)
- **Document parsing** including OCR-style image analysis via GPT-4o vision
- **Version control** with diff view and restore to any previous version
- **Rich markdown editing** via Tiptap editor
- **Status workflow**: draft → in_review → approved
- **Export** specs as `.md` files

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0 (async), aiosqlite, LangChain, LangGraph |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, Tiptap v3 |
| AI | OpenAI GPT-4o, LangSmith (tracing/observability) |
| Database | SQLite (via `data/visionary.db`) |

## Project Structure

```
├── .env                        # Environment variables (API keys)
├── data/visionary.db           # SQLite database
├── backend/
│   ├── main.py                 # FastAPI app entrypoint
│   ├── config.py               # pydantic-settings configuration
│   ├── database.py             # SQLAlchemy async engine + session
│   ├── models.py               # ORM models
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── routers/
│   │   ├── specs.py            # Spec CRUD + AI generate/revise
│   │   ├── versions.py         # Version history endpoints
│   │   └── files.py            # File upload/list/delete
│   ├── services/
│   │   └── file_parser.py      # PDF, DOCX, image, text extraction
│   └── graph/
│       ├── state.py            # LangGraph state definition
│       ├── nodes.py            # Graph node functions
│       ├── prompts.py          # System/user prompts for AI
│       └── workflow.py         # StateGraph build + streaming
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Router (Dashboard, CreateSpec, ViewSpec)
│   │   ├── api/client.ts       # API client (fetch wrapper)
│   │   ├── pages/              # Dashboard, CreateSpec, ViewSpec
│   │   ├── components/         # FileUploader, TiptapEditor
│   │   └── hooks/useSSE.ts     # SSE streaming hook
│   └── vite.config.ts          # Dev server + API proxy config
```

## Data Schema

### `specs`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| title | String | Spec title |
| status | String | `draft`, `in_review`, or `approved` |
| current_version | Integer | Latest version number |
| created_at | DateTime | Creation timestamp (UTC) |
| updated_at | DateTime | Last update timestamp (UTC) |

### `spec_versions`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| spec_id | UUID (FK) | References `specs.id` |
| version_number | Integer | Sequential version number |
| content_markdown | Text | Full spec content in markdown |
| change_description | String | What changed in this version |
| created_at | DateTime | Creation timestamp (UTC) |

### `uploaded_files`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique identifier |
| spec_id | UUID (FK) | References `specs.id` |
| filename | String | Original filename |
| file_path | String | Storage path on disk |
| file_type | String | `pdf`, `docx`, `image`, `markdown`, or `txt` |
| parsed_text | Text | Extracted text content |
| uploaded_at | DateTime | Upload timestamp (UTC) |

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager) or pip
- An OpenAI API key

### Environment Variables

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=sk-your-key-here

# Optional: LangSmith tracing
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_API_KEY=lsv2_pt_your-key-here
LANGSMITH_PROJECT=your-project-name
```

### Running the Backend

```bash
cd backend
uv sync                              # Install dependencies
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Auto-generated docs at `/docs`.

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies `/api` requests to the backend.

### Production Build

```bash
cd frontend
npm run build    # Outputs to dist/
```

## API Reference

All endpoints are prefixed with `/api/specs`.

### Specs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/specs` | List all specs |
| POST | `/api/specs` | Create a new spec |
| GET | `/api/specs/{spec_id}` | Get spec with current version content |
| PUT | `/api/specs/{spec_id}` | Update spec title or status |
| DELETE | `/api/specs/{spec_id}` | Delete spec and all related data |
| PUT | `/api/specs/{spec_id}/content` | Save manual edit (creates new version) |
| POST | `/api/specs/{spec_id}/generate` | AI-generate spec from uploaded files (SSE) |
| POST | `/api/specs/{spec_id}/revise` | AI-revise a section (SSE) |

### Versions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/specs/{spec_id}/versions` | List all versions |
| GET | `/api/specs/{spec_id}/versions/{version_number}` | Get specific version |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/specs/{spec_id}/files` | Upload files (multipart form) |
| GET | `/api/specs/{spec_id}/files` | List uploaded files |
| DELETE | `/api/specs/{spec_id}/files/{file_id}` | Delete a file |

### Streaming (SSE)

The `/generate` and `/revise` endpoints return `text/event-stream` responses. Tokens arrive as `data: "token"` lines. Completion is signaled with `event: done\ndata: {version_number}`.

## AI Workflow

The system uses a LangGraph StateGraph with two modes:

1. **Generate** — Takes all uploaded document context, formats it, and generates a full structured specification via GPT-4o.
2. **Revise** — Takes the current spec, a target section name, and user feedback, then rewrites only that section while preserving the rest.

Both modes stream tokens back to the client in real time via SSE.

## Supported File Types

| Type | Extensions | Parser |
|------|-----------|--------|
| PDF | `.pdf` | pdfplumber |
| Word | `.docx` | python-docx |
| Image | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` | GPT-4o vision (base64 encoded) |
| Markdown | `.md` | Raw text |
| Text | `.txt` | Raw text |
