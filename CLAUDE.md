# Claude Code - Instrucciones y Skills

## Skill: analyze-new-repo

Cuando el usuario pida analizar un repositorio (o cuando sea apropiado), seguir este workflow estructurado:

### Workflow de análisis (7 pasos)

1. **Contexto inicial** — Leer `AGENTS.md`, `README`, docs, y git history reciente.
2. **Convenciones** — Revisar `CODEOWNERS`, `CONTRIBUTING`, templates de PR, guías de estilo.
3. **Estructura superficial** — Mapear directorios, entrypoints, configs, scripts (`package.json`, `Makefile`, `pyproject.toml`, etc.).
4. **Flujo de ejecución** — Cómo arranca, construye, testea y despliega el proyecto.
5. **Ruta crítica** — Trazar el entrypoint principal y los módulos clave.
6. **Señales de calidad** — Cobertura de tests, CI/CD, disciplina de dependencias, completitud de docs.
7. **Riesgos** — Docs faltantes, gaps en tests, setup frágil, dependencias sorpresivas.

### Principios guía

- Moverse de la superficie hacia el interior.
- Distinguir hechos confirmados de inferencias (marcarlos explícitamente).
- Escalar la profundidad al tamaño del repo (small / medium / large).
- Ser consciente de monorepos — tratar cada paquete como unidad propia.
- Usar los manifiestos de dependencias para priorizar qué leer.

### Estructura del reporte de salida

Cada reporte debe tener:

1. **Repository Thesis** — Una oración fuerte: propósito real del repo, su principal restricción de diseño, y qué NO es.
2. **2–4 secciones adaptativas** elegidas según la naturaleza del repo:
   - Repository Shape
   - Execution Model
   - Architectural Center of Gravity
   - Project Conventions
   - Quality Signals and Risks
   - Distinctive Design Decisions
   - Unknowns Worth Verifying

Target: 4–6 secciones totales. Compacto y legible de una pasada. Cada afirmación debe citar rutas de archivo específicas.
