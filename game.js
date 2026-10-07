const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ===== بازیکن =====
const player = {
  x: W / 2,
  y: H / 2,
  r: 18,
  speed: 5,
  hp: 100,
};

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

// ===== به‌روزرسانی =====
function update() {
  // کیبورد
  if (keys['w'] || keys['arrowup'])    player.y -= player.speed;
  if (keys['s'] || keys['arrowdown'])  player.y += player.speed;
  if (keys['a'] || keys['arrowleft'])  player.x -= player.speed;
  if (keys['d'] || keys['arrowright']) player.x += player.speed;

  // جوی‌استیک لمسی
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

  // محدوده
  player.x = Math.max(player.r, Math.min(W - player.r, player.x));
  player.y = Math.max(player.r, Math.min(H - player.r, player.y));
}

// ===== رسم =====
function draw() {
  // پس‌زمینه
  ctx.fillStyle = '#1a0f0f';
  ctx.fillRect(0, 0, W, H);

  // بازیکن
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fillStyle = '#c0a060';
  ctx.fill();
  ctx.strokeStyle = '#5a2a2a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // نمایش جوی‌استیک
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
}

// ===== حلقه =====
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();

// ===== ریست =====
function restart() {
  document.getElementById('gameover').classList.add('hidden');
  player.x = W / 2;
  player.y = H / 2;
  player.hp = 100;
  document.getElementById('hp').textContent = 100;
  document.getElementById('score').textContent = 0;
  document.getElementById('wave').textContent = 1;
  loop();
}