/* ============================================
   Vengeance — Loading + Menu + Base Game
   ============================================ */

const DPR = Math.min(window.devicePixelRatio || 1, 2);

/* ============================================
   انیمیشن لودینگ
   ============================================ */
const loadingScreen = document.getElementById('loadingScreen');
const loadingCanvas = document.getElementById('loadingCanvas');
const lctx = loadingCanvas.getContext('2d');
const loadingBarFill = document.getElementById('loadingBarFill');

let loadW = 0, loadH = 0;
let loadingProgress = 0;       // 0 → 1
let loadingStartTime = 0;
let loadingRafId = null;
let isLoadingDone = false;
const LOADING_DURATION = 2800; // میلی‌ثانیه

let fireParticles = [];

function resizeLoading() {
  const rect = loadingScreen.getBoundingClientRect();
  loadingCanvas.width  = Math.floor(rect.width  * DPR);
  loadingCanvas.height = Math.floor(rect.height * DPR);
  loadingCanvas.style.width  = rect.width + 'px';
  loadingCanvas.style.height = rect.height + 'px';
  loadW = rect.width;
  loadH = rect.height;
  lctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

// ---------- چوب‌ها ----------
function drawLogs(cx, cy) {
  const logs = [
    { x: -55, y:  12, angle: -0.55, w: 110, h: 14 },
    { x:  55, y:  12, angle:  0.55, w: 110, h: 14 },
    { x: -35, y:   2, angle:  0.18, w:  95, h: 12 },
    { x:  35, y:   2, angle: -0.18, w:  95, h: 12 },
    { x:   0, y:  -6, angle:  0.00, w:  85, h: 11 },
  ];

  for (const log of logs) {
    lctx.save();
    lctx.translate(cx + log.x, cy + log.y);
    lctx.rotate(log.angle);

    const grd = lctx.createLinearGradient(0, -log.h / 2, 0, log.h / 2);
    grd.addColorStop(0,   '#3a2418');
    grd.addColorStop(0.5, '#4a2e1c');
    grd.addColorStop(1,   '#1a0f08');

    lctx.fillStyle = grd;
    lctx.fillRect(-log.w / 2, -log.h / 2, log.w, log.h);

    lctx.strokeStyle = '#0a0503';
    lctx.lineWidth = 1;
    lctx.strokeRect(-log.w / 2, -log.h / 2, log.w, log.h);

    // رگه‌های چوب
    lctx.strokeStyle = 'rgba(0,0,0,0.4)';
    lctx.lineWidth = 0.8;
    lctx.beginPath();
    lctx.moveTo(-log.w / 2 + 5, 0);
    lctx.lineTo( log.w / 2 - 5, 0);
    lctx.stroke();

    lctx.restore();
  }
}

// ---------- شمشیر کج (به سبک طرح کاربر) ----------
function drawSword(cx, cy, angle, glow) {
  lctx.save();
  lctx.translate(cx, cy);
  lctx.rotate(angle);

  const bladeLen = 110;
  const bladeW   = 16;

  // درخشش شمشیر وقتی آتیش روشن‌تر می‌شه
  if (glow > 0) {
    lctx.shadowColor = `rgba(255, 180, 80, ${glow})`;
    lctx.shadowBlur  = 30 * glow;
  }

  // ---- تیغه (نوک کج مثل طرح کاربر) ----
  lctx.beginPath();
  lctx.moveTo(-bladeW / 2,       0);                // بالا-چپ تیغه
  lctx.lineTo(-bladeW / 2,       bladeLen - 18);    // کنار چپ تا نزدیک نوک
  lctx.lineTo(-bladeW / 2 - 4,   bladeLen - 8);     // زاویه نوک
  lctx.lineTo(-bladeW / 2 + 4,   bladeLen + 8);     // نوک تیز (پایین)
  lctx.lineTo( bladeW / 2 - 2,   bladeLen - 14);    // برگشت به کنار راست
  lctx.lineTo( bladeW / 2,       0);                // بالا-راست تیغه
  lctx.closePath();

  const bladeGrd = lctx.createLinearGradient(-bladeW / 2, 0, bladeW / 2, 0);
  bladeGrd.addColorStop(0,    '#2a2a2a');
  bladeGrd.addColorStop(0.35, '#8a8a8a');
  bladeGrd.addColorStop(0.5,  '#e8e8e8');
  bladeGrd.addColorStop(0.7,  '#9a9a9a');
  bladeGrd.addColorStop(1,    '#3a3a3a');

  lctx.fillStyle = bladeGrd;
  lctx.fill();

  lctx.shadowBlur = 0;
  lctx.strokeStyle = '#0a0a0a';
  lctx.lineWidth = 1.5;
  lctx.stroke();

  // ---- گارد مستطیلی کوچیک ----
  lctx.fillStyle = '#1a1a1a';
  lctx.fillRect(-bladeW / 2 - 5, -7, bladeW + 10, 9);
  lctx.strokeStyle = '#000';
  lctx.lineWidth = 1.2;
  lctx.strokeRect(-bladeW / 2 - 5, -7, bladeW + 10, 9);

  // ---- دسته ----
  lctx.fillStyle = '#0f0f0f';
  lctx.fillRect(-4, -32, 8, 27);
  lctx.strokeStyle = '#000';
  lctx.strokeRect(-4, -32, 8, 27);

  // ---- سر دسته (Pommel) ----
  lctx.beginPath();
  lctx.arc(0, -34, 4, 0, Math.PI * 2);
  lctx.fillStyle = '#2a2a2a';
  lctx.fill();
  lctx.strokeStyle = '#000';
  lctx.stroke();

  lctx.restore();
}

// ---------- ذرات آتیش ----------
function spawnFireParticle(intensity) {
  const baseX = loadW / 2 + (Math.random() - 0.5) * (50 + intensity * 80);
  const baseY = loadH * 0.68;
  const spread = 0.5 + intensity * 0.9;

  fireParticles.push({
    x: baseX,
    y: baseY + (Math.random() - 0.5) * 12,
    vx: (Math.random() - 0.5) * spread,
    vy: -1.0 - Math.random() * 1.8 * (0.7 + intensity * 0.7),
    life: 1,
    decay: 0.010 + Math.random() * 0.014,
    size: 5 + Math.random() * 8 * (0.7 + intensity * 0.6),
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.04 + Math.random() * 0.06,
  });
}

function updateFireParticles(intensity) {
  // تعداد ذرات جدید بر اساس شدت
  const spawnCount = Math.floor(2 + intensity * 5);
  for (let i = 0; i < spawnCount; i++) spawnFireParticle(intensity);

  for (let i = fireParticles.length - 1; i >= 0; i--) {
    const p = fireParticles[i];
    p.wobble += p.wobbleSpeed;
    p.x += p.vx + Math.sin(p.wobble) * 0.4;
    p.y += p.vy;
    p.vy *= 0.985;         // کند شدن تدریجی
    p.life -= p.decay;
    p.size *= 0.995;

    if (p.life <= 0) fireParticles.splice(i, 1);
  }
}

function drawFireParticles(intensity) {
  // از آخر به اول (ذرات قدیمی‌تر زیر، جدیدها روی)
  lctx.globalCompositeOperation = 'lighter';

  for (const p of fireParticles) {
    const a = Math.max(0, p.life);

    // رنگ بر اساس شدت: قرمز تیره → زرد روشن
    const hue = 12 + intensity * 35;            // 12 → 47
    const sat = 90 + intensity * 10;            // 90 → 100
    const light = 25 + intensity * 55 + a * 10; // 25 → 90

    const grd = lctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    grd.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${a})`);
    grd.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${light * 0.7}%, ${a * 0.7})`);
    grd.addColorStop(1, `hsla(${hue}, ${sat}%, ${light * 0.4}%, 0)`);

    lctx.fillStyle = grd;
    lctx.beginPath();
    lctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    lctx.fill();
  }

  lctx.globalCompositeOperation = 'source-over';
}

// ---------- هاله‌ی پایه‌ی آتیش ----------
function drawFireBase(cx, cy, intensity) {
  const R = 80 + intensity * 90;
  const grd = lctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  const alpha = 0.25 + intensity * 0.55;
  grd.addColorStop(0, `rgba(255, 200, 100, ${alpha})`);
  grd.addColorStop(0.4, `rgba(255, 100, 30, ${alpha * 0.6})`);
  grd.addColorStop(1, `rgba(120, 20, 0, 0)`);

  lctx.fillStyle = grd;
  lctx.beginPath();
  lctx.arc(cx, cy, R, 0, Math.PI * 2);
  lctx.fill();
}

// ---------- رسم کل صحنه‌ی لودینگ ----------
function drawLoadingScene(intensity) {
  // پس‌زمینه
  lctx.fillStyle = '#000';
  lctx.fillRect(0, 0, loadW, loadH);

  const cx = loadW / 2;
  const baseY = loadH * 0.72;

  // هاله‌ی آتیش روی زمین
  drawFireBase(cx, baseY, intensity);

  // ذرات آتیش
  drawFireParticles(intensity);

  // شمشیر کج داخل آتیش (زاویه ~ -20 درجه)
  const swordY = baseY - 75;
  drawSword(cx, swordY, -0.32, intensity);

  // چوب‌ها روی آتیش (روی همه چیز، مثل اینکه چوب‌ها جلوترن)
  drawLogs(cx, baseY);
}

// ---------- حلقه‌ی لودینگ ----------
function loadingLoop() {
  if (isLoadingDone) return;

  const elapsed = performance.now() - loadingStartTime;
  loadingProgress = Math.min(1, elapsed / LOADING_DURATION);

  // آتیش: از 0 (کم‌نور) تا 1 (روشن کامل)
  const fireIntensity = loadingProgress;

  // نوار لودینگ
  loadingBarFill.style.width = (loadingProgress * 100) + '%';

  // آپدیت و رسم
  updateFireParticles(fireIntensity);
  drawLoadingScene(fireIntensity);

  if (loadingProgress >= 1) {
    isLoadingDone = true;
    // فلاش سفید و رفتن به منو
    loadingScreen.classList.add('flash');
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
      document.getElementById('startScreen').classList.remove('hidden');
    }, 400);
    return;
  }

  loadingRafId = requestAnimationFrame(loadingLoop);
}

function startLoadingAnimation() {
  resizeLoading();
  loadingStartTime = performance.now();
  isLoadingDone = false;
  loadingProgress = 0;
  fireParticles = [];
  loadingBarFill.style.width = '0%';

  // یه سری ذرات اولیه که از صفر شروع شه
  for (let i = 0; i < 8; i++) spawnFireParticle(0);

  loadingRafId = requestAnimationFrame(loadingLoop);
}

window.addEventListener('resize', () => {
  if (!isLoadingDone) resizeLoading();
});

/* ============================================
   بازی اصلی
   ============================================ */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W = 0, H = 0;

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

const WORLD = { w: 0, h: 0, tile: 90, mult: 5 };

function initWorld() {
  WORLD.w = W * WORLD.mult;
  WORLD.h = H * WORLD.mult;
}

const camera = { x: 0, y: 0, lerp: 0.09 };

function updateCamera() {
  const tx = player.x - W / 2;
  const ty = player.y - H / 2;
  camera.x += (tx - camera.x) * camera.lerp;
  camera.y += (ty - camera.y) * camera.lerp;
  camera.x = Math.max(0, Math.min(WORLD.w - W, camera.x));
  camera.y = Math.max(0, Math.min(WORLD.h - H, camera.y));
}

const player = {
  x: 0, y: 0,
  r: 16,
  speed: 4.2,
  angle: -Math.PI / 2,
  attackTimer: 0,
  attackCooldown: 0,
  attackDuration: 14,
  attackCD: 22,
};

function initPlayer() {
  player.x = WORLD.w / 2;
  player.y = WORLD.h * 0.7;
  player.angle = -Math.PI / 2;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  camera.x = player.x - W / 2;
  camera.y = player.y - H / 2;
}

const gameState = { running: false, paused: false };

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

// ============ جوی‌استیک ============
const joyBase = document.getElementById('joyBase');
const joyKnob = document.getElementById('joyKnob');

const joystick = { active: false, id: null, cx: 0, cy: 0, maxR: 52 };

function joyStart(e) {
  if (gameState.paused) return;
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
  } else t = e;

  let dx = t.clientX - joystick.cx;
  let dy = t.clientY - joystick.cy;
  const dist = Math.hypot(dx, dy);
  if (dist > joystick.maxR) {
    dx = dx / dist * joystick.maxR;
    dy = dy / dist * joystick.maxR;
  }
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
  input.moveX = 0;
  input.moveY = 0;
  joyKnob.style.transform = 'translate(0px, 0px)';
}

joyBase.addEventListener('touchstart', joyStart, { passive: false });
document.addEventListener('touchmove', joyMove, { passive: false });
document.addEventListener('touchend', joyEnd);
document.addEventListener('touchcancel', joyEnd);
joyBase.addEventListener('mousedown', joyStart);
window.addEventListener('mousemove', joyMove);
window.addEventListener('mouseup', joyEnd);

// ============ حمله ============
const attackBtn = document.getElementById('attackBtn');

function attackBtnPress(e) {
  if (gameState.paused) return;
  e.preventDefault();
  attackBtn.classList.add('pressed');
  doAttack();
}

attackBtn.addEventListener('touchstart', attackBtnPress, { passive: false });
attackBtn.addEventListener('touchend', () => attackBtn.classList.remove('pressed'));
attackBtn.addEventListener('mousedown', attackBtnPress);
attackBtn.addEventListener('mouseup', () => attackBtn.classList.remove('pressed'));

function doAttack() {
  if (player.attackCooldown > 0) return;
  player.attackCooldown = player.attackCD;
  player.attackTimer = player.attackDuration;
}

// ============ آپدیت ============
function updatePlayer() {
  player.x += input.moveX * player.speed;
  player.y += input.moveY * player.speed;
  player.x = Math.max(player.r, Math.min(WORLD.w - player.r, player.x));
  player.y = Math.max(player.r, Math.min(WORLD.h - player.r, player.y));

  const moving = Math.abs(input.moveX) > 0.05 || Math.abs(input.moveY) > 0.05;
  if (moving && player.attackTimer <= 0) {
    player.angle = Math.atan2(input.moveY, input.moveX);
  }

  if (player.attackTimer > 0) player.attackTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;
}

function update() {
  readKeyboard();
  updatePlayer();
  updateCamera();
}

// ============ رسم ============
function drawFloor() {
  const ts = WORLD.tile;
  const startX = Math.floor(camera.x / ts) * ts;
  const startY = Math.floor(camera.y / ts) * ts;
  const endX = camera.x + W + ts;
  const endY = camera.y + H + ts;

  for (let x = startX; x < endX; x += ts) {
    for (let y = startY; y < endY; y += ts) {
      const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const r = seed - Math.floor(seed);
      const shade = Math.floor(22 + r * 10);
      ctx.fillStyle = `rgb(${shade}, ${shade - 2}, ${shade - 2})`;
      ctx.fillRect(x - camera.x, y - camera.y, ts - 1.5, ts - 1.5);
    }
  }

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

function drawPlayer() {
  const px = player.x - camera.x;
  const py = player.y - camera.y;

  const halo = ctx.createRadialGradient(px, py, 5, px, py, player.r * 3);
  halo.addColorStop(0, 'rgba(200, 40, 40, 0.35)');
  halo.addColorStop(1, 'rgba(200, 40, 40, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(px, py, player.r * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(player.angle);

  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -14);
  ctx.lineTo(-12, 14);
  ctx.closePath();
  ctx.fillStyle = '#000';
  ctx.fill();

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

  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-11, -13);
  ctx.strokeStyle = 'rgba(255, 200, 200, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawAttack() {
  if (player.attackTimer <= 0) return;

  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const t = player.attackTimer / player.attackDuration;
  const eased = Math.pow(t, 0.6);

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(player.angle);

  const arcR = 68;
  const spread = 0.95 * eased;

  ctx.beginPath();
  ctx.arc(0, 0, arcR, -spread, spread);
  ctx.strokeStyle = `rgba(200, 20, 20, ${eased * 0.9})`;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, arcR, -spread, spread);
  ctx.strokeStyle = `rgba(255, 255, 255, ${eased})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  for (let i = 0; i < 3; i++) {
    const a = (Math.random() - 0.5) * spread * 2;
    const rr = arcR + (Math.random() - 0.5) * 15;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 2 * eased, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 100, 100, ${eased})`;
    ctx.fill();
  }

  ctx.restore();
}

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

function drawVignette() {
  const grad = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.4, W/2, H/2, Math.max(W, H) * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  drawFloor();
  drawPlayer();
  drawAttack();
  drawDarkness();
  drawVignette();
}

// ============ حلقه ============
function loop() {
  if (!gameState.running) return;
  if (!gameState.paused) {
    update();
    draw();
  }
  requestAnimationFrame(loop);
}

// ============ شروع بازی ============
function startGame() {
  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');

  requestAnimationFrame(() => {
    setTimeout(() => {
      resize();
      initWorld();
      initPlayer();
      gameState.running = true;
      gameState.paused = false;
      requestAnimationFrame(loop);
    }, 60);
  });
}

// ============ منوی کناری ============
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sideMenu = document.getElementById('sideMenu');
const sideMenuClose = document.getElementById('sideMenuClose');

function openSideMenu() { sideMenu.classList.remove('hidden'); gameState.paused = true; }
function closeSideMenu() { sideMenu.classList.add('hidden'); gameState.paused = false; }

hamburgerBtn.addEventListener('click', openSideMenu);
sideMenuClose.addEventListener('click', closeSideMenu);
sideMenu.addEventListener('click', (e) => { if (e.target === sideMenu) closeSideMenu(); });

// ============ دیالوگ ============
const confirmDialog = document.getElementById('confirmDialog');
const confirmText = document.getElementById('confirmText');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

let confirmCallback = null;

function showConfirm(text, onYes) {
  confirmText.textContent = text;
  confirmCallback = onYes;
  confirmDialog.classList.remove('hidden');
  gameState.paused = true;
}

function hideConfirm() {
  confirmDialog.classList.add('hidden');
  confirmCallback = null;
  if (sideMenu.classList.contains('hidden')) gameState.paused = false;
}

confirmYes.addEventListener('click', () => {
  const cb = confirmCallback;
  hideConfirm();
  if (cb) cb();
});

confirmNo.addEventListener('click', hideConfirm);

// ============ Toast ============
const toast = document.getElementById('toast');
let toastTimer = null;

function showToast(msg, duration = 1800) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
}

// ============ اکشن‌های منو ============
document.querySelectorAll('.side-menu-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'save') showToast('💾 ذخیره شد (بزودی واقعی می‌شه)');
    if (action === 'settings') showToast('⚙️ تنظیمات بزودی اضافه می‌شه');
    if (action === 'exit') showConfirm('از بازی خارج شی و برگردی به منو؟', () => exitToMenu());
  });
});

function exitToMenu() {
  gameState.running = false;
  gameState.paused = false;
  sideMenu.classList.add('hidden');
  document.getElementById('gameScreen').classList.add('hidden');
  document.getElementById('startScreen').classList.remove('hidden');
}

// ============ رویدادها ============
document.getElementById('startBtn').addEventListener('click', startGame);

window.addEventListener('resize', () => {
  if (!gameState.running) return;
  resize();
  player.x = Math.max(player.r, Math.min(WORLD.w - player.r, player.x));
  player.y = Math.max(player.r, Math.min(WORLD.h - player.r, player.y));
});

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

// ============ شروع: اول لودینگ ============
startLoadingAnimation();