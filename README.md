# iTEC: OVERRIDE — Vandalism Digital Colaborativ

## Quick Start (5 minute)

```bash
# 1. Dezarhivează proiectul
unzip itec-override.zip
cd itec-override

# 2. Instalează dependințele
npm install

# 3. Configurează Firebase (vezi mai jos)
# Editează lib/firebase.ts cu datele tale

# 4. Pornește
npx expo start

# 5. Scanează QR-ul cu Expo Go pe telefon
```
## Structura Proiectului

```
itec-override/
├── app/
│   ├── _layout.tsx          Root layout (providers, theme)
│   ├── index.tsx            HOME: username + team selection
│   ├── scanner.tsx          SCANNER: camera QR + dev buttons
│   ├── canvas/
│   │   └── [posterId].tsx   CANVAS: drawing surface + real-time sync
│   └── map.tsx              MAP: territory overview
├── lib/
│   ├── firebase.ts          Firebase config + exports
│   └── game-state.tsx       Global state (username, team)
├── components/              Componente reutilizabile
└── assets/                  Imagini, fonturi
```

## Flow-ul Aplicației

HOME (username + echipă) → SCANNER (scanezi QR) → CANVAS (desenezi) → MAP (vezi teritorii)

## Împărțirea Muncii la Hackathon

### DENIS (Backend + Logic)
- Firebase setup + config
- Real-time sync optimization (stroke batching)
- Territory calculation engine
- QR code generation
- Scanner navigation flow
- Audio Proximity Trigger (side-quest)

### TOVARĂȘUL TĂU (UI + Canvas + Polish)  
- Canvas drawing upgrade
- UI polish pe toate ecranele
- Color picker + brush UI
- Glitch animation
- Haptic feedback patterns
- AI Tag Generator (side-quest)

```bash
npx expo start          # Pornește dev server
npx expo start --clear  # Pornește cu cache curat
```
