// ── HELPERS ──
const GROQ_KEY = () => process.env.GROQ_KEY;

const GENRE_MAP = {
  cuento:        'un cuento de entre 400 y 520 palabras con principio, nudo y desenlace',
  poema:         'un poema de entre 20 y 30 versos en estrofas con ritmo interior deliberado',
  ensayo:        'un ensayo de entre 380 y 480 palabras, filosófico y concreto',
  enciclopedia:  'una entrada enciclopédica de 300–420 palabras de una civilización desconocida',
  fragmento:     'el fragmento inicial de una novela (400–520 palabras) con mundo, personaje y tensión sin resolver',
  carta:         'una carta de 280–400 palabras entre dos personajes ficticios que revele algo irreversible',
  diario:        'una entrada de diario íntima (280–400 palabras) en primera persona con fecha inventada',
};

// Classify search intent
function classifyIntent(tema, genre) {
  const technical = /\b(física|química|biología|matemátic|quantum|algoritmo|neurona|genoma|átomo|relatividad|topología|ecuación|protein|célula|ADN|RNA|machine learning|deep learning|neural|theorem|calculus|geometry|algebra|astro|cosmo|astrofísica|mecánica|termodinámica|electro|óptica|nuclear|partícula|quark|plasma|superconductor|phylo|taxonom|evolu|ecosistema|microbiom)\b/i;
  const literary  = /\b(amor|muerte|sueño|memoria|olvido|tiempo|ciudad|mar|noche|luz|sombra|alma|espejo|laberinto|infinito|biblioteca|libro|palabra|silencio|jardín|lluvia|viento|fuego|río|luna|sol|estrella|poesía|cuento|historia|mito|leyenda)\b/i;
  const poetic    = ['cuento','poema','carta','diario','fragmento'];
  const academic  = ['ensayo','enciclopedia'];

  if (technical.test(tema)) return 'technical';
  if (academic.includes(genre)) return 'academic';
  if (literary.test(tema) || poetic.includes(genre)) return 'creative';
  return 'balanced';
}

// ── SOURCES ──

async function searchGutenberg(tema) {
  try {
    const url = `https://gutendex.com/books/?search=${encodeURIComponent(tema)}&mime_type=text/plain`;
    const res = await fetch(url, { headers: { 'User-Agent': 'BibliotecaBabel/1.0' } });
    const data = await res.json();
    if (!data.results?.length) return null;
    const book = data.results[Math.floor(Math.random() * Math.min(5, data.results.length))];
    const textUrl = Object.values(book.formats || {}).find(u => u.includes('plain') && !u.includes('zip'));
    if (!textUrl) return null;
    const tr = await fetch(textUrl);
    const full = await tr.text();
    const clean = full.replace(/^[\s\S]{0,4000}?\*\*\*/, '').replace(/\r\n/g, '\n').trim();
    const words = clean.split(/\s+/);
    const start = Math.floor(words.length * 0.15);
    const passage = words.slice(start, start + 340).join(' ');
    if (passage.length < 200) return null;
    return {
      title: book.title,
      author: book.authors?.[0]?.name || 'Anónimo',
      lang: book.languages?.[0] || 'en',
      passage,
      source: 'gutenberg',
    };
  } catch { return null; }
}

async function searchArchive(tema, lang = 'spa') {
  try {
    const query = encodeURIComponent(`${tema} language:${lang}`);
    const url = `https://archive.org/advancedsearch.php?q=${query}&fl[]=identifier,title,creator,language&rows=8&page=1&output=json&mediatype=texts`;
    const res = await fetch(url, { headers: { 'User-Agent': 'BibliotecaBabel/1.0' } });
    const data = await res.json();
    const docs = data.response?.docs || [];
    if (!docs.length) return null;
    const doc = docs[Math.floor(Math.random() * Math.min(4, docs.length))];
    // Fetch text
    const textUrl = `https://archive.org/download/${doc.identifier}/${doc.identifier}_djvu.txt`;
    const tr = await fetch(textUrl);
    if (!tr.ok) return null;
    const full = await tr.text();
    const words = full.replace(/\r\n/g, '\n').split(/\s+/).filter(w => w.length > 1);
    if (words.length < 200) return null;
    const start = Math.floor(words.length * 0.1);
    const passage = words.slice(start, start + 300).join(' ');
    return {
      title: doc.title || 'Sin título',
      author: doc.creator || 'Anónimo',
      lang: doc.language || lang,
      passage,
      source: 'archive',
    };
  } catch { return null; }
}

async function searchArxiv(tema) {
  try {
    const query = encodeURIComponent(tema);
    const url = `https://export.arxiv.org/api/query?search_query=all:${query}&start=0&max_results=8&sortBy=relevance`;
    const res = await fetch(url, { headers: { 'User-Agent': 'BibliotecaBabel/1.0' } });
    const xml = await res.text();
    // Parse entries
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    if (!entries.length) return null;
    const entry = entries[Math.floor(Math.random() * Math.min(5, entries.length))][1];
    const title   = (entry.match(/<title>([\s\S]*?)<\/title>/))?.[1]?.trim() || 'Sin título';
    const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/))?.[1]?.trim() || '';
    const author  = (entry.match(/<name>([\s\S]*?)<\/name>/))?.[1]?.trim() || 'Anónimo';
    if (summary.length < 100) return null;
    return {
      title,
      author,
      lang: 'en',
      passage: summary,
      source: 'arxiv',
    };
  } catch { return null; }
}

// ── GROQ ──
async function groqGenerate(prompt) {
  const key = GROQ_KEY();
  if (!key) throw new Error('GROQ_KEY no configurado.');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1400,
      temperature: 0.88,
      top_p: 0.92,
      messages: [
        { role: 'system', content: 'Eres un escritor de la Biblioteca de Babel. Sigues instrucciones con precisión absoluta. Nunca escribas introducciones ni cierres fuera de la obra.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// Translate a passage via Groq
async function translatePassage(text, fromLang) {
  if (fromLang === 'es' || fromLang === 'spa') return null;
  const prompt = `Traduce al español de forma literaria y fluida este fragmento. Solo la traducción, sin explicaciones ni comillas:\n\n${text.slice(0, 1000)}`;
  try { return await groqGenerate(prompt); }
  catch { return null; }
}

// ── DECISION ENGINE ──
async function resolveBook(tema, genre, lang, author) {
  const intent = classifyIntent(tema, genre);

  // Custom prompt (passed directly from frontend)
  // This path is for translation-only calls
  return null; // handled below in handler
}

// ── HANDLER ──
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido.' }) }; }

  const { tema, genre, prompt, lang, author } = body;

  // ── PATH A: direct prompt (translation, custom calls) ──
  if (prompt) {
    try {
      const text = await groqGenerate(prompt);
      return ok({ text });
    } catch (e) {
      return err(e.message);
    }
  }

  if (!tema && !genre) {
    return err('Faltan parámetros.');
  }

  const intent = classifyIntent(tema || '', genre || 'cuento');
  const isFictionalLang = lang?.fictional || false;
  const isCreativeGenre = ['cuento','poema','carta','diario','fragmento'].includes(genre);
  const isAcademicGenre = ['ensayo','enciclopedia'].includes(genre);

  // ── DECISION TREE ──
  let result = null;

  if (intent === 'technical' || isAcademicGenre) {
    // Try arXiv first, then Gutenberg, then generate
    result = await searchArxiv(tema);
    if (!result) result = await searchGutenberg(tema);

  } else if (intent === 'creative' || isCreativeGenre) {
    // Mostly generate, occasionally Gutenberg for variety
    const roll = Math.random();
    if (roll < 0.3) result = await searchGutenberg(tema);
    // else: generate below

  } else {
    // balanced: try Gutenberg + Archive, fallback to generate
    const roll = Math.random();
    if (roll < 0.25)      result = await searchGutenberg(tema);
    else if (roll < 0.40) result = await searchArchive(tema, 'spa');
    else if (roll < 0.50) result = await searchArxiv(tema);
    // else: generate
  }

  // ── PATH B: real text found ──
  if (result) {
    const translText = await translatePassage(result.passage, result.lang);
    const finalText = translText
      ? `${result.title}\n\n${result.passage}\n\n— Traducción —\n\n${translText}`
      : `${result.title}\n\n${result.passage}`;
    return ok({ text: finalText, author: result.author, isReal: true });
  }

  // ── PATH C: Groq generation ──
  const instruction = GENRE_MAP[genre] || GENRE_MAP.cuento;
  const langName = lang?.name || 'español';
  const langCode = lang?.code || 'es';

  let langInstr;
  if (isFictionalLang) {
    langInstr = `Escribe en ${langName}. Si es Borgesiano, inventa un sistema de símbolos y grafemas consistentes y hermosos. Incluye traducción al español separada por la línea exacta: — Traducción —`;
  } else if (langCode === 'es') {
    langInstr = 'Escribe en español.';
  } else {
    langInstr = `Escribe en ${langName}. Incluye traducción al español separada por la línea exacta: — Traducción —`;
  }

  const finalPrompt = `Eres un escritor de la Biblioteca de Babel. Tu nombre de autor es ${author || 'el bibliotecario'}.

REGLAS ABSOLUTAS:
- Primera línea: solo el título
- Segunda línea: en blanco
- Resto: el texto de la obra
- ${langInstr}
- Sin introducciones, sin "Aquí tienes", sin firmas al final

La persona busca: "${tema}"
Escribe ${instruction} sobre este tema. Que tenga vida propia.`;

  try {
    const text = await groqGenerate(finalPrompt);
    return ok({ text, isReal: false });
  } catch (e) {
    return err(e.message);
  }
};

function ok(data)  { return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }; }
function err(msg)  { return { statusCode: 502, body: JSON.stringify({ error: msg }) }; }
