# Task: History fix + Hearthstone card UX + New cards

## 1. History feed fix
- EventLog: show only last 5 events by default
- "See more" toggle reveals full scrollable list
- No layout-pushing: fixed height container

## 2. Hearthstone card UX
- Click card = select/highlight (lift + glow, no play yet)
- Clicked again = deselect
- "PLAY" button appears when card is selected (non-target) OR user confirms target
- For target cards: select card → click rival chip → plays
- Advance card no longer auto-plays on click

## 3. New cards (5 new types)
| Card | Effect | Target |
|---|---|---|
| `swap` | Swap positions with any rival (Monopoly: pay to move) | yes |
| `shield` | Immune to block/turtle/steal for 1 turn | no |
| `sabotage` | Set a rival back 3 squares | yes |
| `nitro` | Next base step is doubled for you | no |
| `tax` | All rivals lose 1 card from hand | no |

## Files to touch
- `engine.ts` — CardType union, CARD_META, DRAW_WEIGHTS
- `lib/game.ts` (client) — CardType, CARD_META mirror
- `logic.ts` — resolveCard branches for 5 new types
- `bot.ts` — priority logic for new cards
- `schema.ts` — add `shieldActive`, `nitroActive` booleans to players
- DB migration — ALTER TABLE for 2 new columns
- `game-card.tsx` — new icon mapping
- `event-log.tsx` — collapsed/expandable feed
- `game.tsx` — Hearthstone UX (select → play button)
