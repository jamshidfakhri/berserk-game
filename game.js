const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ===== وضعیت =====
let gameRunning = true;
let score = 0;
let wave = 1;
let waveEnemiesLeft = 0;
let waveBreakTimer = 0;     // مکث بین موج‌ها (فریم)
let shakeAmount = 0;
let rage = 0;
let berserkMode = false;
let berserkTimer = 0;
let bossActive = false;

const player = {
  x: W / 2, y: H / 2, r: 16, speed: 5, hp: 100,
  attackTimer: 0, attackCooldown: 0, attackAngle: 0,
  trail: [],
};

let enemies = [];
let particles = [];
let projectiles = [];

// ===== شروع موج =====
function startWave(n) {
  wave = n;
  document.getElementById('wave').textContent = wave;
  bossActive = false;

  if (n % 5 === 0) {
    // موج باس
    spawnBoss();
    bossActive = true;
    waveEnemiesLeft = 1;
  } else {
    waveEnemiesLeft = 3 + Math.floor(n * 1.5);
    // اسپاون اولیه چند تا
    const initial = Math.min(waveEnemiesLeft, 3);
    for (let i = 0; i < initial; i++) spawnEnemy();
    waveEnemiesLeft -= initial;
  }
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * W; y = -30; }
  else if (side === 1) { x = W + 30; y = Math.random() * H; }
  else if (side === 2) { x = Math.random() * W; y = H + 30; }
  else { x = -30; y = Math.random() * H; }
  enemies.push({
    x, y, r: 14,
    speed: 1 + wave * 0.12,
    angle: Math.random() * Math.PI * 2,
    hp: 1, maxHp: 1,
    isBoss: false,
    shootTimer: 0,
  });
}

function spawnBoss() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = W / 2; y = -60; }
  else if (side === 1) { x = W + 60; y = H / 2; }
  else if (side === 2) { x = W / 2; y = H + 60; }
  else { x = -60; y = H / 2; }
  const hp = 5 + Math.floor(wave / 5) * 3;
  enemies.push({
    x, y, r: 40,
    speed: 0.6 + wave * 0.04,
    angle: 0,
    hp: hp, maxHp: hp,
    isBoss: true,
    shootTimer: 120,
  });
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 30, maxLife: 30,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

// ===== ورودی =====
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.code === 'Space') { e.preventDefault(); attack(); }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

let touchStart = null, touchCurrent = null;
let attackTouchId = null;

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.touches) {
    if (t.clientY > H - 130 && t.clientX < 160) {
      attack();
      attackTouchId = t.identifier;
    } else if (touchStart === null) {
      touchStart = { x: t.clientX, y: t.clientY };
      touchCurrent = { x: t.clientX, y: t.clientY };
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.touches) {
    if (t.identifier !== attackTouchId && touchStart) {
      touchCurrent = { x: t.clientX, y: t.clientY };
    }
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  attackTouchId = null;
  if (e.touches.length === 0) {
    touchStart = null;
    touchCurrent = null;
  }
}, { passive: false });

function attack() {
  if (player.attackCooldown > 0 || !gameRunning) return;
  let angle = player.attackAngle;
  if (touchStart && touchCurrent) {
    angle = Math.atan2(touchCurrent.y - touchStart.y, touchCurrent.x - touchStart.x);
  }
  player.attackAngle = angle;
  player.attackTimer = berserkMode ? 18 : 12;
  player.attackCooldown = berserkMode ? 10 : 20;
}

// ===== به‌روزرسانی =====
function update() {
  if (!gameRunning) return;

  const sp = berserkMode ? player.speed * 1.6 : player.speed;

  if (keys['w'] || keys['arrowup'])    player.y -= sp;
  if (keys['s'] || keys['arrowdown'])  player.y += sp;
  if (keys['a'] || keys['arrowleft'])  player.x -= sp;
  if (keys['d'] || keys['arrowright']) player.x += sp;

  if (touchStart && touchCurrent) {
    const dx = touchCurrent.x - touchStart.x;
    const dy = touchCurrent.y - touchStart.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 5) {
      const power = Math.min(dist, 60) / 60;
      player.x += (dx / dist) * sp * power * 2;
      player.y += (dy / dist) * sp * power * 2;
    }
  }

  player.x = Math.max(player.r, Math.min(W - player.r, player.x));
  player.y = Math.max(player.r, Math.min(H - player.r, player.y));

  if (player.attackTimer > 0) player.attackTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (shakeAmount > 0) shakeAmount *= 0.85;

  if (berserkMode) {
    berserkTimer--;
    if (berserkTimer <= 0) {
      berserkMode = false;
      rage = 0;
    }
  }

  // دنباله
  player.trail.push({ x: player.x, y: player.y, life: 15 });
  if (player.trail.length > 15) player.trail.shift();
  player.trail.forEach(t => t.life--);
  player.trail = player.trail.filter(t => t.life > 0);

  // ===== مکث بین موج‌ها =====
  if (waveBreakTimer > 0) {
    waveBreakTimer--;
    if (waveBreakTimer === 0) {
      startWave(wave + 1);
    }
  }

  // ===== اسپاون تدریجی دشمن‌های باقی‌مانده =====
  if (waveEnemiesLeft > 0 && !bossActive && waveBreakTimer === 0) {
    if (Math.random() < 0.03) {
      spawnEnemy();
      waveEnemiesLeft--;
    }
  }

  // ===== دشمن‌ها =====
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.angle += e.isBoss ? 0.03 : 0.1;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);

    if (e.isBoss) {
      // باس فقط تا یه فاصله تعقیب می‌کنه
      if (dist > 150) {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      }
      // شلیک گلوله
      e.shootTimer--;
      if (e.shootTimer <= 0) {
        e.shootTimer = 100;
        const a = Math.atan2(dy, dx);
        projectiles.push({
          x: e.x, y: e.y,
          vx: Math.cos(a) * 3,
          vy: Math.sin(a) * 3,
          r: 8,
        });
      }
    } else {
      if (dist > 0) {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      }
    }

    // برخورد دشمن با بازیکن
    if (dist < e.r + player.r) {
      player.hp -= e.isBoss ? 20 : (berserkMode ? 5 : 10);
      spawnParticles(e.x, e.y, '#8b2020', e.isBoss ? 30 : 15);
      shakeAmount = e.isBoss ? 15 : 8;
      if (!e.isBoss) {
        enemies.splice(i, 1);
      }
      document.getElementById('hp').textContent = Math.max(0, player.hp);
      if (player.hp <= 0) { gameOver(); return; }
      continue;
    }

    // برخورد شمشیر
    if (player.attackTimer > 0) {
      const swordLen = berserkMode ? 90 : 60;
      const sx = player.x + Math.cos(player.attackAngle) * swordLen;
      const sy = player.y + Math.sin(player.attackAngle) * swordLen;
      const sdist = Math.hypot(sx - e.x, sy - e.y);
      if (sdist < e.r + 28) {
        e.hp--;
        spawnParticles(e.x, e.y, '#c02020', 8);
        if (e.hp <= 0) {
          // دشمن مرد
          spawnParticles(e.x, e.y, '#c02020', e.isBoss ? 60 : 20);
          shakeAmount = e.isBoss ? 20 : 6;
          score += e.isBoss ? 100 : 10;
          if (!berserkMode) {
            rage = Math.min(100, rage + (e.isBoss ? 40 : 8));
            if (rage >= 100) {
              berserkMode = true;
              berserkTimer = 300;
            }
          }
          document.getElementById('score').textContent = score;
          enemies.splice(i, 1);

          // اگه باس بود، موج تمومه
          if (e.isBoss) {
            waveBreakTimer = 120;
          }
        }
      }
    }
  }

  // ===== گلوله‌ها =====
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
      projectiles.splice(i, 1);
      continue;
    }

    const dx = player.x - p.x;
    const dy = player.y - p.y;
    if (Math.hypot(dx, dy) < p.r + player.r) {
      player.hp -= 8;
      spawnParticles(p.x, p.y, '#ff4040', 10);
      shakeAmount = 8;
      projectiles.splice(i, 1);
      document.getElementById('hp').textContent = Math.max(0, player.hp);
      if (player.hp <= 0) { gameOver(); return; }
    }
  }

  // ===== پایان موج =====
  if (!bossActive && enemies.length === 0 && waveEnemiesLeft === 0 && waveBreakTimer === 0) {
    waveBreakTimer = 120;
  }

  // ===== ذرات =====
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.92; p.vy *= 0.92;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }

  const rageBar = document.getElementById('rage');
  if (rageBar) rageBar.textContent = berserkMode ? '🔥' : Math.floor(rage);
}

// ===== رسم =====
function draw() {
  ctx.save();
  if (shakeAmount > 0.5) {
    ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
  }

  ctx.fillStyle = berserkMode ? '#2a0808' : '#1a0f0f';
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // دنباله
  player.trail.forEach(t => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, player.r * (t.life / 15), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(192, 160, 96, ${t.life / 30})`;
    ctx.fill();
  });

  // ذرات
  particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // گلوله‌ها
  projectiles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4040';
    ctx.fill();
    ctx.strokeStyle = '#800';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // دشمن‌ها
  enemies.forEach(e => {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.beginPath();
    ctx.moveTo(0, -e.r);
    ctx.lineTo(e.r * 0.8, e.r * 0.7);
    ctx.lineTo(-e.r * 0.8, e.r * 0.7);
    ctx.closePath();
    ctx.fillStyle = e.isBoss ? '#5a0a0a' : '#8b2020';
    ctx.fill();
    ctx.strokeStyle = e.isBoss ? '#ff2020' : '#3a0808';
    ctx.lineWidth = e.isBoss ? 4 : 2;
    ctx.stroke();
    ctx.restore();

    // نوار جان باس
    if (e.isBoss) {
      const bw = 80;
      const bx = e.x - bw / 2;
      const by = e.y - e.r - 18;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, bw, 6);
      ctx.fillStyle = '#c02020';
      ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), 6);
    }
  });

  // شمشیر
  if (player.attackTimer > 0) {
    const swordLen = berserkMode ? 90 : 60;
    const sx = player.x + Math.cos(player.attackAngle) * swordLen;
    const sy = player.y + Math.sin(player.attackAngle) * swordLen;
    const grad = ctx.createLinearGradient(player.x, player.y, sx, sy);
    grad.addColorStop(0, 'rgba(224, 208, 160, 0)');
    grad.addColorStop(1, berserkMode ? '#ff4040' : '#e0d0a0');
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(sx, sy);
    ctx.strokeStyle = grad;
    ctx.lineWidth = berserkMode ? 10 : 6;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, berserkMode ? 18 : 10, 0, Math.PI * 2);
    ctx.fillStyle = berserkMode ? 'rgba(255, 80, 80, 0.8)' : 'rgba(255, 240, 200, 0.6)';
    ctx.fill();
  }

  // بازیکن
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.attackAngle);
  ctx.beginPath();
  ctx.moveTo(player.r, 0);
  ctx.lineTo(-player.r * 0.7, -player.r * 0.8);
  ctx.lineTo(-player.r * 0.7, player.r * 0.8);
  ctx.closePath();
  ctx.fillStyle = berserkMode ? '#e0b060' : '#c0a060';
  ctx.fill();
  ctx.strokeStyle = berserkMode ? '#ff2020' : '#5a2a2a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

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

  // دکمه حمله
  if (gameRunning) {
    ctx.beginPath();
    ctx.arc(75, H - 75, 55, 0, Math.PI * 2);
    ctx.fillStyle = berserkMode ? 'rgba(255, 60, 60, 0.5)' : 'rgba(160, 32, 32, 0.4)';
    ctx.fill();
    ctx.strokeStyle = berserkMode ? '#ff2020' : '#a02020';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#d4c5a0';
    ctx.font = 'bold 20px Tahoma';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔️', 75, H - 75);
  }

  // اوورلی قرمز برزرک
  if (berserkMode) {
    const pulse = 0.15 + Math.sin(Date.now() / 100) * 0.05;
    ctx.fillStyle = `rgba(200, 20, 20, ${pulse})`;
    ctx.fillRect(0, 0, W, H);
  }

  // متن مکث بین موج‌ها
  if (waveBreakTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, H / 2 - 40, W, 80);
    ctx.fillStyle = '#d4c5a0';
    ctx.font = 'bold 24px Tahoma';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`موج ${wave + 1} در راه است...`, W / 2, H / 2);
  }

  ctx.restore();
}

function loop() {
  update();
  draw();
  if (gameRunning) requestAnimationFrame(loop);
}

function gameOver() {
  gameRunning = false;
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalWave').textContent = wave;
  document.getElementById('gameover').classList.remove('hidden');
}

function restart() {
  document.getElementById('gameover').classList.add('hidden');
  player.x = W / 2; player.y = H / 2; player.hp = 100;
  player.attackTimer = 0; player.attackCooldown = 0; player.attackAngle = 0;
  player.trail = [];
  enemies = []; particles = []; projectiles = [];
  score = 0; rage = 0; berserkMode = false; berserkTimer = 0;
  waveBreakTimer = 0; waveEnemiesLeft = 0; bossActive = false;
  gameRunning = true;
  document.getElementById('hp').textContent = 100;
  document.getElementById('score').textContent = 0;
  const rb = document.getElementById('rage');
  if (rb) rb.textContent = '0';
  startWave(1);
  loop();
}

startWave(1);
loop();