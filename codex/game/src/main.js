const WORLD_RADIUS = 5200;
const CLEARING_RADIUS = 150;
const INITIAL_BURN = 80;
const BASE_DECAY_RATE = 1.7;
const LOG_VALUE = 22;
const MIN_LIGHT_RADIUS = 120;
const LIGHT_FACTOR = 3.2;
const PLAYER_SPEED = 165;
const CHOP_RANGE = 54;
const CHOP_DURATION = 2.1;
const LOG_PICKUP_RANGE = 32;
const FIRE_DELIVERY_RANGE = 72;
const BURN_LOSS_GAMEOVER_DELAY = 0;
const MONSTER_LIGHT_BUFFER = 18;
const MONSTER_EDGE_ESCAPE_SPEED = 36;
const MONSTER_EDGE_TANGENT_SPEED = 30;

class CampfireSurvivalScene extends Phaser.Scene {
  constructor() {
    super("campfire-survival");
  }

  preload() {
    this.createProceduralTextures();
  }

  create() {
    this.state = {
      timeElapsed: 0,
      bestTime: this.loadBestTime(),
      isGameOver: false,
      campfire: {
        burn: INITIAL_BURN,
        decayRate: BASE_DECAY_RATE,
        lightRadius: MIN_LIGHT_RADIUS + INITIAL_BURN * LIGHT_FACTOR,
      },
      player: {
        carrying: false,
        chopProgress: 0,
      },
      trees: [],
      logs: [],
      monsters: [],
    };

    this.spawnAccumulator = 0;
    this.fireOutAccumulator = 0;
    this.activeChopTree = null;

    this.physics.world.setBounds(
      -WORLD_RADIUS,
      -WORLD_RADIUS,
      WORLD_RADIUS * 2,
      WORLD_RADIUS * 2,
    );

    this.cameras.main.setBackgroundColor(0x060907);

    this.createGround();
    this.createCampfire();
    this.createPlayer();
    this.createTrees();
    this.createLighting();
    this.createHud();
    this.createInput();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.05);
    this.cameras.main.setRoundPixels(true);

    this.physics.add.overlap(this.player, this.monsterGroup, () => {
      this.endGame("A monster reached you.");
    });
  }

  createProceduralTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.clear();
    g.fillStyle(0x5a3b22, 1);
    g.fillRect(0, 0, 22, 18);
    g.fillStyle(0x356c30, 1);
    g.fillCircle(11, 8, 11);
    g.generateTexture("tree", 22, 18);

    g.clear();
    g.fillStyle(0x6d4a2a, 1);
    g.fillRoundedRect(0, 0, 18, 8, 2);
    g.generateTexture("log", 18, 8);

    g.clear();
    g.fillStyle(0x91643e, 1);
    g.fillRect(4, 0, 16, 24);
    g.fillStyle(0xf1d3b2, 1);
    g.fillCircle(12, 7, 6);
    g.fillStyle(0x2f4f66, 1);
    g.fillRect(0, 12, 24, 16);
    g.generateTexture("player", 24, 28);

    g.clear();
    g.fillStyle(0x6f0f1a, 1);
    g.beginPath();
    g.moveTo(12, 0);
    g.lineTo(24, 24);
    g.lineTo(0, 24);
    g.closePath();
    g.fillPath();
    g.generateTexture("monster", 24, 24);

    g.clear();
    g.fillStyle(0x2f402d, 1);
    g.fillRect(0, 0, 96, 96);
    g.fillStyle(0x253524, 1);
    for (let i = 0; i < 120; i += 1) {
      g.fillCircle(
        Phaser.Math.Between(0, 96),
        Phaser.Math.Between(0, 96),
        Phaser.Math.Between(1, 2),
      );
    }
    g.generateTexture("ground", 96, 96);
  }

  createGround() {
    this.add
      .tileSprite(0, 0, WORLD_RADIUS * 2.5, WORLD_RADIUS * 2.5, "ground")
      .setOrigin(0.5)
      .setDepth(-20);

    this.add
      .circle(0, 0, CLEARING_RADIUS + 30, 0x1e281b, 0.85)
      .setDepth(-10)
      .setBlendMode(Phaser.BlendModes.SCREEN);
  }

  createCampfire() {
    this.campfire = this.add.container(0, 0).setDepth(70);

    const logsA = this.add.rectangle(0, 0, 38, 7, 0x6f4b2c);
    logsA.setRotation(0.45);

    const logsB = this.add.rectangle(0, 0, 38, 7, 0x6f4b2c);
    logsB.setRotation(-0.45);

    this.fireGlow = this.add.circle(0, -8, 34, 0xff5f1f, 0.28);
    this.fireCore = this.add.triangle(0, -11, 0, 26, 9, 0, 18, 26, 0xffb347, 1);
    this.fireInner = this.add.triangle(0, -7, 0, 20, 6, 0, 12, 20, 0xffdc78, 0.95);

    this.campfire.add([this.fireGlow, logsA, logsB, this.fireCore, this.fireInner]);
  }

  createPlayer() {
    this.player = this.physics.add
      .image(0, CLEARING_RADIUS - 32, "player")
      .setDepth(80)
      .setDamping(true)
      .setDrag(0.85)
      .setMaxVelocity(PLAYER_SPEED);

    this.player.body.setSize(16, 22);
    this.player.body.setOffset(4, 6);

    this.carriedLogSprite = this.add
      .image(this.player.x, this.player.y - 22, "log")
      .setVisible(false)
      .setDepth(90)
      .setScale(0.9);
  }

  createTrees() {
    this.treeGroup = this.add.group();
    this.logGroup = this.add.group();
    this.monsterGroup = this.physics.add.group();

    const trees = [];
    const targetTreeCount = 180;

    let attempts = 0;
    while (trees.length < targetTreeCount && attempts < targetTreeCount * 60) {
      attempts += 1;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(CLEARING_RADIUS + 80, WORLD_RADIUS - 350);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      let valid = true;
      for (let i = 0; i < trees.length; i += 1) {
        const dx = trees[i].x - x;
        const dy = trees[i].y - y;
        if (dx * dx + dy * dy < 62 * 62) {
          valid = false;
          break;
        }
      }

      if (!valid) {
        continue;
      }

      const sprite = this.add.image(x, y, "tree").setDepth(35);
      sprite.setTint(Phaser.Display.Color.GetColor(44, Phaser.Math.Between(92, 132), 44));

      const tree = {
        id: `${x.toFixed(1)}:${y.toFixed(1)}`,
        x,
        y,
        sprite,
        chopDuration: CHOP_DURATION,
        destroyed: false,
      };

      trees.push(tree);
      this.treeGroup.add(sprite);
    }

    this.state.trees = trees;
  }

  createLighting() {
    const { width, height } = this.scale;

    this.darkness = this.add
      .rectangle(0, 0, width, height, 0x010102, 0.9)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(600);

    this.maskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    this.lightMask = this.maskGraphics.createGeometryMask();
    this.lightMask.setInvertAlpha(true);
    this.darkness.setMask(this.lightMask);
  }

  createHud() {
    const hudDepth = 1000;

    this.burnBg = this.add
      .rectangle(24, 24, 210, 18, 0x171717, 0.95)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(hudDepth);

    this.burnFill = this.add
      .rectangle(27, 27, 204, 12, 0xff8d1f, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);

    this.burnText = this.add
      .text(24, 46, "Fire", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#f2d9b2",
      })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);

    this.timerText = this.add
      .text(this.scale.width / 2, 22, "00:00", {
        fontFamily: "Trebuchet MS",
        fontSize: "26px",
        color: "#f7efe2",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);

    this.carryText = this.add
      .text(24, 68, "Carrying: nothing", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#d6d6d6",
      })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);

    this.chopText = this.add
      .text(24, 88, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "14px",
        color: "#d6d6d6",
      })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);

    this.gameOverLayer = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.65)
      .setScrollFactor(0)
      .setDepth(1200)
      .setVisible(false);

    this.gameOverTitle = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 80, "Game Over", {
        fontFamily: "Trebuchet MS",
        fontSize: "54px",
        color: "#ffd4a8",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1201)
      .setVisible(false);

    this.gameOverStats = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 10, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
        align: "center",
        color: "#fff0dd",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1201)
      .setVisible(false);

    this.gameOverHint = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 90, "Press R to restart", {
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        color: "#f0ddb8",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1201)
      .setVisible(false);
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,R");

    this.keys.R.on("down", () => {
      if (this.state.isGameOver) {
        this.scene.restart();
      }
    });
  }

  update(_, deltaMs) {
    const dt = deltaMs / 1000;

    if (this.state.isGameOver) {
      this.player.setVelocity(0, 0);
      return;
    }

    this.updateTime(dt);
    this.updatePlayerMovement();
    this.updateChopping(dt);
    this.updateLogs();
    this.updateCampfire(dt);
    this.updateMonsters(dt);
    this.updateFireVisuals(dt);
    this.updateLightingMask();
    this.updateHud();
  }

  updateTime(dt) {
    this.state.timeElapsed += dt;
  }

  updatePlayerMovement() {
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;

    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    this.player.setAcceleration(dx * PLAYER_SPEED * 8, dy * PLAYER_SPEED * 8);
    this.player.rotation = Math.atan2(dy || this.player.body.velocity.y, dx || this.player.body.velocity.x) + Math.PI / 2;

    this.carriedLogSprite.setPosition(this.player.x + 8, this.player.y - 20);
  }

  updateChopping(dt) {
    if (this.state.player.carrying) {
      this.state.player.chopProgress = 0;
      this.activeChopTree = null;
      this.chopText.setText("");
      return;
    }

    const nearestTree = this.getNearestAvailableTree(CHOP_RANGE);

    if (!nearestTree) {
      this.state.player.chopProgress = 0;
      this.activeChopTree = null;
      this.chopText.setText("");
      return;
    }

    if (!this.activeChopTree || this.activeChopTree.id !== nearestTree.id) {
      this.activeChopTree = nearestTree;
      this.state.player.chopProgress = 0;
    }

    this.state.player.chopProgress += dt / nearestTree.chopDuration;
    const pct = Math.min(100, Math.floor(this.state.player.chopProgress * 100));
    this.chopText.setText(`Chopping: ${pct}%`);

    if (this.state.player.chopProgress >= 1) {
      this.chopTree(nearestTree);
      this.state.player.chopProgress = 0;
      this.activeChopTree = null;
      this.chopText.setText("");
    }
  }

  getNearestAvailableTree(range) {
    const rangeSq = range * range;
    let nearest = null;
    let best = Number.POSITIVE_INFINITY;

    for (let i = 0; i < this.state.trees.length; i += 1) {
      const tree = this.state.trees[i];
      if (tree.destroyed) {
        continue;
      }

      const dx = tree.x - this.player.x;
      const dy = tree.y - this.player.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < rangeSq && distSq < best) {
        best = distSq;
        nearest = tree;
      }
    }

    return nearest;
  }

  chopTree(tree) {
    tree.destroyed = true;
    tree.sprite.destroy();

    const log = this.add
      .image(tree.x, tree.y + 8, "log")
      .setDepth(45)
      .setRotation(Phaser.Math.FloatBetween(-0.5, 0.5));

    this.logGroup.add(log);
    this.state.logs.push({ x: tree.x, y: tree.y, sprite: log });
  }

  updateLogs() {
    if (!this.state.player.carrying) {
      const pickup = this.getNearestLog(LOG_PICKUP_RANGE);
      if (pickup) {
        this.state.player.carrying = true;
        this.carryText.setText("Carrying: log");
        this.carriedLogSprite.setVisible(true);
        pickup.sprite.destroy();
        this.state.logs = this.state.logs.filter((log) => log !== pickup);
      }
    }

    const distanceToFire = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.campfire.x,
      this.campfire.y,
    );

    if (this.state.player.carrying && distanceToFire <= FIRE_DELIVERY_RANGE) {
      this.state.player.carrying = false;
      this.carryText.setText("Carrying: nothing");
      this.carriedLogSprite.setVisible(false);
      this.state.campfire.burn = Math.min(100, this.state.campfire.burn + LOG_VALUE);
    }
  }

  getNearestLog(range) {
    const rangeSq = range * range;
    let nearest = null;
    let best = Number.POSITIVE_INFINITY;

    for (let i = 0; i < this.state.logs.length; i += 1) {
      const log = this.state.logs[i];
      const dx = log.x - this.player.x;
      const dy = log.y - this.player.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < rangeSq && distSq < best) {
        best = distSq;
        nearest = log;
      }
    }

    return nearest;
  }

  updateCampfire(dt) {
    const elapsed = this.state.timeElapsed;
    const escalation = 1 + Math.min(2, elapsed / 85);
    this.state.campfire.decayRate = BASE_DECAY_RATE * escalation;

    this.state.campfire.burn = Math.max(0, this.state.campfire.burn - this.state.campfire.decayRate * dt);
    this.state.campfire.lightRadius =
      MIN_LIGHT_RADIUS + this.state.campfire.burn * LIGHT_FACTOR;

    if (this.state.campfire.burn <= 0) {
      this.fireOutAccumulator += dt;
      if (this.fireOutAccumulator >= BURN_LOSS_GAMEOVER_DELAY) {
        this.endGame("The fire died out.");
      }
    } else {
      this.fireOutAccumulator = 0;
    }
  }

  updateMonsters(dt) {
    const t = this.state.timeElapsed;
    const spawnInterval = Phaser.Math.Linear(3.6, 0.85, Math.min(1, t / 200));
    const lightBoundary = this.state.campfire.lightRadius + MONSTER_LIGHT_BUFFER;

    this.spawnAccumulator += dt;
    if (this.spawnAccumulator >= spawnInterval) {
      this.spawnAccumulator = 0;
      this.spawnMonster();
    }

    const burn = this.state.campfire.burn;
    const hunt = burn < 45;
    const fear = burn > 65;

    this.state.monsters.forEach((monster) => {
      if (!monster.sprite.active) {
        return;
      }

      let vx = 0;
      let vy = 0;

      if (fear) {
        const awayX = monster.sprite.x - this.campfire.x;
        const awayY = monster.sprite.y - this.campfire.y;
        const mag = Math.hypot(awayX, awayY) || 1;
        vx = (awayX / mag) * (monster.speed + 28);
        vy = (awayY / mag) * (monster.speed + 28);
      } else if (hunt) {
        const toPlayerX = this.player.x - monster.sprite.x;
        const toPlayerY = this.player.y - monster.sprite.y;
        const mag = Math.hypot(toPlayerX, toPlayerY) || 1;
        vx = (toPlayerX / mag) * (monster.speed + 32 + Math.min(40, t * 0.18));
        vy = (toPlayerY / mag) * (monster.speed + 32 + Math.min(40, t * 0.18));
      } else {
        const toPlayerX = this.player.x - monster.sprite.x;
        const toPlayerY = this.player.y - monster.sprite.y;
        const mag = Math.hypot(toPlayerX, toPlayerY) || 1;
        vx = (toPlayerX / mag) * (monster.speed + 4);
        vy = (toPlayerY / mag) * (monster.speed + 4);
      }

      const fromFireX = monster.sprite.x - this.campfire.x;
      const fromFireY = monster.sprite.y - this.campfire.y;
      const distFromFire = Math.hypot(fromFireX, fromFireY);
      const normalX = distFromFire > 0.0001 ? fromFireX / distFromFire : 1;
      const normalY = distFromFire > 0.0001 ? fromFireY / distFromFire : 0;

      if (distFromFire < lightBoundary) {
        const safeX = this.campfire.x + normalX * lightBoundary;
        const safeY = this.campfire.y + normalY * lightBoundary;
        monster.sprite.body.reset(safeX, safeY);
        const escapeSpeed = monster.speed + MONSTER_EDGE_ESCAPE_SPEED;
        vx = normalX * escapeSpeed;
        vy = normalY * escapeSpeed;
      } else {
        const inwardSpeed = -(vx * normalX + vy * normalY);
        const nextDistance = distFromFire - inwardSpeed * dt;
        if (inwardSpeed > 0 && nextDistance < lightBoundary) {
          const tangentX = -normalY;
          const tangentY = normalX;
          const tangentSign = vx * tangentX + vy * tangentY >= 0 ? 1 : -1;
          const tangentSpeed = Math.max(
            MONSTER_EDGE_TANGENT_SPEED,
            Math.hypot(vx, vy) * 0.55,
          );
          vx = tangentX * tangentSpeed * tangentSign + normalX * 10;
          vy = tangentY * tangentSpeed * tangentSign + normalY * 10;
        }
      }

      monster.sprite.body.setVelocity(vx, vy);
      monster.sprite.rotation = Math.atan2(vy, vx) + Math.PI / 2;
    });

    if (this.state.monsters.length > 80) {
      const removeCount = this.state.monsters.length - 80;
      for (let i = 0; i < removeCount; i += 1) {
        const monster = this.state.monsters.shift();
        if (monster && monster.sprite.active) {
          monster.sprite.destroy();
        }
      }
    }
  }

  spawnMonster() {
    const margin = Phaser.Math.Between(90, 220);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = this.state.campfire.lightRadius + margin + Phaser.Math.Between(100, 280);

    const x = this.campfire.x + Math.cos(angle) * distance;
    const y = this.campfire.y + Math.sin(angle) * distance;

    if (Math.hypot(x, y) > WORLD_RADIUS - 80) {
      return;
    }

    const monsterSprite = this.monsterGroup
      .create(x, y, "monster")
      .setDepth(78)
      .setTint(Phaser.Display.Color.GetColor(Phaser.Math.Between(130, 180), 30, 45));

    monsterSprite.body.setCircle(9);
    monsterSprite.body.setOffset(3, 3);

    this.state.monsters.push({
      sprite: monsterSprite,
      speed: Phaser.Math.Between(48, 74),
    });
  }

  updateFireVisuals(dt) {
    const burn01 = this.state.campfire.burn / 100;
    const pulse = 0.95 + Math.sin(this.state.timeElapsed * (7 + (1 - burn01) * 6)) * 0.06;
    const wobble = Phaser.Math.FloatBetween(0.95, 1.06);

    this.fireCore.setScale((0.58 + burn01 * 0.9) * pulse * wobble);
    this.fireInner.setScale((0.5 + burn01 * 0.75) * pulse);
    this.fireGlow.setScale((0.45 + burn01 * 1.4) * pulse);

    const glowAlpha = 0.12 + burn01 * 0.27;
    this.fireGlow.setAlpha(glowAlpha);
  }

  updateLightingMask() {
    this.maskGraphics.clear();
    this.maskGraphics.fillStyle(0xffffff, 1);
    this.maskGraphics.fillCircle(
      this.campfire.x,
      this.campfire.y,
      this.state.campfire.lightRadius,
    );
  }

  updateHud() {
    const burn = this.state.campfire.burn;
    const width = 204 * (burn / 100);
    this.burnFill.width = Math.max(0, width);

    const burnColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(255, 62, 34),
      new Phaser.Display.Color(255, 180, 90),
      100,
      burn,
    );
    this.burnFill.fillColor = Phaser.Display.Color.GetColor(burnColor.r, burnColor.g, burnColor.b);

    this.timerText.setText(this.formatTime(this.state.timeElapsed));
  }

  formatTime(seconds) {
    const total = Math.floor(seconds);
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  endGame(reason) {
    if (this.state.isGameOver) {
      return;
    }

    this.state.isGameOver = true;

    const survival = this.state.timeElapsed;
    const best = Math.max(this.state.bestTime, survival);
    if (best > this.state.bestTime) {
      this.saveBestTime(best);
      this.state.bestTime = best;
    }

    this.gameOverLayer.setVisible(true);
    this.gameOverTitle.setVisible(true);
    this.gameOverStats
      .setText(
        `${reason}\nSurvived: ${this.formatTime(survival)}\nBest: ${this.formatTime(best)}`,
      )
      .setVisible(true);
    this.gameOverHint.setVisible(true);

    this.player.setAcceleration(0, 0);
    this.player.setVelocity(0, 0);
    this.monsterGroup.children.iterate((monster) => {
      if (monster?.body) {
        monster.body.setVelocity(0, 0);
      }
    });
  }

  loadBestTime() {
    try {
      const raw = window.localStorage.getItem("campfire-survival-best-time");
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  saveBestTime(value) {
    try {
      window.localStorage.setItem("campfire-survival-best-time", String(value));
    } catch {
      // No-op when localStorage is blocked.
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "app",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#050607",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 0 },
    },
  },
  scene: [CampfireSurvivalScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
