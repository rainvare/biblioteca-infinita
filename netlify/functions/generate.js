exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GROQ_KEY no configurado.' }) };
  }
  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido.' }) }; }

  // Accept either a custom prompt or build one from tema+genre
  const { tema, genre, prompt } = body;
  const finalPrompt = prompt || buildPrompt(tema, genre);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1400,
        temperature: 0.88,
        top_p: 0.92,
        messages: [
          { role: 'system', content: 'Eres un escritor de la Biblioteca de Babel. Sigues instrucciones con precisión absoluta.' },
          { role: 'user', content: finalPrompt },
        ],
      }),
    });
    const data = await res.json();
    if (data.error) return { statusCode: 502, body: JSON.stringify({ error: data.error.message }) };
    const text = data.choices?.[0]?.message?.content || '';
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

function buildPrompt(tema, genre) {
  const map = {
    cuento: 'un cuento de entre 400 y 520 palabras con principio, nudo y desenlace',
    poema: 'un poema de entre 20 y 30 versos en estrofas',
    ensayo: 'un ensayo de entre 380 y 480 palabras, filosófico y concreto',
    enciclopedia: 'una entrada enciclopédica de entre 300 y 420 palabras de una civilización desconocida',
    'fragmento de novela': 'el fragmento inicial de una novela (400–520 palabras)',
    carta: 'una carta de entre 280 y 400 palabras entre dos personajes ficticios',
    'entrada de diario': 'una entrada de diario íntima de 280–400 palabras',
  };
  const inst = map[genre] || map.cuento;
  return `Escribe únicamente ${inst} sobre: "${tema}". Primera línea: título. Línea en blanco. Luego el texto. Sin introducciones ni firmas.`;
}
