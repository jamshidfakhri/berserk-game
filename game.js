const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ===== صدا (Web Audio API) =====
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
}
function playSound(type) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  if (type === 'slash') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now); osc.stop(now + 0.15);
  } else if (type === 'kill') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.start(now); osc.stop(now + 0.25);
  } else if (type === 'hurt') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.start(now); osc.stop(now + 0.25);
  } else if (type === 'boss') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.5);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.start(now); osc.stop(now + 0.6);
  }
}

// ===== بهترین امتیاز =====
let bestScore = parseInt(localStorage.getItem('berserkBest') || '0');
document.getElementById('best').textContent = bestScore;

// ===== وضعیت =====
let gameRunning = true;
let paused = false;
let score = 0;
let wave = 1;
let waveEnemiesLeft = 0;
let waveBreakTimer = 0;
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

// ===== انواع دشمن =====
const ENEMY_TYPES = {
  light:  { r: 12, speedMult: 1.4, hp: 1, score: 5,  color: '#a03030', damage: 8  },
  normal: { r: 14, speedMult: 1.0, hp: 1, score: 10, color: '#8b2020', damage: 10 },
  heavy:  { r: 20, speedMult: 0.7, hp: 3, score: 25, color: '#5a0808', damage: 20 },
};

function pickEnemyType() {
  const r = Math.random();
  if (wave < 2) return 'light';
  if (r < 0.3) return 'light';
  if (r < 0.85) return 'normal';
  return 'heavy';
}

function startWave(n) {
  wave = n;
  document.getElementById('wave').textContent = wave;
  bossActive = false;

  if (n % 5 === 0) {
    spawnBoss();
    bossActive = true;
    waveEnemiesLeft = 1;
    playSound('boss');
  } else {
    waveEnemiesLeft = 3 + Math.floor(n * 1.5);
    const initial = Math.min(waveEnemiesLeft, 3);
    for (let i = 0; i < initial; i++) spawnEnemy();
    waveEnemiesLeft -= initial;
  }
}

function spawnEnemy() {
  const type = pickEnemyType();
  const t = ENEMY_TYPES[type];
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * W; y = -30; }
  else if (side === 1) { x = W + 30; y = Math.random() * H; }
  else if (side === 2) { x = Math.random() * W; y = H + 30; }
  else { x = -30; y = Math.random() * H; }
  enemies.push({
    x, y, r: t.r,
    speed: (1 + wave * 0.12) * t.speedMult,
    angle: Math.random() * Math.PI * 2,
    hp: t.hp, maxHp: t.hp,
    isBoss: false,
    type: type,
    color: t.color,
    scoreValue: t.score,
    damage: t.damage,
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
    type: 'boss',
    color: '#5a0a0a',
    scoreValue: 100,
    damage: 20,
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
  initAudio();
  if (paused || !gameRunning) return;
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

canvas.addEventListener('mousedown', () => initAudio());

function attack() {
  if (player.attackCooldown > 0 || !gameRunning || paused) return;
  let angle = player.attackAngle;
  if (touchStart && touchCurrent) {
    angle = Math.atan2(touchCurrent.y - touchStart.y, touchCurrent.x - touchStart.x);
  }
  player.attackAngle = angle;
  player.attackTimer = berserkMode ? 18 : 12;
  player.attackCooldown = berserkMode ? 10 : 20;
  playSound('slash');
}

function togglePause() {
  if (!gameRunning) return;
  paused = !paused;
  document.getElementById('pauseBtn').textContent = paused ? '▶️' : '⏸️';
  if (!paused) loop();
}

// ===== به‌روزرسانی =====
function update() {
  if (!gameRunning || paused) return;

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

  player.trail.push({ x: player.x, y: player.y, life: 15 });
  if (player.trail.length > 15) player.trail.shift();
  player.trail.forEach(t => t.life--);
  player.trail = player.trail.filter(t => t.life > 0);

  if (waveBreakTimer > 0) {
    waveBreakTimer--;
    if (waveBreakTimer === 0) startWave(wave + 1);
  }

  if (waveEnemiesLeft > 0 && !bossActive && waveBreakTimer === 0) {
    if (Math.random() < 0.03) {
      spawnEnemy();
      waveEnemiesLeft--;
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.angle += e.isBoss ? 0.03 : (e.type === 'heavy' ? 0.05 : 0.1);
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);

    if (e.isBoss) {
      if (dist > 150) {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      }
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

    if (dist < e.r + player.r) {
      const dmg = berserkMode ? Math.floor(e.damage / 2) : e.damage;
      player.hp -= dmg;
      spawnParticles(e.x, e.y, '#8b2020', e.isBoss ? 30 : 15);
      shakeAmount = e.isBoss ? 15 : 8;
      playSound('hurt');
      if (!e.isBoss && e.type !== 'heavy') {
        enemies.splice(i, 1);
      }
      document.getElementById('hp').textContent = Math.max(0, player.hp);
      if (player.hp <= 0) { gameOver(); return; }
      continue;
    }

    if (player.attackTimer > 0) {
      const swordLen = berserkMode ? 90 : 60;
      const sx = player.x + Math.cos(player.attackAngle) * swordLen;
      const sy = player.y + Math.sin(player.attackAngle) * swordLen;
      const sdist = Math.hypot(sx - e.x, sy - e.y);
      if (sdist < e.r + 28) {
        e.hp--;
        spawnParticles(e.x, e.y, '#c02020', 8);
        if (e.hp <= 0) {
          spawnParticles(e.x, e.y, '#c02020', e.isBoss ? 60 : 20);
          shakeAmount = e.isBoss ? 20 : 6;
          score += e.scoreValue;
          playSound('kill');
          if (!berserkMode) {
            rage = Math.min(100, rage + (e.isBoss ? 40 : 8));
            if (rage >= 100) {
              berserkMode = true;
              berserkTimer = 300;
            }
          }
          document.getElementById('score').textContent = score;
          enemies.splice(i, 1);
          if (e.isBoss) waveBreakTimer = 120;
        }
      }
    }
  }

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
      playSound('hurt');
      projectiles.splice(i, 1);
      document.getElementById('hp').textContent = Math.max(0, player.hp);
      if (player.hp <= 0) { gameOver(); return; }
    }
  }

  if (!bossActive && enemies.length === 0 && waveEnemiesLeft === 0 && waveBreakTimer === 0) {
    waveBreakTimer = 120;
  }

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

  player.trail.forEach(t => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, player.r * (t.life / 15), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(192, 160, 96, ${t.life / 30})`;
    ctx.fill();
  });

  particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  projectiles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4040';
    ctx.fill();
    ctx.strokeStyle = '#800';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  enemies.forEach(e => {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    ctx.beginPath();
    ctx.moveTo(0, -e.r);
    ctx.lineTo(e.r * 0.8, e.r * 0.7);
    ctx.lineTo(-e.r * 0.8, e.r * 0.7);
    ctx.closePath();
    ctx.fillStyle = e.color;
    ctx.fill();
    ctx.strokeStyle = e.isBoss ? '#ff2020' : '#3a0808';
    ctx.lineWidth = e.isBoss ? 4 : 2;
    ctx.stroke();
    ctx.restore();

    if (e.isBoss || e.type === 'heavy') {
      const bw = e.isBoss ? 80 : 40;
      const bx = e.x - bw / 2;
      const by = e.y - e.r - 18;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, bw, 6);
      ctx.fillStyle = '#c02020';
      ctx.fillRect(bx, by, bw * (e.hp / e.maxHp), 6);
    }
  });

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

  // هاله بازیکن
  const haloR = berserkMode ? 30 : 22;
  const haloGrad = ctx.createRadialGradient(player.x, player.y, player.r, player.x, player.y, haloR);
  haloGrad.addColorStop(0, berserkMode ? 'rgba(255, 80, 80, 0.4)' : 'rgba(192, 160, 96, 0.3)');
  haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(player.x, player.y, haloR, 0, Math.PI * 2);
  ctx.fillStyle = haloGrad;
  ctx.fill();

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

  if (gameRunning && !paused) {
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

  if (berserkMode) {
    const pulse = 0.15 + Math.sin(Date.now() / 100) * 0.05;
    ctx.fillStyle = `rgba(200, 20, 20, ${pulse})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (waveBreakTimer > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, H / 2 - 40, W, 80);
    ctx.fillStyle = '#d4c5a0';
    ctx.font = 'bold 24px Tahoma';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`موج ${wave + 1} در راه است...`, W / 2, H / 2);
  }

  if (paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#d4c5a0';
    ctx.font = 'bold 36px Tahoma';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('مکث', W / 2, H / 2);
  }

  ctx.restore();
}

function loop() {
  update();
  draw();
  if (gameRunning && !paused) requestAnimationFrame(loop);
}

function gameOver() {
  gameRunning = false;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('berserkBest', bestScore);
    document.getElementById('best').textContent = bestScore;
  }
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalWave').textContent = wave;
  document.getElementById('bestScore').textContent = bestScore;
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
  paused = false;
  document.getElementById('pauseBtn').textContent = '⏸️';
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