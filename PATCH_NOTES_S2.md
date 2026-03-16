# Rayhaven Season 2 Patch Notes

## How Your Gold Works

Your **gold** comes from your grades. Every time your teacher imports grades, your gold updates automatically.

### How You Earn Gold
- Your test and homework scores are averaged together each week
- That average becomes your base gold
- **Bonuses:**
  - Score 100 on Vocab Test, Science HW, Novel, or Grammar Test = **+50g each**
  - **Grand Slam:** Score 100 on Vocab Test + Science HW + Novel = **+300g bonus**
  - **Perfect Slam:** Score 100 on ALL major subjects = **+500g bonus**
- **Penalties:**
  - Vocab Test below 80 = -40g, below 70 = -60g, below 60 = -80g, below 50 = -100g
  - Novel below 50 = -50g

### Your Effective Gold (What Determines Your Level)
```
Your Gold = Base Gold (from grades) + Honor Bonuses - Dishonor Penalties
```
- Each **Honor** point your teacher gives you = **+50g**
- Each **Dishonor** point = **-50g**
- Your gold determines your **level**, which determines your **rank**, **HP**, **ATK**, and **movement speed**

### Your Team's Available Gold (What Your Team Can Spend)
Your team pools everyone's gold together to buy things:
```
Team Gold = All Players' Gold + Mineral Rewards - Land Cost - Object Costs - Lost Objects - Revive Costs
```
- **Land** costs 10g per hex
- **Objects** (army, ship, castle, etc.) cost gold to place
- If an object gets **destroyed**, the cost is still deducted
- Each **player revive** costs 10g
- Destroying **minerals** earns your team +500g each

### Your Level
Your gold acts as XP. The more gold you have, the higher your level.

| Level | Gold Needed | HP | ATK |
|-------|-------------|-----|-----|
| 1 | 0 | 15 | 8 |
| 5 | 1,000 | 35 | 20 |
| 10 | 4,500 | 60 | 35 |
| 15 | 10,500 | 85 | 50 |
| 20 | 19,000 | 110 | 65 |
| 30 | 43,500 | 160 | 95 |
| 50 | 122,500 | 260 | 155 |

Higher level = more HP, more ATK, faster movement, and a cooler rank icon.

---

## New Units

### Catapult (D key)
- **HP:** 10 | **ATK:** 50 | **Cost:** 200g | **Move:** 3 | **Range:** 3
- Siege unit that deals massive damage from long range but is extremely fragile
- Must be placed on your team's land
- Can be loaded onto fleets and wagons for transport

### Fleet (F key)
- **HP:** 1,000 | **ATK:** 300 | **Cost:** 400g | **Move:** 10 | **Range:** 2
- Massive warship that carries up to 10 passengers (players and armies)
- Can attack directly without needing a passenger aboard
- If destroyed, all passengers aboard die or are lost
- Shift+click to board, Option+click to disembark (shows passenger picker)

### Wagon (G key)
- **HP:** 100 | **ATK:** 0 | **Cost:** 150g | **Move:** 7 | **Range:** —
- Land transport that carries up to 5 passengers (players and armies)
- Cannot attack — purely for transport
- If destroyed, all passengers aboard die or are lost
- Shift+click to board, Option+click to disembark (shows passenger picker)

### Mineral (N key)
- **HP:** 100 | Neutral (no team ownership)
- Battle objectives placed by the teacher on strategic points
- When a team destroys a mineral, they earn **500g team bonus**
- Mineral gold is added to the team's available gold (not individual player gold)
- Shown as "Minerals" count in the team panel with total gold earned

---

## Combat Overhaul

### One-Way Damage
- Combat is now **one-directional** — only the target takes damage
- Attackers no longer take damage back when attacking players
- This makes positioning and range much more important

### Attack Range
- All units now have a maximum attack range (in hexes)
- **Player / Army:** 1 hex (melee only)
- **Catapult:** 3 hexes (long-range siege)
- **Ship / Fleet:** 2 hexes (naval bombardment)
- When selecting an attacker, hexes within range are highlighted **red**
- Out-of-range attacks are blocked with an error message

### Ships & Fleets Attack Directly
- Ships (200 ATK) and fleets (300 ATK) can now attack on their own
- No longer need a passenger aboard to fight
- Ships and fleets are now true combat vessels

### Army Can Attack
- Armies can now be selected as attackers in battle mode
- **10 ATK**, range 1 — weak individually but cheap to mass

---

## Movement System

### Movement Speed
- All movable units now have a maximum movement range per move
- When selecting a unit to move, hexes within range are highlighted **blue**
- Out-of-range moves are blocked with an error message

| Unit | Move Speed (hexes) |
|------|--------------------|
| Player | 1–5 (based on rank) |
| Army | 2 |
| Catapult | 3 |
| Wagon | 7 |
| Fleet | 10 |
| Ship | 15 |

### Player Movement Scaling
- Base speed of 1 hex, +1 per every 2 rank tiers
- Recruit/Private: 1, Sergeant/Captain: 2, Commander/General: 3
- Marshal/Warlord: 4, Conqueror/Overlord: 5

### Immovable Structures
- Towns, castles, bridges, and walls can no longer be moved
- Players and armies sitting on towns/castles can still be selected to move

---

## Economy Changes

### Land Now Costs Gold
- Each hex of land costs **10g** deducted from team available gold
- Encourages strategic land claiming rather than painting the entire map

### Mineral Gold
- New income source from destroying mineral objectives
- **500g per mineral** added as team-wide bonus
- Displayed in team panel as mineral count with total gold earned

### Updated Available Gold Formula
```
Available Gold = Merit Points + Mineral Gold - Land Cost - Object Costs - Lost Object Costs - Revive Costs
```

---

## Balance Changes

### Object Health & Cost Rebalance

| Object | Old HP | New HP | Old Cost | New Cost |
|--------|--------|--------|----------|----------|
| Army | 100 | 20 | 100g | 200g |
| Ship | 60 | 500 | 75g | 100g |
| Bridge | 40 | 100 | 50g | 50g |
| Wall | 50 | 100 | 25g | 100g |
| Town | 120 | 200 | 1,000g | 1,000g |
| Castle | 350 | 500 | 5,000g | 5,000g |

### Rank Level Ranges Increased
- All ranks now require higher levels to achieve
- Makes rank progression slower and more meaningful

| Rank | Old Range | New Range |
|------|-----------|-----------|
| Recruit | 1–2 | 1–3 |
| Private | 3–4 | 4–6 |
| Sergeant | 5–7 | 7–10 |
| Captain | 8–10 | 11–15 |
| Commander | 11–14 | 16–20 |
| General | 15–19 | 21–28 |
| Marshal | 20–29 | 29–38 |
| Warlord | 30–39 | 39–49 |
| Conqueror | 40–49 | 50–64 |
| Overlord | 50+ | 65+ |

---

## Quality of Life

### Player Transfer
- Players can now be transferred between teams using the "Move" dropdown in the team panel
- All stats are preserved: gold, honor, dishonor, kills, deaths, revives
- Transferred players are removed from the map (must be re-placed)
- Dead players remain dead after transfer

### Ship & Fleet Controls Improved
- **Shift+click** = Board passenger
- **Option+click** = Disembark passenger
- **Cmd+click** = Remove (must be empty)
- Fleet/wagon disembark shows a passenger picker panel to choose who to disembark

### Land Mode Works Through Objects
- Can now assign/remove land on hexes that have objects on them
- No longer need to remove objects first to paint land

### Visual Updates
- Brighter, more distinct team outline colors for better visibility over land
- Thinner icon outlines (less visual clutter)
- Icon sizes increased slightly (small: 34px → 38px)
- Team 8 changed from brown to deep purple
- Team colors are now preserved when loading saves (no more color resets)
- Team panel widened (650–850px) for better readability

---

## New Keyboard Shortcuts

| Key | Action |
|-----|--------|
| D | Toggle catapult mode |
| F | Toggle fleet mode |
| G | Toggle wagon mode |
| N | Toggle mineral mode |

---

## Technical

- Added `hexDistance()` function for hex grid distance calculations
- Added `MOVE_SPEED`, `ATTACK_RANGE` constants to gameState
- Default team colors stored in `TEAM_COLORS` constant, re-applied on save load
- Fleet/wagon passenger data stored as `passengers[]` array on hex objects
- Mineral destruction tracked as `mineralsDestroyed` on team data
