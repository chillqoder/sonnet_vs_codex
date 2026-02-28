import Phaser from 'phaser';

const W = 800;
const H = 600;
const CENTER_X = W / 2;
const CENTER_Y = H / 2;
const CLEARING_RADIUS = 90;
const TREE_COUNT = 18;
const TREE_CHOP_TIME = 3000; // ms
const LOG_VALUE = 20;
const DECAY_RATE_BASE = 0.8; // burn per second
const MIN_LIGHT_RADIUS = 60;
const MAX_LIGHT_RADIUS = 280;
const MONSTER_SPAWN_INTERVAL_BASE = 4000; // ms
const MONSTER_SPEED_BASE = 55;
const PICKUP_RADIUS = 35;
const FIRE_RADIUS = 40;

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.state = {
      timeElapsed: 0,
      bestTime: parseFloat(localStorage.getItem('bestTime') || '0'),
      campfire: { burn: 80, decayRate: DECAY_RATE_BASE },
      player: { x: CENTER_X, y: CENTER_Y + 50, carrying: false, chopProgress: 0, chopTarget: null },
      trees: [],
      logs: [],
      monsters: [],
      gameOver: false,
    };

    this.graphics = this.add.graphics();
    this.uiGraphics = this.add.graphics().setDepth(10);
    this.fireGraphics = this.add.graphics().setDepth(2);
    // Warm glow layer — visible through the darkness hole
    this._warmGlowGfx = this.add.graphics().setDepth(3);
    // Darkness layer: RenderTexture so erase() actually punches transparent holes
    this._darknessRT = this.add.renderTexture(0, 0, W, H).setDepth(7).setOrigin(0, 0);
    // Off-screen graphics used as the erase stamp (not added to scene)
    this._maskGfx = this.make.graphics({ add: false });
    this.uiText = [];

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      r: Phaser.Input.Keyboard.KeyCodes.R,
    });

    this._spawnTrees();
    this._setupMonsterTimer();
    this._setupHUD();
  }

  _spawnTrees() {
    const s = this.state;
    const minDist = CLEARING_RADIUS + 30;
    const maxDist = 340;
    const spacing = 55;
    let attempts = 0;

    while (s.trees.length < TREE_COUNT && attempts < 500) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (maxDist - minDist);
      const tx = CENTER_X + Math.cos(angle) * dist;
      const ty = CENTER_Y + Math.sin(angle) * dist;

      // keep trees on screen with margin
      if (tx < 40 || tx > W - 40 || ty < 40 || ty > H - 40) continue;

      // min spacing between trees
      const tooClose = s.trees.some(t => Phaser.Math.Distance.Between(tx, ty, t.x, t.y) < spacing);
      if (tooClose) continue;

      s.trees.push({ x: tx, y: ty, chopped: false, chopProgress: 0 });
    }
  }

  _setupMonsterTimer() {
    this._monsterTimer = this.time.addEvent({
      delay: MONSTER_SPAWN_INTERVAL_BASE,
      callback: this._spawnMonster,
      callbackScope: this,
      loop: true,
    });
  }

  _spawnMonster() {
    if (this.state.gameOver) return;
    const lightR = this._getLightRadius();
    const margin = 40;
    const spawnDist = lightR + margin + Math.random() * 80;
    const angle = Math.random() * Math.PI * 2;
    const mx = CENTER_X + Math.cos(angle) * spawnDist;
    const my = CENTER_Y + Math.sin(angle) * spawnDist;
    // clamp to screen
    const x = Phaser.Math.Clamp(mx, 20, W - 20);
    const y = Phaser.Math.Clamp(my, 20, H - 20);
    const difficulty = Math.min(this.state.timeElapsed / 120, 2);
    this.state.monsters.push({ x, y, speed: MONSTER_SPEED_BASE + difficulty * 25 });
  }

  _setupHUD() {
    // timer text
    this._timerText = this.add.text(CENTER_X, 18, '00:00', {
      fontSize: '22px', fill: '#fff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5, 0).setDepth(11);

    // burn label
    this.add.text(14, 20, 'FIRE', {
      fontSize: '13px', fill: '#ffa500', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2
    }).setDepth(11);

    // carry text
    this._carryText = this.add.text(W - 14, 20, '', {
      fontSize: '13px', fill: '#a0d0ff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2
    }).setOrigin(1, 0).setDepth(11);
  }

  _getLightRadius() {
    const burn = this.state.campfire.burn;
    return MIN_LIGHT_RADIUS + (burn / 100) * (MAX_LIGHT_RADIUS - MIN_LIGHT_RADIUS);
  }

  update(time, delta) {
    const dt = delta / 1000;
    const s = this.state;

    if (s.gameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
        this.scene.restart();
      }
      return;
    }

    s.timeElapsed += dt;

    // Increase difficulty over time
    const difficulty = Math.min(s.timeElapsed / 120, 2);
    s.campfire.decayRate = DECAY_RATE_BASE + difficulty * 0.6;
    const spawnInterval = Math.max(1200, MONSTER_SPAWN_INTERVAL_BASE - difficulty * 1200);
    this._monsterTimer.delay = spawnInterval;

    // Decay fire
    s.campfire.burn = Math.max(0, s.campfire.burn - s.campfire.decayRate * dt);

    // Move player
    this._movePlayer(dt);

    // Auto-chop nearby tree
    this._handleChopping(dt);

    // Auto-pickup log
    this._handlePickup();

    // Deliver log to fire
    this._handleDelivery();

    // Update monsters
    this._updateMonsters(dt);

    // Check game over (fire out or monster contact)
    if (s.campfire.burn <= 0) {
      this._triggerGameOver('The fire went out...');
      return;
    }

    // Draw everything
    this._draw();
  }

  _movePlayer(dt) {
    const s = this.state;
    const speed = 140;
    let dx = 0, dy = 0;
    const k = this.keys;

    if (k.left.isDown || k.a.isDown) dx -= 1;
    if (k.right.isDown || k.d.isDown) dx += 1;
    if (k.up.isDown || k.w.isDown) dy -= 1;
    if (k.down.isDown || k.s.isDown) dy += 1;

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    s.player.x = Phaser.Math.Clamp(s.player.x + dx * speed * dt, 10, W - 10);
    s.player.y = Phaser.Math.Clamp(s.player.y + dy * speed * dt, 10, H - 10);
  }

  _handleChopping(dt) {
    const s = this.state;
    if (s.player.carrying) return; // can't chop while carrying

    // find closest tree
    let closest = null;
    let closestDist = Infinity;
    for (const tree of s.trees) {
      if (tree.chopped) continue;
      const dist = Phaser.Math.Distance.Between(s.player.x, s.player.y, tree.x, tree.y);
      if (dist < 45 && dist < closestDist) {
        closest = tree;
        closestDist = dist;
      }
    }

    if (closest) {
      if (s.player.chopTarget !== closest) {
        s.player.chopTarget = closest;
        s.player.chopProgress = 0;
      }
      s.player.chopProgress += (dt * 1000 / TREE_CHOP_TIME) * 100;
      if (s.player.chopProgress >= 100) {
        closest.chopped = true;
        s.player.chopTarget = null;
        s.player.chopProgress = 0;
        s.logs.push({ x: closest.x, y: closest.y });
      }
    } else {
      s.player.chopTarget = null;
      s.player.chopProgress = 0;
    }
  }

  _handlePickup() {
    const s = this.state;
    if (s.player.carrying) return;
    for (let i = s.logs.length - 1; i >= 0; i--) {
      const log = s.logs[i];
      const dist = Phaser.Math.Distance.Between(s.player.x, s.player.y, log.x, log.y);
      if (dist < PICKUP_RADIUS) {
        s.logs.splice(i, 1);
        s.player.carrying = true;
        break;
      }
    }
  }

  _handleDelivery() {
    const s = this.state;
    if (!s.player.carrying) return;
    const dist = Phaser.Math.Distance.Between(s.player.x, s.player.y, CENTER_X, CENTER_Y);
    if (dist < FIRE_RADIUS) {
      s.player.carrying = false;
      s.campfire.burn = Math.min(100, s.campfire.burn + LOG_VALUE);
    }
  }

  _updateMonsters(dt) {
    const s = this.state;
    const lightR = this._getLightRadius();

    for (const m of s.monsters) {
      const distToFire = Phaser.Math.Distance.Between(m.x, m.y, CENTER_X, CENTER_Y);
      const distToPlayer = Phaser.Math.Distance.Between(m.x, m.y, s.player.x, s.player.y);

      let targetX, targetY;

      if (s.campfire.burn > 40) {
        // Fear state: flee from fire if inside light radius
        if (distToFire < lightR + 30) {
          const angle = Math.atan2(m.y - CENTER_Y, m.x - CENTER_X);
          targetX = m.x + Math.cos(angle) * 50;
          targetY = m.y + Math.sin(angle) * 50;
        } else {
          // Idle — circle slowly
          const angle = Math.atan2(m.y - CENTER_Y, m.x - CENTER_X) + 0.01;
          targetX = CENTER_X + Math.cos(angle) * distToFire;
          targetY = CENTER_Y + Math.sin(angle) * distToFire;
        }
      } else {
        // Hunting state: move toward player
        targetX = s.player.x;
        targetY = s.player.y;
      }

      const moveAngle = Math.atan2(targetY - m.y, targetX - m.x);
      m.x += Math.cos(moveAngle) * m.speed * dt;
      m.y += Math.sin(moveAngle) * m.speed * dt;

      // Game over if monster reaches player
      if (distToPlayer < 16) {
        this._triggerGameOver('You were consumed by the darkness...');
        return;
      }
    }
  }

  _triggerGameOver(reason) {
    const s = this.state;
    s.gameOver = true;
    if (s.timeElapsed > s.bestTime) {
      s.bestTime = s.timeElapsed;
      localStorage.setItem('bestTime', s.bestTime.toString());
    }
    this._showGameOverScreen(reason);
  }

  _showGameOverScreen(reason) {
    const s = this.state;
    const overlay = this.add.graphics().setDepth(20);
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, W, H);

    const fmt = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

    this.add.text(CENTER_X, CENTER_Y - 80, 'GAME OVER', {
      fontSize: '42px', fill: '#ff4444', fontFamily: 'monospace', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(21);

    this.add.text(CENTER_X, CENTER_Y - 30, reason, {
      fontSize: '16px', fill: '#cccccc', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(21);

    this.add.text(CENTER_X, CENTER_Y + 20, `Survived: ${fmt(s.timeElapsed)}`, {
      fontSize: '22px', fill: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(21);

    this.add.text(CENTER_X, CENTER_Y + 55, `Best: ${fmt(s.bestTime)}`, {
      fontSize: '18px', fill: '#ffd700', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(21);

    this.add.text(CENTER_X, CENTER_Y + 100, 'Press R to restart', {
      fontSize: '16px', fill: '#aaaaaa', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(21);
  }

  _draw() {
    const s = this.state;
    const g = this.graphics;
    const fg = this.fireGraphics;
    const ug = this.uiGraphics;
    g.clear();
    fg.clear();
    ug.clear();
    this._warmGlowGfx.clear();

    const lightR = this._getLightRadius();

    // --- Background (dark forest) ---
    g.fillStyle(0x0a1a0a);
    g.fillRect(0, 0, W, H);

    // Forest texture dots
    g.fillStyle(0x0d2010);
    for (let i = 0; i < 200; i++) {
      // deterministic "random" using index
      const x = ((i * 137 + 73) % W);
      const y = ((i * 191 + 53) % H);
      const distC = Phaser.Math.Distance.Between(x, y, CENTER_X, CENTER_Y);
      if (distC > CLEARING_RADIUS + 10) {
        g.fillRect(x, y, 2, 2);
      }
    }

    // Clearing ground
    g.fillStyle(0x1a2e10);
    g.fillCircle(CENTER_X, CENTER_Y, CLEARING_RADIUS);

    // --- Trees ---
    for (const tree of s.trees) {
      if (tree.chopped) continue;
      // trunk
      g.fillStyle(0x5c3a1e);
      g.fillRect(tree.x - 7, tree.y - 18, 14, 26);
      // foliage
      g.fillStyle(0x1a4d1a);
      g.fillCircle(tree.x, tree.y - 22, 20);
      g.fillStyle(0x1e5c1e);
      g.fillCircle(tree.x, tree.y - 28, 14);

      // chop progress bar
      if (s.player.chopTarget === tree) {
        g.fillStyle(0x222222);
        g.fillRect(tree.x - 18, tree.y + 12, 36, 6);
        g.fillStyle(0xffcc00);
        g.fillRect(tree.x - 18, tree.y + 12, 36 * (s.player.chopProgress / 100), 6);
      }
    }

    // --- Logs ---
    for (const log of s.logs) {
      g.fillStyle(0x7a5030);
      g.fillRect(log.x - 12, log.y - 4, 24, 8);
      g.fillStyle(0x5c3a1e);
      g.fillRect(log.x - 12, log.y - 4, 4, 8);
      g.fillRect(log.x + 8, log.y - 4, 4, 8);
    }

    // --- Fire animation ---
    const t = this.time.now / 1000;
    const fireScale = 0.4 + (s.campfire.burn / 100) * 0.6;
    const flicker = Math.sin(t * 8) * 0.1 + Math.sin(t * 13) * 0.05;

    // Ember glow
    fg.fillStyle(0xff6600, 0.15 + flicker * 0.1);
    fg.fillCircle(CENTER_X, CENTER_Y, 38 * fireScale + flicker * 5);

    // Logs on fire
    fg.fillStyle(0x5c3a1e);
    fg.fillRect(CENTER_X - 16, CENTER_Y + 2, 32, 8);
    fg.fillRect(CENTER_X - 8, CENTER_Y - 2, 16, 8);

    // Fire base
    fg.fillStyle(0xff4400);
    fg.fillTriangle(
      CENTER_X - 14, CENTER_Y + 4,
      CENTER_X + 14, CENTER_Y + 4,
      CENTER_X, CENTER_Y - 18 * fireScale
    );
    // Middle flame
    fg.fillStyle(0xff8800);
    fg.fillTriangle(
      CENTER_X - 9, CENTER_Y + 4,
      CENTER_X + 9, CENTER_Y + 4,
      CENTER_X + (flicker * 8), CENTER_Y - 28 * fireScale
    );
    // Inner flame
    fg.fillStyle(0xffdd00);
    fg.fillTriangle(
      CENTER_X - 5, CENTER_Y + 4,
      CENTER_X + 5, CENTER_Y + 4,
      CENTER_X - (flicker * 5), CENTER_Y - 20 * fireScale
    );

    // --- Player ---
    const px = s.player.x;
    const py = s.player.y;

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(px, py + 12, 20, 6);

    // Body
    g.fillStyle(0x8B4513);
    g.fillRect(px - 8, py - 8, 16, 20);
    // Head
    g.fillStyle(0xffcc99);
    g.fillCircle(px, py - 14, 9);
    // Hat
    g.fillStyle(0x4a2800);
    g.fillRect(px - 9, py - 20, 18, 5);
    g.fillRect(px - 5, py - 28, 10, 9);

    // Carried log indicator
    if (s.player.carrying) {
      g.fillStyle(0x7a5030);
      g.fillRect(px + 8, py - 5, 18, 6);
    }

    // --- Monsters ---
    for (const m of s.monsters) {
      // Shadow
      g.fillStyle(0x000000, 0.4);
      g.fillEllipse(m.x, m.y + 10, 22, 7);

      // Body — dark triangle creature
      g.fillStyle(0x220033);
      g.fillTriangle(
        m.x, m.y - 18,
        m.x - 13, m.y + 12,
        m.x + 13, m.y + 12
      );
      // Eyes
      g.fillStyle(0xff2200);
      g.fillCircle(m.x - 4, m.y - 6, 3);
      g.fillCircle(m.x + 4, m.y - 6, 3);
    }

    // --- Warm firelight glow (below darkness, visible through the erased hole) ---
    const wg = this._warmGlowGfx;
    const flicker2 = Math.sin(t * 7) * 0.015;
    wg.fillStyle(0xff6600, 0.13 + flicker2);
    wg.fillCircle(CENTER_X, CENTER_Y, lightR * 0.95);
    wg.fillStyle(0xff9900, 0.09);
    wg.fillCircle(CENTER_X, CENTER_Y, lightR * 0.65);
    wg.fillStyle(0xffcc44, 0.06);
    wg.fillCircle(CENTER_X, CENTER_Y, lightR * 0.35);

    // --- Darkness: RenderTexture filled black, then a soft gradient hole erased ---
    this._darknessRT.clear();
    this._darknessRT.fill(0x000000, 0.95);

    // Build the erase stamp: concentric circles, outermost first (low alpha),
    // innermost last (full alpha). Each inner circle overwrites the outer ones,
    // so the final pixel alpha = alpha of the smallest circle that covers it.
    // Result: hard-lit center fading to dark at the edge of lightR.
    const STEPS = 20;
    this._maskGfx.clear();
    for (let i = 0; i < STEPS; i++) {
      const frac = i / (STEPS - 1);         // 0 = outermost, 1 = innermost
      const r = lightR * (1 - frac * 0.9);  // lightR → lightR * 0.1
      const alpha = Math.pow(frac, 1.4);    // eased: 0 at edge, 1 at center
      this._maskGfx.fillStyle(0xffffff, Math.max(0.01, alpha));
      this._maskGfx.fillCircle(CENTER_X, CENTER_Y, r);
    }
    // Guarantee a fully opaque center so the fire is always visible
    this._maskGfx.fillStyle(0xffffff, 1.0);
    this._maskGfx.fillCircle(CENTER_X, CENTER_Y, lightR * 0.1);
    this._darknessRT.erase(this._maskGfx);

    // --- HUD ---
    // Burn meter bar (left)
    ug.fillStyle(0x333333);
    ug.fillRect(12, 36, 16, 120);
    const meterH = Math.round((s.campfire.burn / 100) * 120);
    const burnColor = s.campfire.burn > 60 ? 0xff8800 : s.campfire.burn > 30 ? 0xff4400 : 0xcc0000;
    ug.fillStyle(burnColor);
    ug.fillRect(12, 36 + (120 - meterH), 16, meterH);
    ug.lineStyle(1, 0xffffff, 0.5);
    ug.strokeRect(12, 36, 16, 120);

    // Timer
    const fmt = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    this._timerText.setText(fmt(s.timeElapsed));

    // Carry indicator
    this._carryText.setText(s.player.carrying ? '[LOG]' : '');
  }
}

const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: '#000000',
  scene: [GameScene],
  parent: document.body,
};

new Phaser.Game(config);
