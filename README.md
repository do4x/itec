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

## Firebase Setup (10 minute)

1. Mergi pe https://console.firebase.google.com
2. Click Create Project, numește-l itec-override
3. Dezactivează Google Analytics (nu ai nevoie)
4. Din sidebar: Build, Realtime Database, Create Database
5. Alege Europe (eu-west1) ca locație
6. Selectează Start in TEST MODE (permite read/write fără auth)
7. Din sidebar: Project Settings, scroll la Your apps, click Web icon
8. Numește app-ul, click Register
9. Copiază firebaseConfig obiectul
10. Lipește-l în lib/firebase.ts, înlocuind valorile placeholder

Test mode expiră după 30 de zile. Perfect pentru hackathon.

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
- Canvas drawing upgrade (Skia dacă faceți dev build)
- UI polish pe toate ecranele
- Color picker + brush UI
- Glitch animation
- Haptic feedback patterns
- AI Tag Generator (side-quest)

## Generare QR Codes

Printați QR codes care conțin text simplu: poster_001, poster_002, etc.
Lipiți-le pe pereți. Scanner-ul le citește automat.
Generator: https://www.qr-code-generator.com

## Comenzi Utile

```bash
npx expo start          # Pornește dev server
npx expo start --clear  # Pornește cu cache curat
```
