// Generare imagini AI via Google Gemini 2.5 Flash Image
// Returnează un data URI (base64) care se afișează direct în expo-image

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "AIzaSyCdghDf2v-Wvocz2r132C64Cf__V-YxUYU";

export async function generateAiPoster(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Cheia API Gemini lipsește. Adaugă EXPO_PUBLIC_GEMINI_API_KEY în .env și restartează Expo.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`;

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new Error("Eroare de rețea. Verifică conexiunea la internet.");
  } finally {
    clearTimeout(timeout);
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
