const HF_API_KEY = process.env.EXPO_PUBLIC_HF_API_KEY;
const HF_MODEL = "black-forest-labs/FLUX.1-schnell";

// Manual base64 encoder — does NOT use btoa() which breaks in Hermes for bytes > 127
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out.push(
      B64[b0 >> 2],
      B64[((b0 & 3) << 4) | (b1 >> 4)],
      i + 1 < bytes.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : "=",
      i + 2 < bytes.length ? B64[b2 & 63] : "=",
    );
  }
  return out.join("");
}

export async function generateAiPoster(prompt: string): Promise<string> {
  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { width: 256, height: 256 },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Generare eșuată (${response.status}): ${text}`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) throw new Error("Răspuns gol de la server");

  const base64 = toBase64(buffer);
  const contentType = response.headers.get("content-type") ?? "image/png";
  return `data:${contentType};base64,${base64}`;
}
