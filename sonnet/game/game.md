# Campfire Survival — 2D Game Design & Implementation Specification

## 1. Game Overview

**Campfire Survival** is a 2D survival game set in a dark, infinite forest at night.

At the center of the map burns a campfire located on a very small clearing.  
The player controls a woodsman whose only goal is to keep the fire alive as long as possible.

The fire slowly extinguishes over time. Monsters fear light and stay away while the fire burns strongly. As the fire weakens, darkness spreads and monsters approach closer.

The game is unwinnable by design — eventually the fire goes out or monsters reach the player. The objective is to survive as long as possible.

---

## 2. Technology Stack

### Core Technologies
- **Engine:** Phaser 3 (HTML5 2D JavaScript framework)
- **Language:** JavaScript (ES6+)
- **Renderer:** WebGL / Canvas (Phaser AUTO)
- **Physics:** Phaser Arcade Physics
- **Build Tool:** Vite

### Why Phaser 3
- Lightweight and ideal for 2D games
- Built-in physics and timing systems
- Easy procedural graphics (no assets required)
- Good lighting and masking support

---

## 3. Game World

- Full nighttime environment.
- Infinite-looking forest generated procedurally.
- Small clearing in the center (~5 meters radius).
- Campfire positioned exactly in the center.
- Trees exist around the clearing.
- No sky or visible world borders.

---

## 4. Core Gameplay Loop

1. Campfire burn level decreases continuously.
2. Player walks to trees.
3. Player automatically chops trees.
4. Logs appear after chopping.
5. Player carries logs to the campfire.
6. Logs restore fire strength.
7. Fire brightness controls safe area size.
8. Monsters spawn in darkness.
9. Monsters approach as fire weakens.
10. Monster touches player → Game Over.

---

## 5. Player (Woodsman)

### Behavior
- Controlled with keyboard (WASD or Arrow Keys).
- Automatically chops trees when standing near them.
- Can carry one log at a time.

### Properties
- Position (x, y)
- Movement speed
- Carrying state (true/false)
- Chop progress (0–100%)

---

## 6. Trees

### Rules
- Trees exist outside the clearing.
- Limited quantity.
- Automatically chopped when player is near.

### Properties
- Position
- Chop duration
- Destroyed state

### Result
When chopped:
- Tree disappears.
- One log spawns.

---

## 7. Logs

### Behavior
- Spawn after tree destruction.
- Automatically picked up if player is close.
- Delivered by walking into campfire.

### Effect
```

burnLevel += logValue

```

---

## 8. Campfire System

The campfire is the central mechanic.

### Variables
- `burnLevel` (0–100)
- `decayRate` (per second)
- `lightRadius`

### Mechanics
- Burn level constantly decreases.
- Light radius scales with burn level.

```

lightRadius = minRadius + burnLevel * factor

````

### Visual Effects
- Larger fire = larger illuminated area.
- Smaller fire = darkness closes in.

---

## 9. Monsters

### Spawn Rules
- Spawn only in darkness.
- Never spawn inside light radius.

### Behavior States
- **Fear State:** move away from fire if burnLevel is high.
- **Hunting State:** move toward player if burnLevel is low.

### Game Over Condition
If monster touches player → game ends instantly.

---

## 10. Lighting System

No external assets used.

Lighting created using:
- Full-screen dark overlay.
- Circular mask centered on campfire.

Steps:
1. Draw dark rectangle over screen.
2. Cut circular hole using mask.
3. Radius changes dynamically.

---

## 11. Procedural Graphics (No Assets)

All visuals generated using Phaser Graphics.

| Object | Representation |
|------|------|
| Woodsman | Rectangle + circle |
| Tree | Brown rectangle + green circle |
| Log | Small brown rectangle |
| Monster | Triangle or polygon |
| Fire | Animated circles + triangles |

---

## 12. User Interface

### HUD Elements
- Burn meter (left side)
- Survival timer (top)
- Carrying indicator
- Game Over screen

### Game Over Screen
Displays:
- Survival time
- Best time
- Restart instruction

---

## 13. Controls

| Action | Key |
|------|------|
| Move | WASD / Arrows |
| Restart | R |

---

## 14. Game State Structure

```js
const state = {
  timeElapsed: 0,
  bestTime: 0,
  campfire: {
    burn: 80,
    decayRate: 0.5
  },
  player: {
    x: 0,
    y: 0,
    carrying: false,
    chopProgress: 0
  },
  trees: [],
  logs: [],
  monsters: []
};
````

---

## 15. Difficulty Design

Difficulty increases over time by:

* Faster burn decay.
* Increased monster spawn rate.
* More aggressive monster behavior.

The game must always end eventually.

---

## 16. Procedural Generation

### Trees

* Spawn in a ring outside clearing.
* Random distribution with minimum spacing.

### Monsters

Spawn position:

```
spawnDistance > lightRadius + margin
```

---

## 17. Scoring

Score = survival time.

Displayed as:

```
MM:SS
```

Best score saved locally.

---

## 18. Minimum Playable Version (MVP)

Must include:

* Player movement
* Tree chopping
* Log delivery
* Campfire decay
* Dynamic light radius
* Monster spawning
* Monster AI
* Game Over screen
* Timer system

---

## 19. Optional Future Improvements

* Fire particle effects
* Sound effects
* Multiple monster types
* Weather affecting fire decay
* Mobile controls
* Procedural sound ambience

---

## 20. Design Philosophy

The player is not meant to win.

The experience should create:

* Increasing pressure
* Resource anxiety
* Darkness tension
* Inevitable failure

The emotional loop:

```
Safety → Urgency → Panic → Darkness → Death
```

Survive longer each run.

```

---
