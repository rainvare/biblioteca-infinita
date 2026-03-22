# CLAUDE.md — Biblioteca Infinita

AI assistant guide for working on this codebase.

---

## Project Overview

**Biblioteca Infinita** is an interactive literary experience inspired by Jorge Luis Borges' 1941 short story "La Biblioteca de Babel." It creates a virtual infinite library where users can discover literary works — either real published texts (Project Gutenberg, arXiv) or AI-generated content (Groq's Llama 3.3).

**Live URL:** https://biblioteca-infinita.netlify.app
**Creator:** @rainvare

---

## Architecture

This is an intentionally minimal stack — no build tools, no frameworks, no npm dependencies:

```
index.html                        # Complete frontend (HTML + CSS + JS, ~1050 lines)
netlify/
  functions/
    generate.js                   # Backend serverless function (~166 lines)
netlify.toml                      # Netlify deployment config
README.md
```

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5 + CSS3 + ES6 JavaScript |
| Typography | Google Fonts: Playfair Display, Lora, DM Sans |
| Backend | Netlify Functions (Node.js serverless) |
| Content Generation | Groq API (`llama-3.3-70b-versatile`) |
| Real Texts | Gutendex (Project Gutenberg proxy) + arXiv XML API |
| Hosting | Netlify (static site + serverless functions) |
| Package Manager | **None** |
| Build Tool | **None** |
| Tests | **None** |

---

## Frontend: index.html

The entire frontend lives in a single HTML file with embedded CSS and JavaScript.

### Design Tokens (CSS custom properties)

```css
--everglade: #264431   /* deep forest green — primary */
--upnorth:   #719687   /* muted sage green */
--diving:    #5A94A7   /* calm blue */
--gilded:    #EAA043   /* gold accent */
--veil:      ...       /* light background variants */
```

### UI Sections

1. **Hero** (`#hero`) — Full-viewport landing with two CTAs
2. **Narrative** (`#narrative`) — Contextual info + search interface
   - `#coord-display` — Deterministic library coordinates display
   - `#search-section` — Text input + genre pills + action buttons
3. **Book View Modal** (`#bookview`) — Renders discovered/generated book
4. **Narrator Overlay** (`#narr`) — Shows during coordinate navigation animation
5. **Loading Overlay** (`#loading`) — Shown while fetching content
6. **Progress Bar** (`#prog`) — Top-of-page fill bar during loading

### Genre Pills

Seven genres map to distinct LLM prompts:
```
cuento | poema | ensayo | enciclopedia | fragmento | carta | diario
```

### Language System

15 languages are supported:
- Natural: `es`, `en`, `fr`, `de`, `it`, `pt`, `ru`, `ar`, `ja`, `zh`, `la`, `el`
- Fictional: `qya` (Quenya/Elvish), `tlh` (Klingon), `brg` (Borgesiano)

Fictional languages always include a Spanish translation block separated by `"— Traducción —"`.

### Deterministic Coordinates

Every search query produces stable, reproducible library coordinates using the **FNV-1a hash algorithm**:

```javascript
function makeCoords(seed) {
  // FNV-1a hash → deterministic {sala, piso, est, vol, pag}
}
function pickLang(seed)          // hash-based language selection
function pickAuthor(style, seed) // hash-based author selection
```

Same query + genre always yields the same coordinates, language, and author — this is intentional and core to the Borges metaphor.

### Core Flow: `seekBook(tema, wander)`

1. Pick random topic if `wander=true`
2. Generate deterministic coords from `tema + genre` hash
3. Pick language + author from hash
4. Show narrator overlay (3.6s animation)
5. Show loading overlay
6. POST to `/.netlify/functions/generate`
7. Parse response (split on `"— Traducción —"`)
8. Render book view modal

---

## Backend: netlify/functions/generate.js

A single Node.js serverless function handling all content retrieval and generation.

### API Endpoint

**POST** `/.netlify/functions/generate`

#### Request Body

```json
{
  "tema": "search query",
  "genre": "cuento|poema|ensayo|enciclopedia|fragmento|carta|diario",
  "lang": {
    "code": "es",
    "name": "Español",
    "fictional": false
  },
  "author": "author name"
}
```

For direct Groq prompts (e.g., translation):
```json
{ "prompt": "raw prompt string" }
```

#### Response

```json
{
  "text": "Title\n\nContent\n\n— Traducción —\n\nTranslation (if applicable)",
  "author": "author name"
}
```

Error:
```json
{ "error": "error message" }
```

### Intent Classification

```javascript
classifyIntent(tema, genre)
// Returns: 'academic' | 'creative'
```

Academic keywords (regex-matched): physics, chemistry, biology, mathematics, quantum, algorithm, genome, evolution, etc.

### Content Source Decision Tree

**Academic intent:**
1. Try arXiv API → extract paper summary
2. Fallback: Gutenberg search
3. Fallback: Groq generation

**Creative intent:**
1. 30% chance: search Gutenberg
2. 70% chance: skip real sources → Groq generation

### External APIs

| API | Purpose | Timeout |
|-----|---------|---------|
| `https://api.groq.com/openai/v1/chat/completions` | LLM generation | — |
| `https://gutendex.com/books/?search=` | Project Gutenberg proxy | 8s |
| `https://export.arxiv.org/api/query` | Academic papers (XML) | 8s |

**Groq model config:**
- Model: `llama-3.3-70b-versatile`
- Max tokens: 1400
- Temperature: 0.88
- Top-p: 0.92

### Auto-Translation

When content is retrieved in a non-Spanish language, a second Groq call translates it. The result is appended after the `"— Traducción —"` separator. This also applies to fictional language output.

---

## Environment Variables

| Variable | Description | Where to set |
|----------|-------------|-------------|
| `GROQ_KEY` | Groq API key (`gsk_...`) | Netlify → Site settings → Environment variables |

**Never commit API keys.** No `.env` file should be committed.

---

## Development Workflow

### Local Development

```bash
npm install -g netlify-cli
netlify dev
```

This serves the static site and proxies serverless functions. Requires `GROQ_KEY` set in your environment or a local `.env` file (git-ignored).

### Deployment

Deployment is automatic via Netlify on every push to the connected branch. No build step required — Netlify publishes `.` (root) directly.

```toml
# netlify.toml
[build]
  publish = "."
  functions = "netlify/functions"
```

### Git Branch

Active development branch: `claude/add-claude-documentation-PAGxL`
Main branch: `master`

---

## Key Conventions

### No Build Step
Do not introduce build tools, bundlers, or transpilers. All code runs directly in the browser or in Node.js (serverless). Keep it vanilla.

### No npm Dependencies
Do not add `package.json` or install npm packages for the core application. The Netlify Functions runtime provides `fetch` natively (Node 18+).

### Single File Frontend
All frontend code lives in `index.html`. Do not split into separate `.js` or `.css` files unless there is a compelling reason — the simplicity is intentional.

### Determinism is Sacred
The coordinate/language/author generation must remain deterministic (same input → same output). Do not introduce randomness into `makeCoords`, `pickLang`, or `pickAuthor`. Randomness belongs only in `seekBook` for the "wander" mode topic selection.

### Borges Aesthetic
The UI reflects Borges' literary style: mysterious, precise, slightly melancholic. Copy changes should preserve this tone. Avoid casual or marketing-speak in UI text.

### Error Handling in Backend
Functions should try multiple content sources before failing. Never return a bare HTTP error — always return `{ error: "..." }` JSON with an appropriate HTTP status code.

### Security Headers
Security headers are configured in `netlify.toml`. Do not remove them:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

---

## Content System Reference

### Genre → Prompt Mapping (generate.js)

```javascript
const GENRE_MAP = {
  cuento:       'un cuento de 400-520 palabras',
  poema:        'un poema de 20-30 versos',
  ensayo:       'un ensayo de 380-480 palabras',
  enciclopedia: 'una entrada enciclopédica de 300-420 palabras',
  fragmento:    'fragmento inicial de novela (400-520 palabras)',
  carta:        'una carta de 280-400 palabras',
  diario:       'entrada de diario íntima (280-400 palabras)',
};
```

### Author Pools (index.html)

Authors are grouped by language style (`hispanic`, `english`, etc.) and selected deterministically per search. Adding new authors: append to the appropriate array in the `authors` object.

### Pre-defined Wander Topics (index.html)

The `topics` array holds 10+ Spanish-language prompts used for random discovery. They follow a poetic, surreal style consistent with Borges.

---

## No Testing Infrastructure

There are currently no automated tests. When testing changes:
- Run `netlify dev` locally
- Test both search modes (directed query and "wander")
- Test all 7 genre types
- Verify real-source retrieval (use academic keywords like "quantum") and AI generation
- Check that non-Spanish content shows the translation block
- Verify fictional languages (Quenya, Klingon, Borgesiano) produce translations

---

## File Reference

| File | Lines | Role |
|------|-------|------|
| `index.html` | ~1051 | Entire frontend: HTML structure, CSS design system, vanilla JS logic |
| `netlify/functions/generate.js` | ~166 | Serverless function: intent classification, content sourcing, Groq calls |
| `netlify.toml` | 10 | Netlify build + headers config |
| `README.md` | ~99 | Human-readable project documentation |
| `CLAUDE.md` | this | AI assistant guide |
