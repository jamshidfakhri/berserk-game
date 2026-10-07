// ==========================================
//   VENGEANCE — Mobile + Desktop
// ==========================================

const GAME_WIDTH  = 320;
const GAME_HEIGHT = 180;

// ---------- Palette ----------
const PALETTE = {
  o: '#0a0a0a',
  a: '#1a1410',
  b: '#3a2a1c',
  c: '#5a4030',
  r: '#8b0000',
  s: '#b0b0b0',
  f: '#c9986f',
};

// ---------- Hero sprite (16x24) ----------
const HERO_IDLE = [
  '................',
  '.....oooooo.....',
  '....obbbbbbo....',
  '....obbbbbbo....',
  '....orrrrrro....',
  '....obbbbbbo....',
  '.....oooooo.....',
  '...ooobbbbooo...',
  '..obbbbbbbbbbo..',
  '..obbbbbbbbbbo..',
  '..obrrrrrrrrbo..',
  '..obbbbbbbbbbo..',
  '..obbbbbbbbbbo..',
  '...obbbbbbbbo...',
  '....obbbbbbo....',
  '....obboobbo....',
  '....obboobbo....',
  '....obboobbo....',
  '....obboobbo....',
  '....obboobbo....',
  '....obboobbo....',
  '....oooooooo....',
  '................',
  '................',
];

function makePixelTexture(scene, key, frame, palette) {
  const h = frame.length;
  const w = frame[0].length;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    const row = frame[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.' || !palette[ch]) continue;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  tex.refresh();
}

function fixTextResolution(scene) {
  scene.children.list.forEach(obj => {
    if (obj.type === 'Text' && obj.setResolution) {
      obj.setResolution(4);
    }
  });
}

// ==========================================
//   Scene: Boot
// ==========================================
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makePixelTexture(this, 'hero', HERO_IDLE, PALETTE);
    this.scene.start('Load');
  }
}

// ==========================================
//   Scene: Load
// ==========================================
class LoadScene extends Phaser.Scene {
  constructor() { super('Load'); }

  create() {
    const cx = GAME_WIDTH / 2;
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;

    this.cameras.main.setBackgroundColor('#000000');

    this.add.rectangle(0, H - 25, W, 25, 0x050505).setOrigin(0, 0);
    this.add.rectangle(0, H - 25, W, 1, 0x1a0e08).setOrigin(0, 0);

    const logs = [
      { x: cx - 18, y: H - 28, w: 30, h: 5, angle: -12, color: 0x1a0e08 },
      { x: cx + 18, y: H - 28, w: 30, h: 5, angle: 12,  color: 0x1a0e08 },
      { x: cx - 7,  y: H - 33, w: 28, h: 5, angle: -4,  color: 0x2a1810 },
      { x: cx + 7,  y: H - 33, w: 28, h: 5, angle: 4,   color: 0x2a1810 },
    ];
    logs.forEach(l => {
      this.add.rectangle(l.x, l.y, l.w, l.h, l.color).setAngle(l.angle);
    });

    this.createSword(cx, H - 32);

    this.fireG = this.add.graphics();
    this.fireG.setDepth(1);

    const barY = H - 16;
    const barW = 110;
    const barH = 3;
    this.barW = barW;
    this.barH = barH;
    this.add.rectangle(cx, barY, barW + 6, barH + 6, 0x1a1a1a);
    this.add.rectangle(cx, barY, barW + 2, barH + 2, 0x000000);
    this.barFill = this.add.rectangle(cx - barW / 2, barY, 0, barH, 0x8b0000)
      .setOrigin(0, 0.5);

    this.progress = 0;
    this.elapsed = 0;
    this.duration = 2800;
    this.fireTime = 0;
    this.finished = false;

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  createSword(x, y) {
    const container = this.add.container(x, y);
    container.setDepth(2);
    const g = this.add.graphics();
    const blade = 0xd0d0d0;
    const bladeDark = 0x808080;
    const bladeEdge = 0xffffff;
    const guard = 0x7a4a20;
    const hilt = 0x1a0e08;

    g.fillStyle(hilt, 1);
    g.fillRect(-1, 8, 3, 10);
    g.fillStyle(guard, 1);
    g.fillRect(-2, 17, 5, 3);
    g.fillStyle(guard, 1);
    g.fillRect(-6, 6, 13, 3);

    const bladeLen = 34;
    for (let i = 0; i < bladeLen; i++) {
      const py = 6 - i;
      let px = -1;
      let w = 3;
      if (i >= bladeLen - 8) { px = -2; w = 4; }
      if (i >= bladeLen - 5) { px = -3; w = 5; }
      if (i >= bladeLen - 2) { px = -4; w = 6; }
      g.fillStyle(i < 3 ? bladeDark : blade, 1);
      g.fillRect(px, py, w, 1);
      g.fillStyle(bladeEdge, 0.9);
      g.fillRect(px + w - 1, py, 1, 1);
    }

    container.add(g);
    container.setAngle(-18);
  }

  update(time, delta) {
    this.elapsed += delta;
    this.progress = Math.min(this.elapsed / this.duration, 1);
    this.barFill.width = this.barW * this.progress;
    this.fireTime += delta;
    this.drawFire(this.progress);

    if (this.progress >= 1 && !this.finished) {
      this.finished = true;
      this.time.delayedCall(150, () => {
        this.cameras.main.flash(250, 255, 255, 255);
        this.time.delayedCall(350, () => {
          this.scene.start('Menu');
        });
      });
    }
  }

  drawFire(level) {
    const g = this.fireG;
    g.clear();
    const cx = GAME_WIDTH / 2;
    const baseY = GAME_HEIGHT - 32;
    const t = this.fireTime / 100;
    const intensity = 0.7 + level * 0.6;

    const columns = 7;
    for (let i = 0; i < columns; i++) {
      const offset = (i - (columns - 1) / 2) * 3;
      const x = cx + offset;
      const noise = Math.sin(t + i * 1.3) * 0.5 + Math.sin(t * 2.1 + i * 0.7) * 0.5;
      const centerFalloff = 1 - Math.abs(offset) / 14;
      const baseHeight = 14 + noise * 5 + (i % 2) * 2;
      const height = Math.max(3, baseHeight * intensity * centerFalloff);

      for (let h = 0; h < height; h++) {
        const y = baseY - h;
        const frac = h / height;
        let color;
        if (frac < 0.2)       color = 0xffe066;
        else if (frac < 0.45) color = 0xffaa22;
        else if (frac < 0.7)  color = 0xff5500;
        else if (frac < 0.88) color = 0x992200;
        else                  color = 0x331100;
        g.fillStyle(color, 1);
        g.fillRect(Math.floor(x), Math.floor(y), 3, 2);
      }
    }

    const sparkCount = Math.floor(4 * level);
    for (let i = 0; i < sparkCount; i++) {
      const sparkX = cx + Math.sin(t * 3 + i * 2.1) * 12;
      const sparkY = baseY - 18 - ((this.fireTime / 100 + i * 9) % 24);
      g.fillStyle(0xffcc33, 1);
      g.fillRect(Math.floor(sparkX), Math.floor(sparkY), 2, 2);
    }
  }
}

// ==========================================
//   Scene: Menu (with tap support)
// ==========================================
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.add.text(cx, cy - 35, 'VENGEANCE', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#8b0000',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 15, 'A tale written in blood', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: '#5a3a20',
    }).setOrigin(0.5);

    const items = [
      { text: 'New Game',   y: cy + 5  },
      { text: 'Continue',   y: cy + 22 },
      { text: 'Settings',   y: cy + 39 },
      { text: 'Best Score', y: cy + 56 },
    ];

    this.menuItems = [];

    items.forEach((it, i) => {
      const t = this.add.text(cx, it.y, it.text, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: i === 0 ? '#c8a878' : '#5a5a5a',
      }).setOrigin(0.5);
      this.menuItems.push(t);

      // Tap / click zone (works on both mouse and touch)
      const zone = this.add.zone(cx, it.y, 180, 16)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.selected = i;
        this.updateSelection();
        this.selectCurrent();
      });
      zone.on('pointerover', () => {
        this.selected = i;
        this.updateSelection();
      });
    });

    this.selected = 0;
    this.updateSelection();

    this.add.text(cx, GAME_HEIGHT - 8, 'TAP OR W/S + ENTER', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: '#333333',
    }).setOrigin(0.5);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      ENTER: Phaser.Input.Keyboard.KeyCodes.ENTER,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });
  }

  updateSelection() {
    this.menuItems.forEach((t, i) => {
      t.setColor(i === this.selected ? '#c8a878' : '#5a5a5a');
      t.setScale(i === this.selected ? 1.1 : 1.0);
    });
  }

  selectCurrent() {
    if (this.selected === 0) {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(220, () => this.scene.start('Game'));
    }
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.keys.W)) {
      this.selected = (this.selected - 1 + this.menuItems.length) % this.menuItems.length;
      this.updateSelection();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
        Phaser.Input.Keyboard.JustDown(this.keys.S)) {
      this.selected = (this.selected + 1) % this.menuItems.length;
      this.updateSelection();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER) ||
        Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.selectCurrent();
    }
  }
}

// ==========================================
//   Scene: Game
// ==========================================
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    const GROUND_Y = 150;

    const ground = this.add.rectangle(0, GROUND_Y, GAME_WIDTH, 60, 0x151515)
      .setOrigin(0, 0);
    this.physics.add.existing(ground, true);
    this.add.rectangle(0, GROUND_Y, GAME_WIDTH, 1, 0x4a3428).setOrigin(0, 0);

    this.player = this.physics.add.sprite(60, GROUND_Y - 12, 'hero');
    this.player.body.setSize(16, 24);
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, ground);

    this.slashG = this.add.graphics();
    this.slashG.setDepth(10);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      J: Phaser.Input.Keyboard.KeyCodes.J,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    this.input.on('pointerdown', () => {
      this.tryAttack();
    });

    this.MOVE_SPEED = 90;
    this.JUMP_VELOCITY = -280;

    this.attacking = false;
    this.attackTimer = 0;
    this.ATTACK_DURATION = 250;
    this.SLASH_VISIBLE = 130;
    this.attackCooldown = 0;
    this.COOLDOWN = 80;

    this.add.text(6, 6, 'A/D move  Space jump  J attack  ESC menu', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: '#3a3a3a',
    }).setDepth(20);
  }

  tryAttack() {
    if (this.attacking) return;
    if (this.attackCooldown > 0) return;
    this.attacking = true;
    this.attackTimer = 0;
  }

  update(time, delta) {
    const body = this.player.body;
    const onGround = body.blocked.down || body.touching.down;

    if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
      this.tryAttack();
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    if (this.attacking) {
      this.attackTimer += delta;
      if (this.attackTimer <= this.SLASH_VISIBLE) {
        const p = this.attackTimer / this.SLASH_VISIBLE;
        this.drawSlash(p);
      } else {
        this.slashG.clear();
      }
      if (this.attackTimer >= this.ATTACK_DURATION) {
        this.attacking = false;
        this.attackCooldown = this.COOLDOWN;
        this.slashG.clear();
      }
    }

    const left  = this.cursors.left.isDown  || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;

    const speedMul = this.attacking ? 0.25 : 1;
    const speed = this.MOVE_SPEED * speedMul;

    if (left && !right) {
      body.setVelocityX(-speed);
      this.player.setFlipX(true);
    } else if (right && !left) {
      body.setVelocityX(speed);
      this.player.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.keys.W);

    if (jumpPressed && onGround && !this.attacking) {
      body.setVelocityY(this.JUMP_VELOCITY);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.scene.start('Menu');
    }
  }

  drawSlash(progress) {
    const g = this.slashG;
    g.clear();

    const px = this.player.x;
    const py = this.player.y;
    const dir = this.player.flipX ? -1 : 1;

    const grow = Math.sin(progress * Math.PI);
    const outerR = 6 + 20 * grow;
    const innerR = 3 + 8  * grow;
    const alpha = Math.max(0, 1 - progress * 0.7);

    const startA = -0.95;
    const endA   =  0.95;
    const cols   = 14;

    for (let i = 0; i <= cols; i++) {
      const a = startA + (endA - startA) * (i / cols);
      const ox = px + Math.cos(a) * outerR * dir;
      const oy = py + Math.sin(a) * outerR;

      const rsteps = Math.max(1, Math.floor(outerR - innerR));
      for (let s = 0; s < rsteps; s++) {
        const r = innerR + s;
        const ix = px + Math.cos(a) * r * dir;
        const iy = py + Math.sin(a) * r;
        const fillAlpha = alpha * (0.35 + 0.4 * (s / rsteps));
        g.fillStyle(0xaaaaaa, fillAlpha);
        g.fillRect(Math.round(ix), Math.round(iy), 1, 1);
      }

      g.fillStyle(0xffffff, alpha);
      g.fillRect(Math.round(ox), Math.round(oy), 2, 2);
    }

    if (progress > 0.15 && progress < 0.7) {
      const tipA = (dir > 0 ? endA : startA);
      const tipX = px + Math.cos(tipA) * outerR * dir;
      const tipY = py + Math.sin(tipA) * outerR;
      g.fillStyle(0xffdd88, alpha);
      g.fillRect(Math.round(tipX) - 1, Math.round(tipY) - 1, 3, 3);
    }
  }
}

// ==========================================
//   Config
// ==========================================
const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  antialiasGL: false,
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  backgroundColor: '#0a0a0a',
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 900 }, debug: false },
  },
  scene: [BootScene, LoadScene, MenuScene, GameScene],
};

new Phaser.Game(config);