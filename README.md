# La Biblioteca de Babel

Una experiencia literaria interactiva inspirada en el cuento de Jorge Luis Borges (1941).

Explora una biblioteca infinita donde cada búsqueda invoca una obra que siempre existió — generada o encontrada según lo que busques.

**[→ Ver en vivo](https://biblioteca-infinita.netlify.app)**

---

## Qué hace

Cada vez que el viajero busca algo, la biblioteca decide cómo responder:

- **Búsquedas técnicas o académicas** → busca primero en arXiv (papers científicos) o Project Gutenberg, luego genera si no encuentra
- **Búsquedas literarias o poéticas** → genera una obra nueva con Groq (Llama 3.3 70B), con 30% de probabilidad de traer un texto real de Gutenberg
- **"Dejarme perder"** → tema y fuente completamente aleatorios

Las obras pueden aparecer en 15 idiomas reales (español, inglés, francés, japonés, árabe, latín, chino...) y 3 ficticios (Quenya, Klingon, Borgesiano). Cuando el texto no está en español, se incluye traducción literaria generada automáticamente.

Cada búsqueda produce coordenadas deterministas: la misma pregunta siempre encuentra la misma sala.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JS vanilla — sin frameworks |
| Tipografía | Playfair Display · Lora · DM Sans |
| Backend / proxy | Netlify Functions (Node.js) |
| Generación | Groq API — `llama-3.3-70b-versatile` |
| Textos reales | Project Gutenberg via `gutendex.com` · arXiv API |
| Deploy | Netlify (GitHub CI/CD) |

---

## Estructura

```
biblioteca-infinita/
├── index.html                    # Frontend completo
├── netlify.toml                  # Configuración de deploy
└── netlify/
    └── functions/
        └── generate.js           # Proxy + lógica de decisión de fuentes
```

---

## Variables de entorno

Configurar en **Netlify → Site configuration → Environment variables**:

| Variable | Descripción |
|---|---|
| `GROQ_KEY` | API key de [Groq](https://console.groq.com) — gratuita, sin tarjeta |

---

## Deploy

### Netlify (recomendado)

1. Fork o clona este repositorio
2. Conecta el repo en [netlify.com](https://netlify.com) → *Add new site → Import from Git*
3. Netlify detecta el `netlify.toml` automáticamente
4. Agrega la variable `GROQ_KEY` en *Site configuration → Environment variables*
5. Redespliega — listo

### Local

```bash
npm install -g netlify-cli
netlify dev
```

Requiere un archivo `.env` en la raíz con `GROQ_KEY=gsk_...`

---

## Fuentes de texto

- **[Project Gutenberg](https://www.gutenberg.org)** — literatura de dominio público, vía [Gutendex API](https://gutendex.com)
- **[arXiv](https://arxiv.org)** — preprints científicos, vía API pública sin autenticación
- **Groq / Llama 3.3 70B** — generación de obras nuevas cuando las fuentes reales no encuentran nada relevante, y para traducciones

Todas las fuentes son de acceso libre y uso permitido para proyectos no comerciales.

---

## Créditos

Basado en el cuento *La Biblioteca de Babel* de **Jorge Luis Borges**, publicado en *El jardín de senderos que se bifurcan* (1941) y luego en *Ficciones* (1944).

> "El universo (que otros llaman la Biblioteca) se compone de un número indefinido, y tal vez infinito, de galerías hexagonales."

Construido por **[rainvare](https://github.com/rainvare)**.
