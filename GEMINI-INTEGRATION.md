# Gemini AI Image Generation - Integration Guide

After pulling from remote, apply these changes to get AI poster generation working.

---

## 1. Add API key to `.env`

Add this line at the end of your `.env` file:

```
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyCdghDf2v-Wvocz2r132C64Cf__V-YxUYU
```

---

## 2. Replace `lib/ai-gen.ts`

Replace the entire file with:

```ts
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
```

---

## 3. Fix `components/AiPosterModal.tsx`

Change the import at the top from:

```ts
import { Image } from "expo-image";
```

to:

```ts
// Use RN's built-in Image — expo-image chokes on large base64 data URIs
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Image,
} from "react-native";
```

(Remove the separate `expo-image` import line entirely, and add `Image` to the `react-native` import.)

Then in the `<Image>` component, change `contentFit="contain"` to `resizeMode="contain"`.

---

## Summary of what changed vs the old version

| What | Old | New |
|------|-----|-----|
| Model | `gemini-2.0-flash-preview-image-generation` | `gemini-2.5-flash-image` |
| API key | Hardcoded leaked key | Env var with fallback |
| Timeout | None (hung forever) | 60s AbortController |
| Empty key check | None | Throws clear error |
| Image rendering | `expo-image` | RN built-in `Image` |

---

## Notes

- Model `gemini-2.0-flash` does NOT support image generation — only `gemini-2.5-flash-image` does
- The free tier allows 500 RPM / 2K RPD — more than enough
- Image generation takes ~10-30 seconds per request
- Billing must be enabled on Google Cloud for the API to work
