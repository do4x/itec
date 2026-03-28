# iTEC OVERRIDE — 21h Sprint Plan

## Context
Hackathon cu deadline in ~21h. App-ul are deja: home screen, tab navigation (Map/Scan/Feed), canvas cu SVG strokes + GIF stickers + anthems, poster scanning cu Claude Vision, Firebase RTD sync. Trebuie sa adaugam: pixel grid canvas (r/place style), token system, auth, AI image gen, GPS grid map cu locatii reale, leaderboard, notifications + glitch.

**Denis** = Map UI, GPS location, general UI/UX, animations, prompt engineering, out-of-the-box thinking
**Andrei** = Pixel Grid + Canvas Vector components, game logic, backend, Firebase

---

## Execution Order (6 faze)

### FAZA 0 — Foundation (h0-h1) | BLOCHEAZA TOTUL
**Andrei: Firebase Anonymous Auth + PixelGrid component**
**Denis: GPS Grid Map component (custom dark grid, nu Google Maps)**

### FAZA 1 — Core Systems (h1-h5)
**Andrei: Token system + Canvas refactor (SVG→PixelGrid) + Firebase pixel sync**
**Denis: Map UI cu pin-uri poster, user location tracking, leaderboard pe map**

### FAZA 2 — Features (h5-h9)
**Andrei: Graffiti library + Territory engine rewrite + Jury mode**
**Denis: AI poster modal UI + Token display UI + Scanner polish**

### FAZA 3 — AI + Social (h9-h13)
**Andrei: AI gen backend + Notification engine + Activity feed Firebase**
**Denis: Notification toast UI + Glitch animation + Feed UI enhancement**

### FAZA 4 — Polish (h13-h17)
**Andrei: Firebase optimization + Security rules + Edge cases**
**Denis: UI consistency pass + Empty states + Haptics + Animations**

### FAZA 5 — Final (h17-h21)
**Both: Integration testing, bug fixes, demo prep, seed data**

---

## Parallel Work Split (detaliat)

| Ora | Denis (Map / UI / GPS) | Andrei (Canvas / Game Logic / Firebase) |
|-----|------------------------|----------------------------------------|
| 0-1 | GPS Grid Map: `components/GridMap.tsx` — dark grid cu pin-uri, expo-location | Auth: `lib/auth.ts` + `components/PixelGrid.tsx` — grid 40x40 SVG |
| 1-3 | Map screen refactor: inlocuieste lista cu GridMap, user pin, poster pins | `lib/tokens.ts` + Canvas refactor: SVG strokes → PixelGrid |
| 3-5 | Map: poster info popup la tap pe pin, territory bars, leaderboard | Pixel Firebase sync: write/read, token integration, color picker |
| 5-7 | `components/AiPosterModal.tsx` + `components/TokenDisplay.tsx` | `constants/graffiti-patterns.ts` + `components/GraffitiPicker.tsx` + batch writes |
| 7-9 | Scanner polish: animated brackets, success/fail animations | Territory engine: calcul din pixeli + Jury mode Firebase |
| 9-11 | AI poster modal: loading, preview, placement UI | AI gen backend: Pollinations.ai + save in Firebase |
| 11-13 | `components/NotificationToast.tsx` + glitch shake (reanimated) | `lib/notifications.ts` + pixel overwrite detection + `/activity/` |
| 13-15 | Feed UI: notification types, destructive vs constructive styling | Feed backend: citeste din `/activity/` cu `limitToLast(50)` |
| 15-17 | UI polish: tema, empty states, haptics, responsive | Firebase optimization, race conditions, security rules |
| 17-21 | Demo flow, final animations, screen recordings | E2E testing, seed Firebase, jury code prep, bug fixes |

**Regula merge conflicts**: Andrei DETINE `lib/`, `components/PixelGrid.tsx`, `components/GraffitiPicker.tsx`, `app/canvas/[posterId].tsx`. Denis DETINE `app/(tabs)/`, `components/GridMap.tsx`, restul `components/`. Nu editati acelasi fisier simultan.

---

## GPS Grid Map Architecture (NOU)

Inspiratie: dark grid cu pin-uri (vezi imaginea de referinta). NU Google Maps.

- **Component**: `components/GridMap.tsx` — custom View cu grid lines pe background dark
- **GPS**: `expo-location` — `watchPositionAsync()` pt pozitia userului in real-time
- **Poster locations**: hardcoded lat/lng pentru fiecare afis fizic (coordonate reale din locatie)
- **Proiectie**: conversie simpla lat/lng → x,y pe grid relativ la bounding box al tuturor posterelor
- **Pin-uri**: poster pins = patrate/dreptunghiuri pe grid (stil cyberpunk), user pin = marker verde animat
- **Culoare pin**: alb = necucerit, culoarea echipei dominante = cucerit
- **Tap pe pin**: popup cu info poster (territory bars, leaderboard, "LIVE" badge)
- **"LIVE" indicator**: verde pulsing cand useri activi pe poster
- **Bottom**: locatie curenta text + coordonate (stil terminal/mono)

```typescript
// constants/poster-locations.ts
export const POSTER_LOCATIONS = [
  { id: "afis1", name: "Boost Your Social Presence", lat: 46.XXX, lng: 21.XXX, emoji: "📱" },
  { id: "afis2", name: "Digital Marketing (Red)", lat: 46.XXX, lng: 21.XXX, emoji: "📱" },
  // ... afis3-afis10
];
```

Nota: Coordonatele exacte se pun cand stiti locatiile fizice ale afiselor.

---

## Firebase Schema (final)

```
/users/{uid}/
  username: string
  teamId: "red"|"blue"|"green"|"yellow"
  tokens: number (start: 100, max: 2000)
  lastTokenGrant: serverTimestamp
  joinedAt: serverTimestamp
  isJury: boolean

/posters/{posterId}/
  pixels/
    {row_col}/              # ex: "12_25"
      color: string         # hex
      teamId: string
      username: string
      uid: string
      t: serverTimestamp
  gifs/
    {pushId}/
      url: string
      x, y, scale, rotation: number
      teamId, username, uid: string
      type: "gif" | "ai_poster"
  anthem/
    url: string
    teamId: string
    uid: string

/activity/
  {pushId}/
    type: "pixel"|"pixel_override"|"graffiti"|"gif"|"ai_poster"|"anthem"|"territory_change"
    username, teamId, posterId: string
    targetUsername?: string
    targetTeamId?: string
    timestamp: serverTimestamp

/config/
  juryCode: "ITEC2026JURY"   # setat manual in Firebase Console
```

---

## Pixel Grid Architecture

- **Rezolutie**: 40x40 = 1,600 celule (canvas patrat)
- **Cell size**: `CANVAS_SIZE / 40` (~8.7px pe 350px canvas)
- **Rendering**: SVG `<Rect>` elements cu `React.memo` (react-native-svg in deps)
- **Touch**: `onTouchStart`/`onTouchMove` pe overlay View, `Math.floor(y/CELL_SIZE)` → row/col
- **Firebase write**: `set(ref(db, 'posters/${id}/pixels/${r}_${c}'), { color, teamId, uid, t })`
- **Firebase read**: `onChildAdded` + `onChildChanged` pe `posters/{id}/pixels/`
- **Erase**: `remove(ref(db, 'posters/${id}/pixels/${r}_${c}'))` — costa 10 tokens

---

## Token Costs

| Actiune | Cost |
|---------|------|
| Pixel colorat | 10 |
| Pixel sters | 10 |
| Graffiti stamp | 50 |
| GIF/Sticker | 100 |
| AI Poster generat | 150 |
| Set anthem (echipa #1 only) | 100 |
| Sterge GIF altui user | 150 |
| Sterge AI Poster altui user | 200 |

- Start: 100 tokens | Regen: +20/minut online, cap 2000 | Jury: 2000 instant cu cod

---

## AI Image Generation

**API: Pollinations.ai** — gratuit, fara API key, fara signup.
```
GET https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&nologo=true
```
- URL-ul returnat E imaginea (redirect la PNG generat)
- Save URL in Firebase ca GIF cu `type: "ai_poster"`
- Refoloseste `GifStickerItem` component (deja are pan/pinch/rotate)
- Cost: 150 tokens

---

## Fisiere de CREAT

| Fisier | Owner | Descriere |
|--------|-------|-----------|
| `lib/auth.ts` | Andrei | Anonymous auth, UID, session restore |
| `lib/tokens.ts` | Andrei | `useTokens()` hook, spend/earn, Firebase transactions |
| `lib/notifications.ts` | Andrei | Pixel overwrite detection, activity write |
| `lib/ai-gen.ts` | Andrei | Pollinations.ai helper function |
| `components/PixelGrid.tsx` | Andrei | Grid renderer SVG + touch handler |
| `components/GraffitiPicker.tsx` | Andrei | Modal cu graffiti patterns |
| `components/GridMap.tsx` | Denis | Custom dark grid map cu GPS pins |
| `components/AiPosterModal.tsx` | Denis | Prompt → AI gen → preview |
| `components/TokenDisplay.tsx` | Denis | Counter animat in header |
| `components/NotificationToast.tsx` | Denis | In-app toast banner |
| `constants/graffiti-patterns.ts` | Andrei | 6-8 pixel art patterns (5x5 to 8x8) |
| `constants/poster-locations.ts` | Denis | Lat/lng coordonate reale pt fiecare afis |

## Fisiere de MODIFICAT

| Fisier | Owner | Modificari |
|--------|-------|-----------|
| `lib/firebase.ts` | Andrei | + Auth imports, + `runTransaction` export |
| `lib/game-state.tsx` | Andrei | + uid, + tokens, + auth init, + Firebase persist |
| `app/_layout.tsx` | Andrei | + auth initialization wrapper |
| `app/index.tsx` | Denis | + jury code input UI, + session restore UI |
| `app/canvas/[posterId].tsx` | Andrei | MAJOR: SVG strokes → PixelGrid, + tools, + token checks |
| `app/(tabs)/index.tsx` | Denis | MAJOR: lista → GridMap cu GPS, territory din pixeli |
| `app/(tabs)/feed.tsx` | Denis | Citeste din `/activity/`, + notification types UI |
| `components/ActivityCard.tsx` | Denis | + action types noi |
| `components/PosterCard.tsx` | Denis | Adaptat pt map popup |

---

## Risk Management — Ce taiem daca nu avem timp

**MUST SHIP** (fara astea nu mergem la demo):
1. Pixel Grid System (Andrei)
2. Anonymous Auth (Andrei)
3. Token System (Andrei)
4. GPS Grid Map cu poster pins (Denis)

**SHOULD SHIP** (impresionant dar nu blocant):
5. Graffiti Library (Andrei)
6. Territory leaderboard pe Map (Denis)
7. AI Image Generation (ambii)

**NICE TO HAVE** (taiem primele):
8. Notification system (feed-ul existent e OK)
9. Glitch screen effect
10. Scanner animated brackets
11. Jury mode (dam tokens manual din Firebase Console)

**Fallback decisions**:
- Pixel grid nu performeaza? → Grid 20x20 (400 celule)
- Firebase sync prea chatty? → Batch writes cu `update()` la 500ms
- Pollinations.ai down? → Skip AI gen, pastram GIF stickers
- Tokens buggy? → Client-only tokens (no Firebase validation) — pt demo e OK
- GPS nu merge indoor? → Fallback la lista de postere (ce exista acum)

---

## Claude Code Prompts (PE RAND, in ordinea executiei)

### Prompt 1 — Auth (Andrei, Ora 0)
> "Add Firebase Anonymous Authentication to the app. In `lib/firebase.ts`, add `getAuth`, `signInAnonymously`, `onAuthStateChanged` imports and export `auth`. Create `lib/auth.ts` with a `useAuth()` hook that auto-signs in anonymously on mount, returns `{ uid, isReady }`. In `lib/game-state.tsx`, integrate auth: add `uid` to context, on `join()` write user data to Firebase `users/{uid}` with username, teamId, tokens:100, joinedAt. On app restart, read `users/{uid}` to restore session. Wrap auth init in `app/_layout.tsx`."

### Prompt 2 — Pixel Grid Component (Andrei, Ora 0)
> "Create `components/PixelGrid.tsx` — a 40x40 pixel grid rendered with react-native-svg `<Rect>` elements. Props: `pixels: Map<string, {color: string, teamId: string}>`, `selectedColor: string`, `onPixelPress(row, col)`, `onPixelDrag(row, col)`, `cellSize: number`. Each Rect is React.memo, only re-renders when color changes. Add a transparent View overlay on top for touch handling: onTouchStart/onTouchMove compute row=Math.floor(locationY/cellSize), col=Math.floor(locationX/cellSize) and call the callbacks. Show faint grid lines (1px, 10% opacity). Use the app's dark navy theme from `constants/theme.ts`."

### Prompt 3 — GPS Grid Map (Denis, Ora 0)
> "Create a custom GPS-based grid map component for the Map tab. NOT Google Maps — a custom dark-themed grid view inspired by cyberpunk/terminal aesthetics. Install `expo-location`. Create `constants/poster-locations.ts` with lat/lng for each poster (use placeholder coords near your hackathon venue). Create `components/GridMap.tsx`: dark background (#0B1929) with subtle grid lines, poster pins as small colored rectangles (white=unclaimed, team color=claimed), user position as a green animated pin. Convert lat/lng to x,y using simple linear projection relative to the bounding box of all posters. Add 'LIVE' badge (pulsing green dot) on posters with active users. Bottom: show current coordinates in monospace font. On pin tap, show poster info popup with territory bars and poster name. Refactor `app/(tabs)/index.tsx` to use GridMap instead of the current ScrollView poster list."

### Prompt 4 — Token System (Andrei, Ora 1)
> "Create `lib/tokens.ts` with a `useTokens()` hook. It reads `users/{uid}/tokens` from Firebase RTD in real-time. Exports: `tokens` (number), `spend(amount): Promise<boolean>` (uses `runTransaction` to atomically deduct, returns false if insufficient), `canAfford(amount): boolean`. Add token regeneration: every 60 seconds, grant +20 tokens (capped at 2000), update `lastTokenGrant`. Add `runTransaction` to firebase.ts exports. The hook requires `uid` from `useAuth()`."

### Prompt 5 — Canvas Refactor (Andrei, Ora 1)
> "Refactor `app/canvas/[posterId].tsx`: replace the SVG stroke-based drawing with the PixelGrid component. Remove all stroke-related code (Path, points array, brush sizes). Keep the GIF/sticker layer on top of the pixel grid. Tools become: 'pixel' (color individual pixels), 'eraser' (remove pixels), 'sticker' (existing GIF system), 'graffiti' (stamp patterns). Add Firebase sync: on mount, read all pixels from `posters/{posterId}/pixels/` with onValue once, then listen with onChildAdded + onChildChanged. On pixel tap, call `set(ref(db, 'posters/${posterId}/pixels/${r}_${c}'), { color, teamId, username, uid, t: serverTimestamp() })`. Use `useTokens().spend(10)` before each pixel write. Keep anthem system."

### Prompt 6 — Graffiti Library (Andrei, Ora 5)
> "Create `constants/graffiti-patterns.ts` with 6-8 pixel art patterns. Each pattern: `{ id, name, emoji, width, height, pixels: (0|1)[][] }`. Patterns: heart (5x5), star (7x7), skull (6x7), crown (7x5), lightning (3x7), spray-can (5x8), 'iTEC' text (12x5), peace sign (7x7). Create `components/GraffitiPicker.tsx` — a modal showing all patterns as small previews rendered with SVG. On select, user taps grid location to stamp. Stamp writes all filled pixels in batch with Firebase `update()`. Cost: 50 tokens via `useTokens().spend(50)`."

### Prompt 7 — Territory Engine (Andrei, Ora 5)
> "Rewrite territory calculation to use pixel data instead of strokes. Create a shared `lib/territory.ts` that exports `calculateTerritory(pixelData)` returning scores per team. Use this in both the Map screen and Canvas header. Territory = count of pixels per teamId / total colored pixels. Update PosterCard to show pixel-based territory bars."

### Prompt 8 — AI Image Gen (Denis UI Ora 5, Andrei backend Ora 9)
> "Denis: Create `components/AiPosterModal.tsx` — modal with text prompt input, 'Generate' button, loading shimmer, image preview. On confirm, call Andrei's `generateAiPoster()` and save to Firebase. Reuse GifStickerItem for canvas display. Cost: 150 tokens."
> "Andrei: Create `lib/ai-gen.ts` with `generateAiPoster(prompt): Promise<string>`. Uses Pollinations.ai: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`. Return the URL directly."

### Prompt 9 — Notifications + Glitch (Denis Ora 11, Andrei Ora 11)
> "Andrei: Create `lib/notifications.ts`. On pixel overwrite (different uid), write to `/activity/{pushId}` with type 'pixel_override'. Refactor feed to read from `/activity/` with `limitToLast(50)`."
> "Denis: Glitch effect on canvas when your pixel is overwritten: screen shake with reanimated `withSequence(withTiming)`, -3px to +3px horizontal, 5 cycles, 500ms + haptic warning. Create `components/NotificationToast.tsx` for in-app push banner."

### Prompt 10 — Jury Mode (Andrei, Ora 7)
> "Add jury login. Home screen 'JURY' button reveals code input. Compare against Firebase `config/juryCode`. Match → set tokens to 2000, `isJury: true`. Special badge in UI."

---

## Verification

1. **Auth**: Close and reopen app → same username, team, tokens restored
2. **Pixels**: Two devices open same poster → pixels appear in real-time on both
3. **Tokens**: Color pixels → token count decreases by 10 each. Wait 1 min → +20 tokens
4. **Graffiti**: Select pattern → stamp on grid → all pixels appear, -50 tokens
5. **GPS Map**: Open map tab → see your position pin + poster pins on dark grid
6. **Territory**: Color many pixels → map pins change to dominant team color
7. **AI**: Type prompt → image appears → draggable on canvas, -150 tokens
8. **Overwrite**: Device A colors pixel, Device B same pixel → notification + glitch
9. **Jury**: Enter code → 2000 tokens granted instantly
