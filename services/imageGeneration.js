// Serviciu generare imagini via Google Gemini 2.0 Flash
// Primește un prompt string, returnează un data URI (base64) gata de afișat

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyDdalOcz4g-VzyaeI7CANlnP5jVFahm8nU";

/**
 * Generează o imagine pe baza promptului și returnează un data URI.
 * @param {string} prompt - descrierea imaginii dorite
 * @returns {Promise<string>} - data URI de forma `data:image/png;base64,...`
 */
export async function generateImage(prompt) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Promptul nu poate fi gol.");
  }

  const body = {
    contents: [
      {
        parts: [
          {
            text: `Generate an image of: ${prompt.trim()}`,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  let response;
  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (networkError) {
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.");
  }

  // Gestionare erori HTTP
  if (response.status === 429) {
    throw new Error("Rate limit depășit. Încearcă din nou în câteva secunde.");
  }
  if (response.status === 400) {
    throw new Error("Cerere invalidă. Modifică promptul și încearcă din nou.");
  }
  if (response.status === 403) {
    throw new Error("Cheie API invalidă sau acces refuzat.");
  }
  if (!response.ok) {
    throw new Error(`Eroare API Gemini (${response.status}). Încearcă din nou.`);
  }

  let json;
  try {
    json = await response.json();
  } catch {
    throw new Error("Răspuns invalid de la server. Încearcă din nou.");
  }

  // Caută partea cu inlineData în lista de parts din răspuns
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData != null);

  if (!imagePart) {
    // Gemini a returnat doar text (safety block sau prompt refuzat)
    const textPart = parts.find((part) => part.text);
    if (textPart?.text) {
      throw new Error(`Imaginea a fost blocată: ${textPart.text.slice(0, 100)}`);
    }
    throw new Error("Gemini nu a generat o imagine. Modifică promptul și încearcă din nou.");
  }

  const { mimeType, data } = imagePart.inlineData;

  // Construiește data URI — base64-ul vine deja encodat din JSON
  return `data:${mimeType};base64,${data}`;
}
