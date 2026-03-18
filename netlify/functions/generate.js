exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'HF_TOKEN no configurado en Netlify.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido.' }) };
  }

  const { tema, genre } = body;
  if (!tema || !genre) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Faltan parámetros.' }) };
  }

  const genreInstructions = {
    'cuento': 'un cuento corto de entre 350 y 500 palabras con principio, nudo y desenlace',
    'poema': 'un poema de entre 18 y 28 versos, estructurado en estrofas, con ritmo y musicalidad deliberada',
    'ensayo': 'un ensayo reflexivo de entre 350 y 450 palabras que explore el tema desde una perspectiva filosófica o poética',
    'fragmento de novela': 'el fragmento inicial de una novela: entre 350 y 500 palabras que establezcan mundo, personaje y tensión narrativa',
    'carta': 'una carta de entre 250 y 380 palabras, con destinatario y remitente ficticios, que revele algo profundo sobre el tema',
    'entrada de diario': 'una entrada de diario de entre 280 y 400 palabras, íntima y en primera persona, con fecha inventada',
  };

  const instruction = genreInstructions[genre] || genreInstructions['cuento'];

  const systemPrompt = `Eres un escritor de la Biblioteca Infinita de Borges. Cada texto que escribes tiene la firma de "rainvare" — una autora que escribe con precisión técnica y sensibilidad literaria, frases cortas y directas, sin adornos innecesarios, con imágenes concretas y finales que resuenan.

IMPORTANTE:
- Escribe SOLO la obra literaria. Sin introducción, sin explicación, sin comillas envolventes.
- Comienza con el título (una línea sola), luego línea en blanco, luego el texto.
- No incluyas la firma ni el nombre del autor.
- El texto debe sentirse como si siempre hubiera existido en un volumen olvidado de esta biblioteca.
- Escribe en español.`;

  const userPrompt = `La persona busca: "${tema}"\n\nEscribe ${instruction} sobre este tema, en el estilo de rainvare. Que tenga vida propia.`;

  try {
    const response = await fetch('https://router.huggingface.co/novita/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_TOKEN}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen2.5-72b-instruct',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: data.error.message || 'Error de HF API.' }),
      };
    }

    const text = data.choices?.[0]?.message?.content || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del proxy: ' + err.message }),
    };
  }
};
