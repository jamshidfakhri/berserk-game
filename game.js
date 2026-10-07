/* ============================================
   Vengeance — Base Game
   حرکت + حمله + دوربین اسکرول + نقشه + نور
   ============================================ */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W = 0, H = 0;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

// ============ اندازه‌دهی ============
function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = Math.floor(rect.width  * DPR);
  canvas.height = Math.floor(rect.height * DPR);
  canvas.style.width  = rect.width  + 'px';
  canvas.style.height = rect.height + 'px';
  W = rect.width;
  H = rect.height;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

// ============ دنیا (نقشه) ============
const WORLD = {
  w: 0,
  h: 0,
  tile: 90,
  mult: 5, // ۵ برابر صفحه
};

function initWorld() {
  WORLD.w = W * WORLD.mult;
  WORLD.h = H * WORLD.mult;
}

// ============ دوربین ============
const camera = {
  x: 0,
  y: 0,
  lerp: 0.09,
};

function updateCamera() {
  const tx = player.x - W / 2;
  const ty = player.y - H / 2;
  camera.x += (tx - camera.x) * camera.lerp;
  camera.y += (ty - camera.y) * camera.lerp;
  // محدود به لبه‌های نقشه
  camera.x = Math.max(0, Math.min(WORLD.w - W, camera.x));
  camera.y = Math.max(0, Math.min(WORLD.h - H, camera.y));
}

// ============ بازیکن ============
const player = {
  x: 0, y: 0,
  r: 16,
  speed: 4.2,
  angle: -Math.PI / 2, // رو به بالا
  attackTimer: 0,
  attackCooldown: 0,
  attackDuration: 14,
  attackCD: 22,
};

function initPlayer() {
  player.x = WORLD.w / 2;
  player.y = WORLD.h * 0.7; // پایین‌تر از وسط
  player.angle = -Math.PI / 2;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  camera.x = player.x - W / 2;
  camera.y = player.y - H / 2;
}

// ============ ورودی ============
const input = { moveX: 0, moveY: 0 };
const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') { e.preventDefault(); doAttack(); }
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

function readKeyboard() {
  let x = 0, y = 0;
  if (keys['a'] || keys['arrowleft'])  x -= 1;
  if (keys['d'] || keys['arrowright']) x += 1;
  if (keys['w'] || keys['arrowup'])    y -= 1;
  if (keys['s'] || keys['arrowdown'])  y += 1;
  if (x || y) {
    const len = Math.hypot(x, y);
    input.moveX = x / len;
    input.moveY = y / len;
  } else if (!joystick.active) {
    input.moveX = 0;
    input.moveY = 0;
  }
}

// ============ جوی‌استیک لمسی ============
const joyBase = document.getElementById('joyBase');
const joyKnob = document.getElementById('joyKnob');

const joystick = {
  active: false,
  id: null,
  cx: 0, cy: 0,
  dx: 0, dy: 0,
  maxR: 52,
};

function joyStart(e) {
  e.preventDefault();
  if (joystick.active) return;
  const t = e.changedTouches ? e.changedTouches[0] : e;
  const rect = joyBase.getBoundingClientRect();
  joystick.active = true;
  joystick.id = t.identifier !== undefined ? t.identifier : 'mouse';
  joystick.cx = rect.left + rect.width / 2;
  joystick.cy = rect.top + rect.height / 2;
  joyMove(e);
}

function joyMove(e) {
  if (!joystick.active) return;
  let t = null;
  if (e.changedTouches) {
    for (const tt of e.changedTouches) {
      if (tt.identifier === joystick.id) { t = tt; break; }
    }
    if (!t) return;
  } else {
    t = e;
  }
  let dx = t.clientX - joystick.cx;
  let dy = t.clientY - joystick.cy;
  const dist = Math.hypot(dx, dy);
  if (dist > joystick.maxR) {
    dx = dx / dist * joystick.maxR;
    dy = dy / dist * joystick.maxR;
  }
  joystick.dx = dx;
  joystick.dy = dy;
  input.moveX = dx / joystick.maxR;
  input.moveY = dy / joystick.maxR;
  joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}

function joyEnd(e) {
  if (!joystick.active) return;
  if (e.changedTouches) {
    let found = false;
    for (const tt of e.changedTouches) {
      if (tt.identifier === joystick.id) { found = true; break; }
    }
    if (!found) return;
  }
  joystick.active = false;
  joystick.id = null;
  joystick.dx = 0;
  joystick.dy = 0;
  input.moveX = 0;
  input.moveY = 0;
  joyKnob.style.transform = 'translate(0px, 0px)';
}

joyBase.addEventListener('touchstart', joyStart, { passive: false });
document.addEventListener('touchmove', joyMove, { passive: false });
document.addEventListener('touchend', joyEnd);
document.addEventListener('touchcancel', joyEnd);

// ماوس (برای تست روی کامپیوتر)
joyBase.addEventListener('mousedown', joyStart);
window.addEventListener('mousemove', joyMove);
window.addEventListener('mouseup', joyEnd);

// ============ دکمه حمله ============
const attackBtn = document.getElementById('attackBtn');

attackBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  attackBtn.classList.add('pressed');
  doAttack();
}, { passive: false });
attackBtn.addEventListener('touchend', () => attackBtn.classList.remove('pressed'));
attackBtn.addEventListener('mousedown', (e) => { e.preventDefault(); doAttack(); });
attackBtn.addEventListener('mouseup', () => attackBtn.classList.remove('pressed'));

function doAttack() {
  if (player.attackCooldown > 0) return;
  player.attackCooldown = player.attackCD;
  player.attackTimer = player.attackDuration;
}

// ============ آپدیت ============
function updatePlayer() {
  // حرکت
  player.x += input.moveX * player.speed;
  player.y += input.moveY * player.speed;

  // محدودیت نقشه
  player.x = Math.max(player.r, Math.min(WORLD.w - player.r, player.x));
  player.y = Math.max(player.r, Math.min(WORLD.h - player.r, player.y));

  // چرخش (اگه حمله نمی‌کنه)
  const moving = Math.abs(input.moveX) > 0.05 || Math.abs(input.moveY) > 0.05;
  if (moving && player.attackTimer <= 0) {
    player.angle = Math.atan2(input.moveY, input.moveX);
  }

  // تایمرها
  if (player.attackTimer > 0) player.attackTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;
}

function update() {
  readKeyboard();
  updatePlayer();
  updateCamera();
}

// ============ رسم: کف سنگی ============
function drawFloor() {
  const ts = WORLD.tile;
  const startX = Math.floor(camera.x / ts) * ts;
  const startY = Math.floor(camera.y / ts) * ts;
  const endX = camera.x + W + ts;
  const endY = camera.y + H + ts;

  for (let x = startX; x < endX; x += ts) {
    for (let y = startY; y < endY; y += ts) {
      // شبه‌رندوم ثابت بر اساس مکان
      const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const r = seed - Math.floor(seed);
      const shade = Math.floor(22 + r * 10);

      ctx.fillStyle = `rgb(${shade}, ${shade - 2}, ${shade - 2})`;
      ctx.fillRect(x - camera.x, y - camera.y, ts - 1.5, ts - 1.5);
    }
  }

  // خطوط تیره‌ی اتصال کاشی‌ها
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1;
  for (let x = startX; x < endX; x += ts) {
    ctx.beginPath();
    ctx.moveTo(x - camera.x, 0);
    ctx.lineTo(x - camera.x, H);
    ctx.stroke();
  }
  for (let y = startY; y < endY; y += ts) {
    ctx.beginPath();
    ctx.moveTo(0, y - camera.y);
    ctx.lineTo(W, y - camera.y);
    ctx.stroke();
  }
}

// ============ رسم: بازیکن ============
function drawPlayer() {
  const px = player.x - camera.x;
  const py = player.y - camera.y;

  // هاله زیر بازیکن
  const halo = ctx.createRadialGradient(px, py, 5, px, py, player.r * 3);
  halo.addColorStop(0, 'rgba(200, 40, 40, 0.35)');
  halo.addColorStop(1, 'rgba(200, 40, 40, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(px, py, player.r * 3, 0, Math.PI * 2);
  ctx.fill();

  // مثلث بازیکن
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(player.angle);

  // سایه تیره زیر
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -14);
  ctx.lineTo(-12, 14);
  ctx.closePath();
  ctx.fillStyle = '#000';
  ctx.fill();

  // بدنه
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-11, -13);
  ctx.lineTo(-11, 13);
  ctx.closePath();
  ctx.fillStyle = '#e8e8e8';
  ctx.fill();
  ctx.strokeStyle = '#300';
  ctx.lineWidth = 2;
  ctx.stroke();

  // درخشش لبه
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-11, -13);
  ctx.strokeStyle = 'rgba(255, 200, 200, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// ============ رسم: حمله ============
function drawAttack() {
  if (player.attackTimer <= 0) return;

  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const t = player.attackTimer / player.attackDuration; // 1 → 0
  const eased = Math.pow(t, 0.6); // سریع اول، کند آخر

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(player.angle);

  const arcR = 68;
  const spread = 0.95 * eased;

  // هاله‌ی قرمز بیرونی
  ctx.beginPath();
  ctx.arc(0, 0, arcR, -spread, spread);
  ctx.strokeStyle = `rgba(200, 20, 20, ${eased * 0.9})`;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();

  // خط سفید روشن روی آن
  ctx.beginPath();
  ctx.arc(0, 0, arcR, -spread, spread);
  ctx.strokeStyle = `rgba(255, 255, 255, ${eased})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // ذرات کوچک
  for (let i = 0; i < 3; i++) {
    const a = (Math.random() - 0.5) * spread * 2;
    const rr = arcR + (Math.random() - 0.5) * 15;
    const dotX = Math.cos(a) * rr;
    const dotY = Math.sin(a) * rr;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 2 * eased, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 100, 100, ${eased})`;
    ctx.fill();
  }

  ctx.restore();
}

// ============ رسم: تاریکی + هاله نور ============
function drawDarkness() {
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const lightR = Math.max(W, H) * 0.55;

  const grad = ctx.createRadialGradient(px, py, 30, px, py, lightR);
  grad.addColorStop(0,    'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.75)');
  grad.addColorStop(1,    'rgba(0, 0, 0, 0.95)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// ============ رسم: وینیت ============
function drawVignette() {
  const grad = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.4, W/2, H/2, Math.max(W, H) * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// ============ رندر ============
function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  drawFloor();
  drawPlayer();
  drawAttack();
  drawDarkness();
  drawVignette();
}

// ============ حلقه اصلی ============
let running = false;
let lastTime = 0;

function loop(t) {
  if (!running) return;
  lastTime = t;
  update();
  draw();
  requestAnimationFrame(loop);
}

// ============ شروع بازی ============
function startGame() {
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');

  // صبر کن لِی‌اوت اعمال شه بعد اندازه بگیر
  requestAnimationFrame(() => {
    setTimeout(() => {
      resize();
      initWorld();
      initPlayer();
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }, 60);
  });
}

// ============ رویدادها ============
document.getElementById('startBtn').addEventListener('click', startGame);
window.addEventListener('resize', () => {
  if (!running) return;
  resize();
  // نقشه رو دست نمی‌زنیم ولی بازیکن رو دوباره clamp می‌کنیم
  player.x = Math.max(player.r, Math.min(WORLD.w - player.r, player.x));
  player.y = Math.max(player.r, Math.min(WORLD.h - player.r, player.y));
});

// جلوگیری از زوم و اسکرول روی موبایل
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });