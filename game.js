// ==========================================
//   VENGEANCE — قدم اول: حرکت و پرش
// ==========================================

const GAME_WIDTH  = 320;
const GAME_HEIGHT = 180;

// ---------- پالت رنگ پیکسلی ----------
const PALETTE = {
  o: '#0a0a0a',
  a: '#1a1410',
  b: '#3a2a1c',
  c: '#5a4030',
  r: '#8b0000',
  s: '#b0b0b0',
  f: '#c9986f',
};

// ---------- فریم شخصیت (16x24) ----------
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

// ---------- تبدیل آرایه‌ی پیکسلی به تکسچر ----------
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
    this.scene.start('Game');
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

    this.MOVE_SPEED    = 90;
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
    arcade: {
      gravity: { y: 900 },
      debug: false,
    },
  },
  scene: [BootScene, GameScene],
};

new Phaser.Game(config);