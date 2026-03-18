exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GROQ_KEY no configurado en Netlify.' }),
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido.' }) }; }

  const { tema, genre } = body;
  if (!tema || !genre) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Faltan parámetros.' }) };
  }

  const genreMap = {
    'cuento':             'un cuento de entre 400 y 520 palabras con principio, nudo y desenlace',
    'poema':              'un poema de entre 20 y 30 versos en estrofas, con ritmo interior deliberado',
    'ensayo':             'un ensayo de entre 380 y 480 palabras, filosófico y concreto',
    'fragmento de novela':'el fragmento inicial de una novela (400–520 palabras) que establezca mundo, personaje y tensión sin resolverla',
    'carta':              'una carta de entre 280 y 400 palabras entre dos personajes ficticios que revele algo irreversible',
    'entrada de diario':  'una entrada de diario (280–400 palabras) íntima, en primera persona, con fecha inventada y un secreto implícito',
  };

  const instruction = genreMap[genre] || genreMap['cuento'];

  const systemPrompt = `Eres un escritor de la Biblioteca Infinita de Borges. Tu nombre de autor es rainvare.

REGLAS ABSOLUTAS:
- Escribe ÚNICAMENTE la obra literaria. Nada más.
- Primera línea: solo el título (sin comillas, sin "Título:")
- Segunda línea: en blanco
- Resto: el texto de la obra
- Cero introducciones, cero explicaciones, cero "Aquí tienes", cero firma al final
- Idioma: español
- Estilo rainvare: frases cortas, imágenes concretas, sin adornos, finales que resuenan`;

  const userPrompt = `La persona busca: "${tema}"\nEscribe ${instruction} sobre este tema. Que tenga vida propia.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1200,
        temperature: 0.88,
        top_p: 0.92,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
      }),
    });

    const data = await res.json();

    if (data.error) {
      return { statusCode: 502, body: JSON.stringify({ error: data.error.message || JSON.stringify(data.error) }) };
    }

    const text = data.choices?.[0]?.message?.content || '';
    if (!text) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Respuesta vacía de Groq.' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno: ' + err.message }),
    };
  }
};
      
