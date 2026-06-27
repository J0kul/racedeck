# RaceDeck — Design System

## Concept
Online multiplayer horse-racing card game. The **playfield + cards feel like Balatro** (juicy, tactile, slightly pixelated, saturated) but more *defined* and only *lightly* pixelated. The **chrome / UI / HUD feels like Stake.com** — elegant, premium, dark, rounded panels, soft glows, confident spacing.

## Mood
Late-night high-stakes lounge meets an arcade card table. Dark, rich, glowing. Cards pop with color and depth against a muted felt-dark background.

## Color
CSS variables (defined in styles.css).

| Token | Hex | Use |
|-------|-----|-----|
| `--bg-900` | `#0B0E13` | App base (near-black blue, Stake-ish) |
| `--bg-800` | `#10151D` | Panels / surfaces |
| `--bg-700` | `#172030` | Raised cards, inputs |
| `--bg-600` | `#1F2A3C` | Borders, hover |
| `--felt`   | `#0E2A22` | Race table felt (deep green) |
| `--felt-glow` | `#15493A` | Felt vignette/glow |
| `--ink` | `#E8EEF6` | Primary text |
| `--ink-dim` | `#8A99AE` | Secondary text |
| `--gold` | `#F5C451` | Premium accent (wins, primary CTA highlights) |
| `--mint` | `#3BE3A0` | Stake-signature green (success, advance) |
| `--mint-700` | `#16C784` | Mint pressed |
| `--violet` | `#8B5CF6` | Mystery card |
| `--rose` | `#FB5E7E` | Block / danger |
| `--cyan` | `#34D3F5` | Info / highlights |

Card suit colors: Advance = mint, Block = rose, Mystery = violet.

## Typography
- **Display / numbers / card values:** "Press Start 2P" used SPARINGLY for big headline numbers/logo to give the light-pixel touch. For body of headings use a chunky geometric: **"Sora"** (700/800).
- **Body / UI:** **"Sora"** 400–600. Clean, modern, premium.
- Pixel font only for: logo wordmark, big track numbers, card pip values, win banner. Everything else Sora for legibility.
- Line-height generous (1.5 body). Letter-spacing slightly tight on display.

## Pixel treatment
- Light, not heavy. Use `image-rendering: pixelated` only on small generated pixel-art horse sprites and card icons.
- Cards have crisp 2px borders, subtle inner highlight, and a 3-4px hard drop shadow (Balatro-style offset shadow) rather than soft blur.

## Components
- **Panels:** `--bg-800`, 1px `--bg-600` border, 16px radius, subtle top inner highlight, soft outer shadow. Stake style.
- **Buttons:** primary = mint gradient with glow; gold for premium/win actions; rose for destructive. Pill or 12px radius. Pressed = translateY(2px), shadow shrinks.
- **Cards (hand):** ~150x210, hard offset shadow, color-coded by type, big pixel value, icon, label. Hover = lift + tilt + glow. Selected = raised higher + ring. Playing = fly to target with screen shake.
- **Track:** 20 horizontal/curved squares on green felt, lane per player, horse sprite per lane, finish line with checkered flag. Position markers glow.
- **HUD:** top bar = room code, turn indicator, player chips with avatars + horse color + card count. Bottom = your hand. Right rail = event log / effects.
- **Inputs:** dark `--bg-700`, inner shadow, mint focus ring.

## Motion (Motion library)
- Card deal: stagger in from deck with slight rotation.
- Card play: scale + arc to target, brief screen shake, particle burst in card color.
- Horse move: spring along track, dust puff.
- Turtle effect: horse morphs to turtle sprite with a green poof; slow wobble.
- Win: gold confetti + pixel "WINNER" banner, camera punch.
- Turn change: HUD turn pill slides to active player with glow pulse.

## Layout
- **Lobby:** centered, big pixel logo, create/join room cards, player config (2-4), avatar + horse color picker.
- **Game:** full-bleep dark felt. Track top 55%, opponents HUD floating top, your hand bottom 30%, event log right rail (collapsible). Vignette around edges.
- **Win screen:** overlay with podium + replay/return.

## UX patterns
- Real-time via short polling (~1s) of game state.
- Always show whose turn it is; lock interactions when not your turn.
- Clear affordance for targeting (block/mystery select a target player).
- Loading skeletons on every fetch; disabled+spinner on every action button.
