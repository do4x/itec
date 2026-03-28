# UI DESIGN PROMPT — iTEC: OVERRIDE

Use this prompt with Claude Code to generate the complete frontend UI.
Copy everything below the --- line and paste it as a single prompt.

---

Redesign the entire frontend UI of this React Native Expo app (iTEC: OVERRIDE — a collaborative digital vandalism platform for the iTEC 2026 hackathon). Generate production-quality screens with polished styling. The app has 3 main tabs (Map, Scan, Feed) plus a Canvas screen that opens after scanning a poster.

## DESIGN SYSTEM

### Color Palette (inspired by itec.ro branding)

Primary:
- Navy Deep: #0B1929 (backgrounds, primary surfaces)
- Navy Mid: #122A45 (cards, elevated surfaces)
- Navy Light: #1A3A5C (secondary elements, borders)

Accent:
- iTEC Blue: #2D7DD2 (primary actions, active states, links)
- iTEC Bright: #4DA3FF (highlights, glows, selected states)
- Ice White: #E8F1FF (text on dark, subtle blue-white)

Neutral:
- Pure White: #FFFFFF (primary text, icons)
- Soft Gray: #8BA4BE (secondary text, labels, timestamps)
- Muted: #4A6380 (disabled, placeholder text)

Team Colors (for territory, badges, ownership):
- Team Red: #FF3B5C
- Team Cyan: #00E5FF
- Team Green: #39FF14
- Team Yellow: #FFD600

Status:
- Success: #00E676
- Warning: #FFB300
- Error: #FF1744

### Typography
- Headers: System bold (fontWeight 800-900), large letter-spacing (2-4), uppercase
- Body: System regular, clean and readable
- Labels/Captions: Small (10-11px), uppercase, letter-spacing 3+, Soft Gray
- Numbers/Stats: Bold, slightly larger, monospace feel

### Visual Style

Primary UI inspiration: Lovi iOS app style:
- Soft, rounded cards with generous padding (16-20px)
- Subtle shadows (elevation 2, low opacity), no harsh drop shadows
- Clean whitespace between elements
- Rounded corners everywhere (borderRadius 16-20 cards, 12 buttons, 24+ pills)
- Gentle hierarchy through spacing, not heavy borders
- Warm, inviting feel

Adaptation for dark navy theme:
- Background: Navy Deep (#0B1929) instead of light
- Cards: Navy Mid (#122A45) with subtle 1px Navy Light (#1A3A5C) border
- Same soft padded card style but on dark surfaces
- Accent glows: subtle iTEC Blue shadow on active elements
- Premium dark mode feel — rich deep navy, never harsh black

### Icons
- @expo/vector-icons (Ionicons or MaterialCommunityIcons)
- 24px navigation, 20px inline, outlined style
- Active tab: filled + iTEC Blue. Inactive: outlined + Soft Gray

### App Identity
- Penguin mascot with spray can (graffiti vibe)
- Dark navy + light blue color scheme
- Playful but with edge

## SCREEN SPECS

### Tab Bar (Bottom Navigation)
3 tabs: Map | Scan | Feed
- Floating tab bar: rounded corners, Navy Mid bg, slight elevation
- 16px from bottom, 16px horizontal margins
- Active: pill-shaped iTEC Blue at 15% opacity behind icon+label
- Center tab (Scan): emphasized — circular accent button or larger icon
- Labels: 10px, uppercase below icons

### Screen 1: MAP (Tab 1)

NOT Google Maps. Custom 2D floor plan of hackathon workspace.

Top to bottom:
1. Header: "OVERRIDE" left, team badge (color dot + name) right
2. Floor Plan (~60% screen): simplified 2D SVG of the Haufe office floor. Labeled rooms/zones. Pin markers on poster locations colored by owning team. Pins pulse gently. Unclaimed pins are Muted gray.
3. Poster Detail Card (bottom sheet on pin tap, 40% screen): slides up, shows poster thumbnail + name + ownership bar (colored segments per team %) + "SCAN TO OVERRIDE" button. Swipe down to dismiss.

Feel: game minimap. Clean, minimal, alive with glowing pins.

### Screen 2: SCAN (Tab 2, Center Tab)

Full camera scanner.

1. Full-screen camera background
2. Scan frame: rounded rect (280x360) centered, corner brackets in iTEC Blue, subtle pulse animation
3. Top bar: semi-transparent dark gradient, team badge or back arrow, "SCAN POSTER" centered
4. Bottom area: semi-transparent gradient up, large capture button (72px, iTEC Blue ring + filled inner), hint text. On matching: spinner + "Identifying poster...". On success: checkmark + poster name, auto-navigate to Canvas.
5. DEV row: 3 small poster buttons at very bottom for testing

### Screen 3: FEED (Tab 3)

Real-time activity feed.

1. Header: "ACTIVITY" title + filter pills (All | My Team | Rivals)
2. Feed cards (scrollable):
   - Left edge: 4px team color bar full height
   - Action icon: paint for drawing, flag for captured, music for anthem, trophy for territory won
   - Text: "[username] drew on [poster name]" or "[Team] captured [poster]!"
   - Timestamp: "2 min ago", Soft Gray
   - Optional poster thumbnail right
   - Card: Navy Mid bg, 16px radius, left border team color
3. Anthem cards: shows team anthem placement + play button
4. Empty state: penguin mascot + "No activity yet. Go scan some posters!"

### Screen 4: CANVAS (full-screen after scan, not a tab)

Graffiti drawing screen.

1. Top bar: back arrow + poster name centered + team badge right
2. Territory bar (6px): horizontal colored segments per team, animated in real-time
3. Canvas (~70% screen): poster image as dimmed background (80% opacity), drawing layer on top
4. Tool bar (bottom, two rows):
   - Row 1 tools (horizontal scroll): Brush (default), Eraser, Text, Sticker, AI Generate (star icon)
   - Row 2 options (context-sensitive): color dots + size slider for brush, font size for text, text input + Generate button for AI
   - Navy Mid bg, rounded top corners 24px, tool icons 44px circular, selected = iTEC Blue pill
5. Floating: Undo + Redo (top-left, small circular semi-transparent), real-time user count badge (top-right, "3 active" + pulsing dot)

### HOME / ONBOARDING (app/index.tsx)

Update to match new design system. Keep functionality (username + team selection) but restyle with Navy Deep bg, rounded input, team cards with glow on selection, iTEC Blue join button.

## ANIMATIONS
- Tab transitions: spring physics (reanimated)
- Card appearances: fade in + slide up, stagger 50ms
- Pin pulses: scale 1.0-1.15, loop 2s, ease-in-out
- Capture button: scale 0.9 on press, spring back
- Territory bar: animated width 300ms ease
- Bottom sheet: gesture-driven spring
- Glitch effect (rival draws): horizontal shake 3px for 500ms + opacity flicker

## FILES TO GENERATE/UPDATE

1. app/(tabs)/_layout.tsx — Tab navigator with custom tab bar
2. app/(tabs)/index.tsx — Map screen
3. app/(tabs)/scan.tsx — Scanner screen
4. app/(tabs)/feed.tsx — Activity feed
5. app/canvas/[posterId].tsx — Updated canvas with toolbar
6. app/index.tsx — Restyled onboarding
7. components/TabBar.tsx — Custom floating tab bar
8. components/PosterCard.tsx — Poster detail card
9. components/ActivityCard.tsx — Feed item card
10. constants/theme.ts — Colors, spacing, typography constants

Make every screen feel like a polished shipped product, not a hackathon prototype. The judges see 5 minutes of demo. Every pixel matters.
