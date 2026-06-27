# RaceDeck — build progress

## Decisions
- Online MP, accounts (Better Auth email/pw), 2-4 players, 20-square track.
- Base step = +1 on your turn (end-turn applies it). Cards add strategy.
- Cards: advance(+4), block(skip next turn of target), mystery(turtle 2 turns OR steal card).
- Real-time = short polling ~1s of GET /api/games/:id.
- Visual: Balatro cards (juicy, lightly pixelated, hard offset shadows) + Stake UI chrome (dark elegant). Fonts: Press Start 2P (sparingly) + Sora.

## Done
- [x] Auth config + schema generated + db push
- [x] Game schema: games, players, game_events
- [x] Engine (engine.ts) + store helpers (store.ts)
- [x] Auth middleware
- [x] Game routes (routes/games.ts): create, join, seat, start, get, list, play, end-turn

## Done (cont.)
- [x] api/index.ts wired (auth mounted before basePath, games routed)
- [x] Web client: api.ts, auth.ts, provider w/ react-query
- [x] styles.css design system (tokens, fonts, panels, buttons, animations)
- [x] Pages: landing/auth, lobby, game (waiting room + table + win overlay)
- [x] Components: GameCard, Track, HorseSprite, EventLog, PlayerChips
- [x] Pixel horse + turtle sprites (bg removed, hue-rotate per color)
- [x] build passes; full API flow tested (create/join/start/advance/block/turn rotation)
- [x] Verified UI screenshots (landing + game)

## TODO
- [ ] final build + deliver
