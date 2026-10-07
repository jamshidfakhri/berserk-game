const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ===== وضعیت بازی =====
let gameRunning = true;
let score = 0;
let wave = 1;

// ===== بازیکن =====
const player = {
  x: W / 2,
  y: H / 2,
  r: 18,
  speed: 5,
  hp: 100,
  attackTimer: 0,       // زمان باقی‌مونده شمشیر
  attackCooldown: 0,    // زمان تا حمله بعدی
  attackAngle: 0,       // جهت شمشیر
};

// ===== دشمن‌ها =====
let enemies = [];

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * W; y = -30; }
  else if (side === 1) { x = W + 30; y = Math.random() * H; }
  else if (side === 2) { x = Math.random() * W; y = H + 30; }
  else { x = -30; y = Math.random() * H; }

  enemies.push({
    x, y,
    r: 15,
    speed: 1 + wave * 0.15,
    hp: 1,
  });
}

// ===== ورودی =====
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

// جوی‌استیک لمسی
let touchStart = null;
let touchCurrent = null;

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
  touchCurrent = { x: t.clientX, y: t.clientY };
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0];
  touchCurrent = { x: t.clientX, y: t.clientY };
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  touchStart = null;
  touchCurrent = null;
}, { passive: false });

// ===== حمله =====
let attackBtn = null;

function attack() {
  if (player.attackCooldown > 0 || !gameRunning) return;

  // جهت حمله = سمت حرکت فعلی (یا آخرین جهت)
  let angle = player.attackAngle;

  // اگه جوی‌استیک فعاله، به سمت اون
  if (touchStart && touchCurrent) {
    angle = Math.atan2(touchCurrent.y - touchStart.y, touchCurrent.x - touchStart.x);
  }

  player.attackAngle = angle;
  player.attackTimer = 12;    // ۱۲ فریم شمشیر دیده می‌شه
  player.attackCooldown = 20; // ۲۰ فریم تا حمله بعدی
}

// دکمه حمله روی صفحه (لمسی)
window.addEventListener('touchstart', e => {
  // اگه لمس تو نیمه پایین چپ صفحه بود => حمله
  const t = e.touches[0];
  if (t.clientY > H - 120 && t.clientX < 150) {
    attack();
  }
}, { passive: true });

// کیبورد: Space
window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); attack(); }
});

// ===== به‌روزرسانی =====
function update() {
  if (!gameRunning) return;

  // حرکت با کیبورد
  if (keys['w'] || keys['arrowup'])    player.y -= player.speed;
  if (keys['s'] || keys['arrowdown'])  player.y += player.speed;
  if (keys['a'] || keys['arrowleft'])  player.x -= player.speed;
  if (keys['d'] || keys['arrowright']) player.x += player.speed;

  // حرکت با جوی‌استیک لمسی
  if (touchStart && touchCurrent) {
    const dx = touchCurrent.x - touchStart.x;
    const dy = touchCurrent.y - touchStart.y;
    const dist = Math.hypot(dx, dy);
    const maxDist = 60;
    if (dist > 5) {
      const power = Math.min(dist, maxDist) / maxDist;
      const nx = dx / dist;
      const ny = dy / dist;
      player.x += nx * player.speed * power * 2;
      player.y += ny * player.speed * power * 2;
    }
  }

  // محدوده بازیکن
  player.x = Math.max(player.r, Math.min(W - player.r, player.x));
  player.y = Math.max(player.r, Math.min(H - player.r, player.y));

  // تایمرها
  if (player.attackTimer > 0) player.attackTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;

  // ===== دشمن‌ها =====
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;
    }

    // برخورد دشمن با بازیکن
    if (dist < e.r + player.r) {
      player.hp -= 10;
      enemies.splice(i, 1);
      document.getElementById('hp').textContent = Math.max(0, player.hp);
      if (player.hp <= 0) {
        gameOver();
      }
      continue;
    }

    // برخورد شمشیر با دشمن
    if (player.attackTimer > 0) {
      const swordLen = 60;
      const sx = player.x + Math.cos(player.attackAngle) * swordLen;
      const sy = player.y + Math.sin(player.attackAngle) * swordLen;
      const sdist = Math.hypot(sx - e.x, sy - e.y);
      if (sdist < e.r + 25) {
        enemies.splice(i, 1);
        score += 10;
        document.getElementById('score').textContent = score;
      }
    }
  }

  // ساخت دشمن جدید
  if (Math.random() < 0.02 + wave * 0.005) spawnEnemy();
}

// ===== رسم =====
function draw() {
  // پس‌زمینه
  ctx.fillStyle = '#1a0f0f';
  ctx.fillRect(0, 0, W, H);

  // دشمن‌ها
  enemies.forEach(e => {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fillStyle = '#8b2020';
    ctx.fill();
    ctx.strokeStyle = '#3a0808';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // شمشیر
  if (player.attackTimer > 0) {
    const swordLen = 60;
    const sx = player.x + Math.cos(player.attackAngle) * swordLen;
    const sy = player.y + Math.sin(player.attackAngle) * swordLen;

    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(sx, sy);
    ctx.strokeStyle = '#e0d0a0';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // درخشش
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 240, 200, 0.6)';
    ctx.fill();
  }

  // بازیکن
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fillStyle = '#c0a060';
  ctx.fill();
  ctx.strokeStyle = '#5a2a2a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // جوی‌استیک
  if (touchStart && touchCurrent) {
    ctx.beginPath();
    ctx.arc(touchStart.x, touchStart.y, 60, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(212, 197, 160, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(touchCurrent.x, touchCurrent.y, 25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 197, 160, 0.5)';
    ctx.fill();
  }

  // دکمه حمله (پایین چپ)
  if (gameRunning) {
    ctx.beginPath();
    ctx.arc(75, H - 75, 55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(160, 32, 32, 0.4)';
    ctx.fill();
    ctx.strokeStyle = '#a02020';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#d4c5a0';
    ctx.font = 'bold 20px Tahoma';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔️', 75, H - 75);
  }
}

// ===== حلقه =====
function loop() {
  update();
  draw();
  if (gameRunning) requestAnimationFrame(loop);
}

// ===== پایان بازی =====
function gameOver() {
  gameRunning = false;
  document.getElementById('finalScore').textContent = score;
  document.getElementById('gameover').classList.remove('hidden');
}

// ===== ریست =====
function restart() {
  document.getElementById('gameover').classList.add('hidden');
  player.x = W / 2;
  player.y = H / 2;
  player.hp = 100;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  player.attackAngle = 0;
  enemies = [];
  score = 0;
  wave = 1;
  gameRunning = true;
  document.getElementById('hp').textContent = 100;
  document.getElementById('score').textContent = 0;
  document.getElementById('wave').textContent = 1;
  loop();
}

loop();