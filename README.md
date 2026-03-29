# <img src="assets/images/icon.png" width="32" height="32" alt="icon" /> iTEC: OVERRIDE

**Collaborative digital vandalism platform** — Scan real-world posters, claim them with pixel art, compete for territory in real-time.

Built for the **iTEC 2026 Hackathon** · Mobile Development Track

---

## The Concept

Every poster in the building is a battlefield. Scan it with your phone, and it becomes a shared digital canvas. Draw pixel graffiti, stamp patterns, generate AI art, and fight other teams for ownership — all synchronized in real-time across every device.

Think **r/place** meets **AR poster scanning**.

## How It Works

```
Sign up → Pick a team → Scan a poster → Draw on it → Compete for territory
```

1. **Scan** — Point your camera at any of the 10 physical posters. AI vision identifies which one it is.
2. **Create** — Draw pixels, stamp graffiti patterns, place GIF stickers, or generate AI art from text prompts.
3. **Compete** — Every action costs tokens. Every pixel can be overwritten by a rival team.
4. **Dominate** — The team with the most surface area on a poster owns it. Own the most posters to win.

## Features

**Core**
- 📸 AI-powered poster recognition (Claude Vision API)
- 🎨 40×40 pixel grid canvas with real-time sync
- 🗺️ Custom GPS grid map with live territory tracking
- ⚔️ Token economy (earn, spend, compete)
- 👥 4-team system with territory warfare

**Canvas Tools**
- Pixel brush + eraser
- 8 graffiti stamp patterns (heart, skull, crown, lightning, etc.)
- GIF/sticker placement with drag, pinch, rotate
- AI art generation via text prompt
- Team anthem system (audio attached to posters)

**Game System**
- Start with 100 tokens, earn +20/minute
- Pixel = 10 tokens, Graffiti = 50, Sticker = 100, AI Art = 150
- Override rival pixels, delete their stickers
- Territory leaderboard per poster and global

**Social**
- Real-time activity feed with 7 event types
- Push notifications with haptic feedback
- Glitch animation when rivals overwrite your work
- Jury mode with special access code

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo (SDK 54) |
| Routing | Expo Router (file-based) |
| Database | Firebase Realtime Database |
| Auth | Firebase Anonymous Authentication |
| Poster Recognition | Anthropic Claude Vision API (Sonnet) |
| AI Art | Pollinations.ai (free, no key required) |
| Drawing | react-native-svg (40×40 pixel grid) |
| Animations | react-native-reanimated |
| Location | expo-location |
| Haptics | expo-haptics |

## Setup

```bash
# Clone
git clone https://github.com/do4x/itec.git
cd itec

# Install
npm install

# Configure
cp .env.example .env
# Fill in Firebase + Anthropic API keys in .env

# Run
npx expo start --tunnel --clear
```

### Required Configuration

| Key | Where to get it |
|-----|----------------|
| `EXPO_PUBLIC_FIREBASE_*` | [Firebase Console](https://console.firebase.google.com) → Project Settings → Web App |
| `EXPO_PUBLIC_ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/settings/keys) |
| `EXPO_PUBLIC_GIPHY_API_KEY` | [Giphy Developers](https://developers.giphy.com) |

Firebase setup: Create project → enable **Realtime Database** (Europe, test mode) → enable **Anonymous** sign-in under Authentication.

## Project Structure

```
app/
├── index.tsx                 Onboarding (username, team, jury code)
├── (tabs)/
│   ├── index.tsx             GPS grid map with territory pins
│   ├── scan.tsx              Camera-based poster scanner
│   └── feed.tsx              Real-time activity feed
└── canvas/
    └── [posterId].tsx        Pixel grid canvas + all tools

components/                   PixelGrid, GridMap, GraffitiPicker,
                              AiPosterModal, GifStickerItem, etc.

lib/                          firebase, auth, tokens, territory,
                              notifications, poster-matcher, ai-gen

constants/                    theme, poster-locations, graffiti-patterns
```

## The 10 Posters

| # | Poster | Visual |
|---|--------|--------|
| 1 | Boost Your Social Presence | 🔵 Dark blue, 3D megaphone |
| 2 | Digital Marketing Agency | 🔴 Red circles layout |
| 3 | Digital Marketing Agency | 🟣 Purple curves layout |
| 4 | Creează fără limite | 🔴 Red itec can |
| 5 | Best Burger in Town | 🍔 Dark + cream split |
| 6 | Form Follows Function | 🟢 Architecture, neon green |
| 7 | Explore the World | 🔵 Navy, travel photos |
| 8 | Fashion Business | 🩷 Hot pink magazine |
| 9 | Exclusive Edition Sneakers | 🔵 Blue shoe, 50% off |
| 10 | itec Yellow | 🟡 Yellow banner |

## Team

Built in ~24 hours by two people who had never built a mobile app before.

- **Denis** — Map, UI/UX, prompt engineering, scanning system
- **Andrei** — Pixel grid, game logic, Firebase backend, canvas tools

*iTEC 2026 · Facultatea de Automatică și Calculatoare · Timișoara*
