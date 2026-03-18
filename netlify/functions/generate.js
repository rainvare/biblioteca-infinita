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

  const prompt = `Eres un escritor de la Biblioteca Infinita de Borges. Escribe en español únicamente la obra literaria, sin introducciones ni explicaciones.

Reglas estrictas:
- Primera línea: el título solo
- Línea en blanco
- El texto de la obra
- No escribas "Aquí está", "Claro", ni nada fuera de la obra misma
- No incluyas la firma del autor
- Estilo de rainvare: frases cortas, imágenes concretas, sin adornos

La persona busca: "${tema}"

Escribe ${instruction} sobre este tema. Que tenga vida propia.`;

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${HF_TOKEN}`,
        },
        body: JSON.stringify({
          inputs: `<s>[INST] ${prompt} [/INST]`,
          parameters: {
            max_new_tokens: 900,
            temperature: 0.85,
            top_p: 0.92,
            do_sample: true,
            return_full_text: false,
          },
        }),
      }
    );

    const data = await response.json();

    // HF Inference API returns array
    if (Array.isArray(data) && data[0]?.generated_text) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data[0].generated_text.trim() }),
      };
    }

    // Error from HF
    if (data.error) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: data.error }),
      };
    }

    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Respuesta inesperada de HF: ' + JSON.stringify(data).slice(0, 200) }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno: ' + err.message }),
    };
  }
};
