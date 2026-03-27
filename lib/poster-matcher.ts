// lib/poster-matcher.ts
// ============================================
// POSTER MATCHER — Identifies which poster the user photographed
// ============================================
// Uses Anthropic Claude Vision API to match a captured photo
// against our catalog of 9 known posters.
//
// Strategy: We send detailed text descriptions of each poster
// (not images — too expensive per call). Claude Vision analyzes
// the captured photo and matches it against descriptions.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "";

export const VALID_POSTER_IDS = [
  "afis1", "afis2", "afis3", "afis4", "afis5",
  "afis6", "afis7", "afis8", "afis9", "afis10",
] as const;

// Catalog of all posters with unique identifying features
const POSTER_CATALOG = `
You are a poster identification system. You will receive a photo taken by a phone camera showing a physical poster on a wall. Your job is to identify which poster it is from this catalog:

POSTER CATALOG:
- afis2: "Digital Marketing Agency" poster with RED color scheme. Has 3 circular photo frames on the LEFT side (woman with tablet, desk overhead, man with icons). White background, red circles, bullet points listing "App Development, Creative Designs, Facebook Boosting, Agency". Phone number +123-456-7891. <itec> logo top right.
- afis3: "DIGITAL MARKETING AGENCY" poster with PURPLE/VIOLET color scheme. Large curved white shape over purple background. Photo of 2 men in circular frame on left. "SERVICES" section at bottom with "Content Writing" and "App Development". Red "JOIN US" button. Phone +000 1234 5678.
- afis4: RED background poster with a red soda/beverage CAN with <itec> logo on it. Text says "Creează fără limite!" in white bold text. Entirely red theme.
- afis5: BURGER poster. Top half is dark/black with overhead food photography (burger, bun, ketchup, spatula). Bottom half is cream/beige with sketched food illustrations. Text "Best Burger in Town" in red. <itec> logo at top center.
- afis6: ARCHITECTURE poster with black & white building photo on right side. NEON YELLOW-GREEN blobs/circles as accents. Bold black text "FORM FOLLOWS FUNCTION, BEAUTY FOLLOWS PASSION". Subtitle "BRINGING ART TO ARCHITECTURE". Light gray background.
- afis7: TRAVEL poster. "EXPLORE THE WORLD" in large white text. Dark blue/navy background. 4 vertical photo strips showing travelers (backpacker, snowy mountains, beach swimmer, road traveler). "PACKAGES" section listing Air Tickets, Visa Services, etc. <itec> logo at bottom center.
- afis8: FASHION poster. Hot PINK/MAGENTA background. "Fashion" in large serif at top, "BusinesS" in large serif at bottom. Woman in pink sweater and beige pants posing center. Black organic blob shapes behind her. Text "March 2023", "Full Time", "@fbb23". <itec> logo on right side vertical.
- afis9: SNEAKER poster. BLUE background. Blue athletic shoe prominently displayed. Text "EXCLUSIVE EDITION SNEAKERS" in large white outline text. "50% DISCOUNT" in yellow/white. <itec> logo at bottom center.
- afis10: YELLOW banner at top with <itec> logo in black. Below: woman with sunglasses posing, wearing light blue fuzzy sweater. Dark gray/black background behind her. Very striking yellow-on-black contrast at top.

RULES:
1. Respond with ONLY the poster ID (e.g., "afis7"). Nothing else.
2. If you cannot identify the poster or it doesn't match any in the catalog, respond with "unknown".
3. The photo may be taken at an angle, with varying lighting, or partially obscured. Focus on dominant colors, text, and layout.
4. Multiple copies of the same poster may exist — always return the same ID regardless of physical location.
`;

export interface MatchResult {
  posterId: string;
  confidence: "high" | "low";
  error?: string;
}

export async function matchPoster(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" = "image/jpeg"
): Promise<MatchResult> {
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: POSTER_CATALOG,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("API error:", response.status, errorData);
      return {
        posterId: "unknown",
        confidence: "low",
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const answer = data.content?.[0]?.text?.trim().toLowerCase() || "unknown";

    const validIds = VALID_POSTER_IDS;

    // Extract poster ID from response (might have extra text)
    const matchedId = validIds.find((id) => answer.includes(id));

    if (matchedId) {
      return { posterId: matchedId, confidence: "high" };
    }

    return { posterId: "unknown", confidence: "low" };
  } catch (error) {
    console.error("Poster matching error:", error);
    return {
      posterId: "unknown",
      confidence: "low",
      error: String(error),
    };
  }
}

// Human-readable names for each poster (used in UI)
export const POSTER_NAMES: Record<string, string> = {
  afis2: "Digital Marketing (Roșu)",
  afis3: "Digital Marketing (Violet)",
  afis4: "Creează fără limite",
  afis5: "Best Burger in Town",
  afis6: "Form Follows Function",
  afis7: "Explore the World",
  afis8: "Fashion Business",
  afis9: "Exclusive Sneakers",
  afis10: "itec Yellow",
};
