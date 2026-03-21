const GENRE_MAP = {
  cuento:       'un cuento de entre 400 y 520 palabras con principio, nudo y desenlace',
  poema:        'un poema de entre 20 y 30 versos en estrofas con ritmo interior deliberado',
  ensayo:       'un ensayo de entre 380 y 480 palabras, filosófico y concreto',
  enciclopedia: 'una entrada enciclopédica de 300–420 palabras de una civilización desconocida',
  fragmento:    'el fragmento inicial de una novela (400–520 palabras) con mundo, personaje y tensión sin resolver',
  carta:        'una carta de 280–400 palabras entre dos personajes ficticios que revele algo irreversible',
  diario:       'una entrada de diario íntima (280–400 palabras) en primera persona con fecha inventada',
};

function classifyIntent(tema, genre) {
  const technical = /\b(física|química|biología|matemátic|quantum|algoritmo|neurona|genoma|átomo|relatividad|topología|ecuación|proteína|célula|ADN|RNA|machine learning|neural|theorem|calculus|geometry|algebra|astro|cosmo|mecánica|termodinámica|electro|óptica|nuclear|partícula|quark|plasma|superconductor|evolu|ecosistema|microbiom|physics|chemistry|biology|mathematics|algorithm|genome|protein|molecule|evolution)\b/i;
  if (technical.test(tema) || genre === 'ensayo' || genre === 'enciclopedia') return 'academic';
  return 'creative';
}

async function groqGenerate(prompt) {
  const key = process.env.GROQ_KEY;
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
        { role: 'system', content: 'Eres un escritor de la Biblioteca de Babel. Sigues instrucciones con precisión absoluta. Nunca escribas introducciones ni texto fuera de la obra misma.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq devolvió respuesta vacía');
  return text;
}

async function searchGutenberg(tema) {
  try {
    const url = `https://gutendex.com/books/?search=${encodeURIComponent(tema)}&mime_type=text/plain`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (!data.results?.length) return null;
    const book = data.results[Math.floor(Math.random() * Math.min(5, data.results.length))];
    const textUrl = Object.values(book.formats || {}).find(u => u.includes('plain') && !u.includes('zip'));
    if (!textUrl) return null;
    const tr = await fetch(textUrl, { signal: AbortSignal.timeout(10000) });
    const full = await tr.text();
    const clean = full.replace(/^[\s\S]{0,4000}?\*\*\*/, '').replace(/\r\n/g, '\n').trim();
    const words = clean.split(/\s+/);
    if (words.length < 200) return null;
    const start = Math.floor(words.length * 0.15);
    const passage = words.slice(start, start + 340).join(' ');
    return { title: book.title, author: book.authors?.[0]?.name || 'Anónimo', lang: book.languages?.[0] || 'en', passage };
  } catch { return null; }
}

async function searchArxiv(tema) {
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(tema)}&start=0&max_results=6&sortBy=relevance`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const xml = await res.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    if (!entries.length) return null;
    const entry = entries[Math.floor(Math.random() * Math.min(4, entries.length))][1];
    const title   = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim().replace(/\n/g,' ') || 'Sin título';
    const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim() || '';
    const author  = entry.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim() || 'Anónimo';
    if (summary.length < 80) return null;
    return { title, author, lang: 'en', passage: summary };
  } catch { return null; }
}

async function translatePassage(text, fromLang) {
  if (!fromLang || fromLang === 'es' || fromLang === 'spa') return null;
  try {
    return await groqGenerate(
      `Traduce al español de forma literaria y fluida. Solo la traducción, sin explicaciones:\n\n${text.slice(0, 900)}`
    );
  } catch { return null; }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return err('Body inválido.'); }

  const { tema, genre, prompt, lang, author } = body;

  // PATH A: direct prompt (translation calls)
  if (prompt) {
    try { return ok({ text: await groqGenerate(prompt) }); }
    catch (e) { return err(e.message); }
  }

  if (!tema) return err('Falta el tema.');

  const intent = classifyIntent(tema, genre || 'cuento');
  const isFictional = lang?.fictional || false;
  const langCode = lang?.code || 'es';
  const langName = lang?.name || 'español';
  const authorName = author || 'el bibliotecario';

  // PATH B: try real sources based on intent
  let found = null;

  if (intent === 'academic') {
    found = await searchArxiv(tema);
    if (!found) found = await searchGutenberg(tema);
  } else {
    // creative — 30% chance of Gutenberg, rest generated
    if (Math.random() < 0.30) found = await searchGutenberg(tema);
  }

  if (found) {
    const translation = await translatePassage(found.passage, found.lang);
    const text = translation
      ? `${found.title}\n\n${found.passage}\n\n— Traducción —\n\n${translation}`
      : `${found.title}\n\n${found.passage}`;
    return ok({ text, author: found.author });
  }

  // PATH C: Groq generation — always in Spanish internally, translated if needed
  const instruction = GENRE_MAP[genre] || GENRE_MAP.cuento;

  let langInstr;
  if (isFictional) {
    langInstr = `Escribe en ${langName}. Si es Borgesiano, inventa símbolos consistentes y hermosos. SIEMPRE incluye la traducción al español separada por esta línea exacta: — Traducción —`;
  } else if (langCode === 'es') {
    langInstr = 'Escribe en español.';
  } else {
    langInstr = `Escribe en ${langName}. SIEMPRE incluye la traducción al español separada por esta línea exacta: — Traducción —`;
  }

  const finalPrompt =
`Eres un escritor de la Biblioteca de Babel. Tu nombre de autor es ${authorName}.

REGLAS — SIGUE EXACTAMENTE:
1. Primera línea: solo el título (sin "Título:", sin comillas)
2. Segunda línea: en blanco
3. El texto de la obra
4. ${langInstr}
5. Nada fuera de la obra: sin "Aquí tienes", sin saludos, sin firmas

La persona busca: "${tema}"
Escribe ${instruction} sobre este tema. Que tenga vida propia.`;

  try {
    const text = await groqGenerate(finalPrompt);
    return ok({ text });
  } catch (e) {
    return err(e.message);
  }
};

function ok(data) { return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }; }
function err(msg) { return { statusCode: 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: msg }) }; }
                                     
