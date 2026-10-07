// ==========================================
//   VENGEANCE — Load + Menu + Game
// ==========================================

const GAME_WIDTH  = 320;
const GAME_HEIGHT = 180;

// ---------- پالت ----------
const PALETTE = {
  o: '#0a0a0a',
  a: '#1a1410',
  b: '#3a2a1c',
  c: '#5a4030',
  r: '#8b0000',
  s: '#b0b0b0',
  f: '#c9986f',
};

// ---------- اسپرایت شخصیت (16x24) ----------
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

    // ----- زمین -----
    this.add.rectangle(0, H - 25, W, 25, 0x050505).setOrigin(0, 0);
    this.add.rectangle(0, H - 25, W, 1, 0x1a0e08).setOrigin(0, 0);

    // ----- چوب‌ها -----
    const logs = [
      { x: cx - 15, y: H - 28, w: 26, h: 4, angle: -12, color: 0x1a0e08 },
      { x: cx + 15, y: H - 28, w: 26, h: 4, angle: 12, color: 0x1a0e08 },
      { x: cx - 6,  y: H - 32, w: 24, h: 4, angle: -4,  color: 0x2a1810 },
      { x: cx + 6,  y: H - 32, w: 24, h: 4, angle: 4,   color: 0x2a1810 },
    ];
    logs.forEach(l => {
      this.add.rectangle(l.x, l.y, l.w, l.h, l.color).setAngle(l.angle);
    });

    // ----- شمشیر کج -----
    this.createSword(cx, H - 30);

    // ----- آتیش -----
    this.fireG = this.add.graphics();
    this.fireG.setDepth(1);

    // ----- بار لودینگ -----
    const barY = H - 18;
    const barW = 100;
    const barH = 2;
    this.barW = barW;
    this.barH = barH;
    this.add.rectangle(cx, barY, barW + 4, barH + 4, 0x1a1a1a);
    this.add.rectangle(cx, barY, barW, barH, 0x000000);
    this.barFill = this.add.rectangle(cx - barW / 2, barY, 0, barH, 0x8b0000)
      .setOrigin(0, 0.5);

    // ----- جمله‌ها -----
    this.sentences = [
      'خون، فقط خون می‌مونه...',
      'انتقام صبر می‌کنه.',
      'شمشیرت سنگینه؟ خوبه.',
    ];
    this.sentenceText = this.add.text(cx, H - 8, '', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#6a4030',
    }).setOrigin(0.5);

    // ----- متغیرها -----
    this.progress = 0;
    this.elapsed = 0;
    this.duration = 2800;
    this.fireTime = 0;
    this.sentenceIdx = 0;
    this.sentenceTimer = 0;
    this.finished = false;
    this.sentenceText.setAlpha(0);

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  createSword(x, y) {
    const container = this.add.container(x, y);
    container.setDepth(2);

    const g = this.add.graphics();
    const blade = 0xb8b8b8;
    const bladeDark = 0x707070;
    const guard = 0x7a4a20;
    const hilt = 0x1a0e08;

    // دسته (پایین)
    g.fillStyle(hilt, 1);
    g.fillRect(-1, 6, 2, 8);

    // گارد
    g.fillStyle(guard, 1);
    g.fillRect(-4, 5, 8, 2);

    // تیغه - با نوک کج به چپ
    for (let i = 0; i < 28; i++) {
      const py = 5 - i;
      let px = -1;
      if (i >= 22) px = -2;
      if (i >= 25) px = -3;
      g.fillStyle(i < 2 ? bladeDark : blade, 1);
      g.fillRect(px, py, 2, 1);
    }

    // لبه‌ی روشن تیغه
    g.fillStyle(0xffffff, 0.35);
    for (let i = 3; i < 22; i++) {
      g.fillRect(-1, 5 - i, 1, 1);
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

    // چرخش جمله‌ها
    this.sentenceTimer += delta;
    if (this.sentenceTimer < 200) {
      this.sentenceText.setAlpha(this.sentenceTimer / 200);
    } else if (this.sentenceTimer < 900) {
      this.sentenceText.setAlpha(1);
    } else if (this.sentenceTimer < 1200) {
      this.sentenceText.setAlpha((1200 - this.sentenceTimer) / 300);
    } else {
      this.sentenceTimer = 0;
      this.sentenceIdx = (this.sentenceIdx + 1) % this.sentences.length;
      this.sentenceText.setText(this.sentences[this.sentenceIdx]);
    }

    // پایان
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
    const baseY = GAME_HEIGHT - 30;
    const t = this.fireTime / 100;
    const intensity = 0.6 + level * 0.5;

    const columns = 9;
    for (let i = 0; i < columns; i++) {
      const offset = (i - columns / 2) * 2;
      const x = cx + offset;

      const noise = Math.sin(t + i * 1.3) * 0.5 + Math.sin(t * 2.1 + i * 0.7) * 0.5;
      const centerFalloff = 1 - Math.abs(offset) / 10;
      const baseHeight = 10 + noise * 4 + (i % 2) * 2;
      const height = Math.max(2, baseHeight * intensity * centerFalloff);

      for (let h = 0; h < height; h++) {
        const y = baseY - h;
        const frac = h / height;

        let color;
        if (frac < 0.25) color = 0xffdd44;
        else if (frac < 0.5) color = 0xff8800;
        else if (frac < 0.75) color = 0xcc3300;
        else if (frac < 0.9) color = 0x661100;
        else color = 0x221100;

        g.fillStyle(color, 1);
        g.fillRect(Math.floor(x), Math.floor(y), 2, 1);
      }
    }

    // جرقه‌ها
    const sparkCount = Math.floor(3 * level);
    for (let i = 0; i < sparkCount; i++) {
      const sparkX = cx + Math.sin(t * 3 + i * 2.1) * 8;
      const sparkY = baseY - 15 - ((this.fireTime / 100 + i * 7) % 20);
      g.fillStyle(0xffaa00, 0.8);
      g.fillRect(Math.floor(sparkX), Math.floor(sparkY), 1, 1);
    }
  }
}

// ==========================================
//   Scene: Menu (موقت)
// ==========================================
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.add.text(cx, cy - 20, 'VENGEANCE', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#8b0000',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 10, '▶ شروع بازی جدید', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.add.text(cx, GAME_HEIGHT - 10, 'v0.1', {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#444444',
    }).setOrigin(0.5);

    // با هر کلیدی → بازی
    this.input.keyboard.once('keydown', () => {
      this.scene.start('Game');
    });
  }
}

// ==========================================
//   Scene: Game
// ==========================================
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0a');

    const GROUND_Y = 150;

    const ground = this.add.rectangle(0, GROUND_Y, GAME_WIDTH, 60, 0x151515)
      .setOrigin(0, 0);
    this.physics.add.existing(ground, true);
    this.add.rectangle(0, GROUND_Y, GAME_WIDTH, 1, 0x4a3428).setOrigin(0, 0);

    this.player = this.physics.add.sprite(60, GROUND_Y - 12, 'hero');
    this.player.body.setSize(16, 24);
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, ground);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this.MOVE_SPEED = 90;
    this.JUMP_VELOCITY = -280;
  }

  update() {
    const body = this.player.body;
    const onGround = body.blocked.down || body.touching.down;

    const left  = this.cursors.left.isDown  || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;

    if (left && !right) {
      body.setVelocityX(-this.MOVE_SPEED);
      this.player.setFlipX(true);
    } else if (right && !left) {
      body.setVelocityX(this.MOVE_SPEED);
      this.player.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.keys.W);

    if (jumpPressed && onGround) {
      body.setVelocityY(this.JUMP_VELOCITY);
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
  backgroundColor: '#0a0a0a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 900 }, debug: false },
  },
  scene: [BootScene, LoadScene, MenuScene, GameScene],
};

new Phaser.Game(config);