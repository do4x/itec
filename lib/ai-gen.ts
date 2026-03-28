// Generare imagini AI via Google Gemini 2.0 Flash
// Returnează un data URI (base64) care se afișează direct în expo-image

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=AIzaSyDdalOcz4g-VzyaeI7CANlnP5jVFahm8nU";

export async function generateAiPoster(prompt: string): Promise<string> {
  const body = {
    contents: [
      {
        parts: [
          { text: `Generate an image of: ${prompt.trim()}` },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  let response: Response;
  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.");
  }

  if (response.status === 429) {
    throw new Error("Rate limit depășit. Încearcă din nou în câteva secunde.");
  }
  if (!response.ok) {
    throw new Error(`Eroare API Gemini (${response.status}). Încearcă din nou.`);
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    throw new Error("Răspuns invalid de la server. Încearcă din nou.");
  }

  const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData != null);

  if (!imagePart) {
    const textPart = parts.find((p) => p.text);
    if (textPart?.text) {
      throw new Error(`Imaginea a fost blocată: ${textPart.text.slice(0, 80)}`);
    }
    throw new Error("Gemini nu a generat o imagine. Modifică promptul și încearcă din nou.");
  }

  const { mimeType, data } = imagePart.inlineData;

  // Base64-ul vine gata encodat din JSON — construim doar data URI-ul
  return `data:${mimeType};base64,${data}`;
}
