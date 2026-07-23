/* AI PDLC RUSH — redesigned engine. Locked palette, pixel sprites, no glow.
   Exposes window.Rush = { Engine, spriteURL, drawMap, C, ZONES } */
(function () {
  'use strict';

  // ---------- Palette (locked) ----------
  const C = {
    bg0: '#07171D', bg1: '#0C2530', outline: '#04121A', ink: '#F2F8F5',
    ink60: 'rgba(230,242,238,0.62)',
    green: '#21A038', bright: '#3BD269', greenDark: '#15702C',
    blue: '#4C8DEB', blueDark: '#2C5BD6',
    gold: '#F2C14E', goldDark: '#B0862E',
    danger: '#F4574D', dangerDark: '#8F231C', dangerDeep: '#5C1511',
    white: '#FFFFFF', steel: '#D9E6E0', slate: '#22343B',
  };

  // Zones: one base palette, one accent + subtle bg tint per zone
  const ZONES = [
    { name: 'Идея', short: 'IDEA', accent: '#E3C24E', tint: '#122430', tip: 'Собирай контекст' },
    { name: 'Дизайн', short: 'DESIGN', accent: '#B98BF0', tint: '#171F31', tip: 'Держи ритм' },
    { name: 'Код', short: 'CODE', accent: '#3BD269', tint: '#0C2822', tip: 'Прыгай через баги' },
    { name: 'Тест', short: 'TEST', accent: '#E89B5A', tint: '#241E18', tip: 'Дебаж на ходу' },
    { name: 'Релиз', short: 'RELEASE', accent: '#5AB8E8', tint: '#0E2430', tip: 'Не сбавляй темп' },
    { name: 'Поддержка', short: 'SUPPORT', accent: '#E87BA8', tint: '#231A24', tip: 'Тикет-шторм' },
  ];
  const getZone = (i) => ZONES[((i % 6) + 6) % 6];
  const lapLabel = (zc) => { const lap = Math.floor(zc / 6); return lap <= 0 ? '' : lap === 1 ? 'КРУГ 2 · ПРОД В ОГНЕ' : `КРУГ ${lap + 1}`; };

  // ---------- Pixel sprite maps ----------
  const PAL = { o: C.outline, w: C.white, s: C.steel, g: C.bright, d: C.greenDark, k: '#0A1F28', r: C.danger, q: C.dangerDark, y: C.gold, h: C.goldDark, b: C.blue, i: C.ink };
  const MAPS = {
    robot: [
      '.....gg.....',
      '.....gg.....',
      '.....oo.....',
      '..oooooooo..',
      '.owwwwwwwwo.',
      '.owkkkkkkwo.',
      '.owkgkkgkwo.',
      '.owkkkkkkwo.',
      '.owwwwwwwwo.',
      'oowwwwwwwwoo',
      'ogwwwwwwwwgo',
      '.owwggggwwo.',
      '..oooooooo..',
      '..oo....oo..',
    ],
    robot_slide: [
      '..oooooooo..',
      '.owwwwwwwwo.',
      '.owkkkkkkwo.',
      '.owkgkkgkwo.',
      '.owwwwwwwwo.',
      'ogwwwwwwwwgo',
      '.owwggggwwo.',
      '..oooooooo..',
    ],
    bug: [
      '..o......o..',
      '...o....o...',
      '..oooooooo..',
      '.orrrrrrrro.',
      'oorrwrrwrroo',
      '.orrrrrrrro.',
      '.orqrrrrqro.',
      '..oooooooo..',
      '..o..oo..o..',
      '.o...oo...o.',
    ],
    token: [
      '.oooooooo.',
      'oggggggggo',
      'oggwggwggo',
      'ogwggggwgo',
      'ogwggggwgo',
      'oggwggwggo',
      'oggggggggo',
      'oddddddddo',
      'oddddddddo',
      '.oooooooo.',
    ],
    token_gold: [
      '.oooooooo.',
      'oyyyyyyyyo',
      'oyyywwyyyo',
      'oyywwwwyyo',
      'oyywwwwyyo',
      'oyyywwyyyo',
      'oyyyyyyyyo',
      'ohhhhhhhho',
      'ohhhhhhhho',
      '.oooooooo.',
    ],
    heart: [
      '.xx..xx.',
      'xxxxxxxx',
      'xxxxxxxx',
      'xxxxxxxx',
      '.xxxxxx.',
      '..xxxx..',
      '...xx...',
    ],
    bolt: [
      '...xx.',
      '..xx..',
      '.xxxx.',
      '..xx..',
      '.xx...',
      'xx....',
    ],
    flame: [
      '....x...',
      '...xx...',
      '..xxx...',
      '..xxxx..',
      '.xxxxxx.',
      '.xxxxxx.',
      '.xxwwxx.',
      '..xwwx..',
      '..xxxx..',
      '...xx...',
    ],
    flag: [
      'xxxxxxx.',
      'xwwxxxx.',
      'xxxxxxx.',
      'x.......',
      'x.......',
      'x.......',
      'x.......',
      'x.......',
    ],
  };

  function drawMap(ctx, map, x, y, p, colorX) {
    for (let r = 0; r < map.length; r++) {
      const row = map[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === '.') continue;
        ctx.fillStyle = ch === 'x' ? (colorX || C.ink) : PAL[ch];
        ctx.fillRect(x + c * p, y + r * p, p, p);
      }
    }
  }

  // Procedural power-up icons on a white keycap
  function drawKeycap(ctx, x, y, p, w) {
    // w = grid width (12)
    ctx.fillStyle = C.outline;
    ctx.fillRect(x + p, y, (w - 2) * p, w * p);
    ctx.fillRect(x, y + p, w * p, (w - 2) * p);
    ctx.fillStyle = C.white;
    ctx.fillRect(x + p, y + p, (w - 2) * p, (w - 4) * p);
    ctx.fillStyle = C.steel;
    ctx.fillRect(x + p, y + (w - 3) * p, (w - 2) * p, 2 * p);
  }
  function drawPowIcon(kind, ctx, x, y, p) {
    // draw inside 12x12 keycap; icon area ~ cols 3..9 rows 3..8
    const g = (cx, cy, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + cx * p, y + cy * p, w * p, h * p); };
    drawKeycap(ctx, x, y, p, 12);
    if (kind === 'shield') {
      g(3, 2, 6, 4, C.blue); g(4, 6, 4, 1, C.blue); g(5, 7, 2, 1, C.blue);
      g(5, 3, 1, 1, C.white); g(6, 4, 1, 1, C.white); g(4, 4, 1, 1, C.white);
    } else if (kind === 'magnet') {
      g(3, 2, 2, 5, C.danger); g(7, 2, 2, 5, C.blue);
      g(3, 6, 6, 2, C.slate); g(3, 2, 2, 1, C.white); g(7, 2, 2, 1, C.white);
    } else if (kind === 'boost') {
      g(5, 2, 2, 2, C.bright); g(4, 3, 4, 1, C.bright);
      g(5, 5, 2, 2, C.bright); g(4, 6, 4, 1, C.bright);
    } else if (kind === 'autopilot') {
      g(3, 3, 6, 5, C.slate); g(4, 4, 1, 2, C.bright); g(7, 4, 1, 2, C.bright); g(5, 1, 2, 2, C.bright);
    } else if (kind === 'fountain') {
      g(5, 2, 2, 1, C.bright); g(4, 3, 4, 2, C.bright); g(5, 5, 2, 1, C.bright);
      g(2, 6, 1, 1, C.bright); g(9, 6, 1, 1, C.bright); g(5, 7, 2, 1, C.bright);
    }
  }

  function spriteURL(name, scale) {
    const cv = document.createElement('canvas');
    const p = Math.max(1, Math.round(scale || 3));
    let w, h;
    if (name.startsWith('pow_')) { w = 12; h = 12; }
    else if (MAPS[name]) { w = MAPS[name][0].length; h = MAPS[name].length; }
    else { w = 12; h = 12; }
    cv.width = w * p; cv.height = h * p;
    const ctx = cv.getContext('2d');
    if (name.startsWith('pow_')) drawPowIcon(name.slice(4), ctx, 0, 0, p);
    else if (name === 'heart') drawMap(ctx, MAPS.heart, 0, 0, p, C.bright);
    else if (name === 'heart_empty') drawMap(ctx, MAPS.heart, 0, 0, p, '#22343B');
    else if (name === 'bolt') drawMap(ctx, MAPS.bolt, 0, 0, p, C.gold);
    else if (name === 'flame') drawMap(ctx, MAPS.flame, 0, 0, p, C.danger);
    else if (name === 'flag') drawMap(ctx, MAPS.flag, 0, 0, p, C.steel);
    else drawMap(ctx, MAPS[name], 0, 0, p);
    return cv.toDataURL();
  }

  // ---------- RNG ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const chance = (rng, p) => rng() < p;
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const randInt = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
  const randRange = (rng, a, b) => a + rng() * (b - a);

  // ---------- Audio (light synth, no glow for the ears either) ----------
  class Audio2 {
    constructor() { this.ctx = null; this.muted = true; this.musicTimer = 0; this.tempo = 1; this.step = 0; }
    ensure() { if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); } return this.ctx; }
    resume() { const c = this.ensure(); if (c && c.state === 'suspended') c.resume(); }
    setMuted(m) { this.muted = m; }
    beep(freq, dur, type, vol, slide) {
      if (this.muted) return; const c = this.ensure(); if (!c) return;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(freq, c.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.05, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
    }
    token(n) { this.beep(440 * Math.pow(1.12, n), 0.09, 'square', 0.045); }
    golden() { this.beep(660, 0.3, 'square', 0.06, 660); }
    swipe() { this.beep(300, 0.06, 'triangle', 0.04, 120); }
    jump() { this.beep(240, 0.16, 'triangle', 0.05, 260); }
    crash() { this.beep(120, 0.3, 'sawtooth', 0.09, -80); }
    powerup() { this.beep(520, 0.2, 'square', 0.06, 300); }
    multiplierUp() { this.beep(700, 0.14, 'square', 0.05, 200); }
    nearMiss() { this.beep(880, 0.07, 'triangle', 0.04); }
    zoneChange() { this.beep(392, 0.22, 'square', 0.05, 190); }
    gameOver() { this.beep(220, 0.5, 'sawtooth', 0.07, -160); }
    countdownTick(go) { this.beep(go ? 880 : 440, go ? 0.25 : 0.1, 'square', 0.06); }
    setTempo(t) { this.tempo = t; }
    startMusic() {
      this.stopMusic();
      const notes = [110, 110, 165, 110, 131, 110, 165, 196];
      this.musicTimer = setInterval(() => {
        if (this.muted) return;
        this.beep(notes[this.step % 8], 0.1, 'triangle', 0.028);
        this.step++;
      }, 240);
    }
    stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = 0; }
  }

  // ---------- Engine ----------
  const LANES = 3;
  const MULT_STEPS = [{ c: 0, m: 1 }, { c: 5, m: 1.5 }, { c: 10, m: 2 }, { c: 20, m: 3 }, { c: 35, m: 4 }, { c: 55, m: 5 }];
  const POWER_META = {
    shield: { color: C.blue, label: 'QA-ЩИТ' },
    magnet: { color: C.blue, label: 'МАГНИТ' },
    boost: { color: C.bright, label: 'СПРИНТ' },
    autopilot: { color: C.bright, label: 'АВТОПИЛОТ' },
    fountain: { color: C.gold, label: 'ФОНТАН' },
  };
  const TOKEN_VALUE = 25, GOLDEN_VALUE = 150, NEARMISS_BONUS = 15, DIST_POINTS = 0.5;

  class Engine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.audio = new Audio2();
      this.W = 450; this.H = 800; this.unit = 1; this.dpr = 1;
      this.rng = mulberry32(1);
      this.state = 'ready';
      this.raf = 0; this.lastTime = 0; this.time = 0;
      this.best = 0; this.reduceMotion = false; this.showHitboxes = false; this.startZone = 0;
      this.onStats = () => {}; this.onGameOver = () => {};
      this.resetVars();
    }
    resetVars() {
      this.speed = 0; this.baseSpeed = 0; this.distance = 0; this.spawnAcc = 0;
      this.zoneCounter = 0; this.distanceInZone = 0; this.zone = getZone(this.startZone || 0);
      this.zoneFlash = 0; this.bannerT = 0;
      this.laneIndex = 1; this.prevLane = 1; this.laneChangeT = 0;
      this.playerX = 0; this.targetX = 0; this.jumpT = 0; this.slideT = 0;
      this.jumpDur = 0.62; this.slideDur = 0.5; this.bufferedAction = ''; this.bufferT = 0;
      this.lives = 3; this.invincT = 0; this.shieldT = 0; this.magnetT = 0; this.boostT = 0; this.autopilotT = 0; this.goldenBoostT = 0;
      this.combo = 0; this.maxCombo = 0; this.multiplier = 1; this.scoreFloat = 0; this.tokens = 0; this.nearMisses = 0;
      this.flowMeter = 0; this.lastNearT = -10; this.consecutiveNear = 0;
      this.obstacles = []; this.tokenList = []; this.powers = []; this.particles = []; this.floats = [];
      this.shake = 0; this.hitstop = 0; this.statsAcc = 0;
    }
    setBest(b) { this.best = b; }
    setReduceMotion(v) { this.reduceMotion = v; }
    setMuted(m) { this.audio.setMuted(m); }
    setShowHitboxes(v) { this.showHitboxes = v; }
    setStartZone(i) { this.startZone = i; }

    resize(cssW, cssH, dpr) {
      this.W = cssW; this.H = cssH; this.dpr = dpr; this.unit = cssH / 800;
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
      this.targetX = this.laneX(this.laneIndex);
      if (this.state !== 'playing') { this.playerX = this.targetX; this.renderStatic(); }
    }
    laneWidth() { return this.W / LANES; }
    laneX(i) { return this.laneWidth() * (i + 0.5); }
    get playerY() { return this.H * 0.78; }
    get playerSize() { return Math.min(this.laneWidth() * 0.58, 64 * this.unit); }
    px() { return Math.max(2, Math.round(this.playerSize / 12)); } // global pixel unit

    // --- input ---
    moveLeft() { if (this.state !== 'playing' || this.autopilotT > 0) return; if (this.laneIndex > 0) { this.prevLane = this.laneIndex; this.laneIndex--; this.laneChangeT = 0.3; this.targetX = this.laneX(this.laneIndex); this.audio.swipe(); } }
    moveRight() { if (this.state !== 'playing' || this.autopilotT > 0) return; if (this.laneIndex < LANES - 1) { this.prevLane = this.laneIndex; this.laneIndex++; this.laneChangeT = 0.3; this.targetX = this.laneX(this.laneIndex); this.audio.swipe(); } }
    jump() { if (this.state !== 'playing' || this.autopilotT > 0) return; if (this.jumpT <= 0 && this.slideT <= 0) { this.jumpT = this.jumpDur; this.audio.jump(); } else { this.bufferedAction = 'jump'; this.bufferT = 0.14; } }
    slide() { if (this.state !== 'playing' || this.autopilotT > 0) return; if (this.slideT <= 0 && this.jumpT <= 0) { this.slideT = this.slideDur; this.audio.swipe(); } else { this.bufferedAction = 'slide'; this.bufferT = 0.14; } }

    start(seed) {
      this.resetVars();
      this.seed = seed >>> 0; this.rng = mulberry32(this.seed);
      this.zoneCounter = this.startZone || 0; this.zone = getZone(this.zoneCounter);
      this.speed = 6 * 60 * this.unit; this.baseSpeed = this.speed;
      this.playerX = this.laneX(1); this.targetX = this.playerX;
      this.bannerT = 1.6; this.state = 'playing';
      this.audio.resume(); this.audio.startMusic();
      this.emitStats();
      this.lastTime = 0;
      this.loop(performance.now());
    }
    stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.audio.stopMusic(); }
    pause() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.lastTime = 0; }
    resumeLoop() { if (this.state === 'playing' && !this.raf) this.loop(performance.now()); }

    loop = (now) => {
      if (!this.lastTime) this.lastTime = now;
      let dt = (now - this.lastTime) / 1000; this.lastTime = now;
      if (dt > 0.05) dt = 0.05;
      if (this.hitstop > 0) this.hitstop -= dt;
      else if (this.state === 'playing') this.update(dt);
      this.render();
      if (this.state === 'playing') this.raf = requestAnimationFrame(this.loop);
      else this.raf = 0;
    };

    update(dt) {
      this.time += dt;
      this.laneChangeT = Math.max(0, this.laneChangeT - dt);
      this.invincT = Math.max(0, this.invincT - dt);
      this.shieldT = Math.max(0, this.shieldT - dt);
      this.magnetT = Math.max(0, this.magnetT - dt);
      this.goldenBoostT = Math.max(0, this.goldenBoostT - dt);
      if (this.bufferT > 0) this.bufferT = Math.max(0, this.bufferT - dt);
      this.boostT = Math.max(0, this.boostT - dt);
      const wasAuto = this.autopilotT > 0;
      this.autopilotT = Math.max(0, this.autopilotT - dt);
      if (wasAuto && this.autopilotT <= 0) this.spawnBurst(this.playerX, this.playerY, C.bright, 12);

      const growth = 7 * this.unit;
      this.baseSpeed = Math.min(this.baseSpeed + growth * dt, 18 * 60 * this.unit);
      this.speed = this.boostT > 0 ? this.baseSpeed * 1.6 : this.baseSpeed;
      this.audio.setTempo(0.85 + (this.baseSpeed / (18 * 60 * this.unit)) * 1.1);

      if (this.jumpT > 0) { this.jumpT = Math.max(0, this.jumpT - dt); if (this.jumpT <= 0 && this.bufferedAction === 'jump' && this.bufferT > 0) { this.jumpT = this.jumpDur; this.bufferedAction = ''; } }
      if (this.slideT > 0) { this.slideT = Math.max(0, this.slideT - dt); if (this.slideT <= 0 && this.bufferedAction === 'slide' && this.bufferT > 0) { this.slideT = this.slideDur; this.bufferedAction = ''; } }

      if (this.autopilotT > 0) this.autopilot();

      const lerp = 1 - Math.pow(0.0009, dt);
      this.playerX += (this.targetX - this.playerX) * lerp;

      const difficulty = this.difficulty();
      const rowInterval = this.speed * (0.95 - difficulty * 0.45);
      this.spawnAcc += this.speed * dt;
      if (this.spawnAcc >= rowInterval) { this.spawnAcc -= rowInterval; this.spawnRow(difficulty); }

      const dy = this.speed * dt;
      this.distance += dy; this.distanceInZone += dy;
      for (const o of this.obstacles) o.y += dy;
      for (const t of this.tokenList) t.y += dy;
      for (const p of this.powers) p.y += dy;

      const zoneLen = 4200 * this.unit;
      if (this.distanceInZone >= zoneLen) {
        this.distanceInZone -= zoneLen; this.zoneCounter++;
        this.zone = getZone(this.zoneCounter);
        this.zoneFlash = 0.35; this.bannerT = 1.6;
        this.baseSpeed += 0.6 * 60 * this.unit;
        const bonus = 200 + this.zoneCounter * 50;
        this.addScore(bonus, this.playerX, this.playerY - 40 * this.unit, `ЭТАП +${bonus}`, this.zone.accent);
        this.audio.zoneChange();
        this.shake = Math.min(this.shake + 3 * this.unit, 8 * this.unit);
      }
      if (this.zoneFlash > 0) this.zoneFlash = Math.max(0, this.zoneFlash - dt);
      if (this.bannerT > 0) this.bannerT = Math.max(0, this.bannerT - dt);

      this.handleTokens(dt);
      this.handlePowers();
      this.handleObstacles();

      if (this.time - this.lastNearT > 2) this.consecutiveNear = 0;
      this.flowMeter = Math.max(0, this.flowMeter - dt * 0.35);

      const boostFactor = this.boostT > 0 ? 2 : 1;
      this.scoreFloat += (this.speed / (60 * this.unit)) * dt * DIST_POINTS * boostFactor;

      this.updateParticles(dt);
      this.shake *= Math.pow(0.001, dt);
      if (this.shake < 0.05) this.shake = 0;

      const margin = 140 * this.unit;
      this.obstacles = this.obstacles.filter((o) => o.y < this.H + margin);
      this.tokenList = this.tokenList.filter((t) => !t.taken && t.y < this.H + margin);
      this.powers = this.powers.filter((p) => !p.taken && p.y < this.H + margin);

      this.statsAcc += dt;
      if (this.statsAcc >= 0.066) { this.statsAcc = 0; this.emitStats(); }
    }

    difficulty() {
      const byTime = Math.min(1, this.time / 90);
      const byZone = Math.min(1, this.zoneCounter / 8);
      return Math.min(1, byTime * 0.6 + byZone * 0.6);
    }
    flowActive() { return this.consecutiveNear >= 3 && this.time - this.lastNearT < 2; }
    flowBonus() { return this.flowActive() ? 1.25 : 1; }
    effectiveMultiplier() { let m = this.multiplier; if (this.goldenBoostT > 0) m += 1; return Math.min(m, 6); }

    spawnRow(difficulty) {
      const rng = this.rng; const y = -80 * this.unit;
      if (chance(rng, 0.12)) {
        const n = randInt(rng, 1, LANES);
        const lanes = this.shuffleLanes(rng).slice(0, n);
        for (const lane of lanes) this.pushToken(lane, y, chance(rng, 0.06));
        return;
      }
      let blocked = 0; const roll = rng();
      if (roll < 0.28 - difficulty * 0.15) blocked = 0;
      else if (roll < 0.85) blocked = 1;
      else blocked = 2;
      const laneOrder = this.shuffleLanes(rng);
      const blockedLanes = laneOrder.slice(0, blocked);
      const freeLanes = laneOrder.slice(blocked);
      for (const lane of blockedLanes) {
        const type = this.pickObstacleType(rng, difficulty);
        this.pushObstacle(lane, y, type, chance(rng, 0.15 + difficulty * 0.2));
      }
      for (const lane of freeLanes) {
        if (chance(rng, 0.72)) this.pushToken(lane, y, chance(rng, 0.015 + difficulty * 0.015));
      }
      if (freeLanes.length > 0 && chance(rng, 0.04 + difficulty * 0.04)) {
        const lane = pick(rng, freeLanes);
        this.powers.push({ lane, y: y - 40 * this.unit, kind: pick(rng, ['shield', 'magnet', 'boost', 'autopilot', 'fountain']), taken: false });
      }
      if (blocked > 0 && chance(rng, 0.25)) this.pushToken(pick(rng, blockedLanes), y + 90 * this.unit, false);
    }
    pickObstacleType(rng, difficulty) {
      const allowOver = this.zone.short === 'RELEASE' || this.zone.short === 'SUPPORT' || difficulty > 0.5;
      const r = rng();
      if (allowOver && r < 0.25) return 'over';
      if (r < 0.6) return 'wall';
      return 'low';
    }
    shuffleLanes(rng) { const arr = [0, 1, 2]; for (let i = 2; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
    pushObstacle(lane, y, type, blink) {
      const lw = this.laneWidth();
      let h = 46 * this.unit;
      if (type === 'wall') h = 70 * this.unit;
      if (type === 'over') h = 40 * this.unit;
      this.obstacles.push({ lane, y, w: lw * 0.66, h, type, passed: false, blink, seed: Math.floor(this.rng() * 1000) });
    }
    pushToken(lane, y, golden) { this.tokenList.push({ lane, y, golden, taken: false, x: this.laneX(lane), pulled: false }); }

    handleTokens(dt) {
      const collectR = this.playerSize * 0.7;
      for (const t of this.tokenList) {
        if (t.taken) continue;
        const magnet = this.magnetT > 0;
        const tx = this.laneX(t.lane);
        if (magnet && Math.abs(t.y - this.playerY) < this.H * 0.5) {
          t.pulled = true;
          const pull = 1 - Math.pow(0.0005, dt);
          t.x += (this.playerX - t.x) * pull;
        } else t.x = tx;
        const dx = Math.abs(t.x - this.playerX);
        const dyT = Math.abs(t.y - this.playerY);
        const laneHit = t.lane === this.laneIndex || (magnet && dx < collectR) || t.pulled;
        if (laneHit && dyT < collectR && dx < this.laneWidth() * 0.6) this.collectToken(t);
      }
    }
    collectToken(t) {
      t.taken = true; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.updateMultiplier(); this.tokens++;
      const boostFactor = this.boostT > 0 ? 2 : 1;
      const val = (t.golden ? GOLDEN_VALUE : TOKEN_VALUE) * this.effectiveMultiplier() * this.flowBonus() * boostFactor;
      this.addScore(Math.round(val), this.laneX(t.lane), t.y, `+${Math.round(val)}`, t.golden ? C.gold : C.bright);
      if (t.golden) {
        this.goldenBoostT = 5; this.audio.golden();
        this.spawnBurst(this.laneX(t.lane), t.y, C.gold, 16);
        this.shake = Math.min(this.shake + 2 * this.unit, 6 * this.unit);
      } else {
        this.audio.token(Math.min(this.combo, 7));
        this.spawnBurst(t.x, t.y, C.bright, 6);
      }
    }
    handlePowers() {
      const r = this.playerSize * 0.8;
      for (const p of this.powers) {
        if (p.taken) continue;
        if (p.lane === this.laneIndex && Math.abs(p.y - this.playerY) < r) { p.taken = true; this.activatePower(p.kind); }
      }
    }
    activatePower(kind) {
      const meta = POWER_META[kind];
      this.audio.powerup();
      this.addFloat(this.playerX, this.playerY - 50 * this.unit, meta.label, meta.color, 1.2, 1.25);
      this.spawnBurst(this.playerX, this.playerY, meta.color, 14);
      this.shake = Math.min(this.shake + 2 * this.unit, 7 * this.unit);
      switch (kind) {
        case 'shield': this.shieldT = 4; this.invincT = Math.max(this.invincT, 4); break;
        case 'magnet': this.magnetT = 5; break;
        case 'boost': this.boostT = 3; break;
        case 'autopilot': this.autopilotT = 4; this.invincT = Math.max(this.invincT, 4); break;
        case 'fountain': {
          for (let i = 0; i < 25; i++) { this.combo++; this.tokens++; }
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.updateMultiplier();
          const val = 25 * TOKEN_VALUE * this.effectiveMultiplier();
          this.addScore(Math.round(val), this.playerX, this.playerY - 30 * this.unit, `+${Math.round(val)}`, C.gold);
          this.spawnBurst(this.playerX, this.playerY, C.gold, 30);
          break;
        }
      }
      this.emitStats();
    }
    handleObstacles() {
      const collH = this.playerSize * 0.7;
      const jumping = this.jumpT > 0.08 && this.jumpT < this.jumpDur - 0.02;
      const sliding = this.slideT > 0;
      const invincible = this.invincT > 0 || this.shieldT > 0 || this.autopilotT > 0;
      for (const o of this.obstacles) {
        if (o.passed) continue;
        const band = o.h / 2 + collH / 2;
        const sameLane = o.lane === this.laneIndex;
        const overlap = Math.abs(o.y - this.playerY) < band;
        if (sameLane && overlap) {
          const avoided = (o.type === 'low' && jumping) || (o.type === 'over' && sliding);
          if (!avoided) {
            if (invincible) {
              o.passed = true;
              this.spawnBurst(this.laneX(o.lane), o.y, this.shieldT > 0 ? C.blue : C.bright, 10);
              if (this.shieldT > 0) this.addScore(10, this.laneX(o.lane), o.y, '+10', C.blue);
            } else { this.hit(o); o.passed = true; }
            continue;
          }
        }
        if (o.y > this.playerY + band + 4 * this.unit) {
          o.passed = true;
          const dodgedSameLane = sameLane && ((o.type === 'low' && jumping) || (o.type === 'over' && sliding));
          const dodgedSwitch = o.lane === this.prevLane && o.lane !== this.laneIndex && this.laneChangeT > 0;
          if (!invincible && (dodgedSameLane || dodgedSwitch)) this.nearMiss(o);
        }
      }
    }
    nearMiss(o) {
      this.nearMisses++; this.consecutiveNear++; this.lastNearT = this.time;
      this.flowMeter = Math.min(1, this.flowMeter + 0.34);
      this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.updateMultiplier();
      const boostFactor = this.boostT > 0 ? 2 : 1;
      const val = Math.round(NEARMISS_BONUS * this.effectiveMultiplier() * this.flowBonus() * boostFactor);
      const label = this.flowActive() ? 'ПОТОК' : 'РЯДОМ';
      this.addScore(val, this.laneX(o.lane), this.playerY, `${label} +${val}`, C.bright);
      this.audio.nearMiss();
    }
    hit(o) {
      this.lives--; this.combo = 0; this.multiplier = 1; this.consecutiveNear = 0; this.flowMeter = 0;
      this.invincT = 1.2; this.hitstop = this.reduceMotion ? 0 : 0.07;
      this.shake = 10 * this.unit;
      this.audio.crash();
      if (navigator.vibrate) { try { navigator.vibrate(120); } catch (e) { /* ignore */ } }
      this.spawnBurst(this.laneX(o.lane), o.y, C.danger, 20);
      this.addFloat(this.playerX, this.playerY - 40 * this.unit, '−1 ЖИЗНЬ', C.danger, 1, 1.1);
      this.emitStats();
      if (this.lives <= 0) this.gameOver();
    }
    updateMultiplier() {
      let m = 1;
      for (const s of MULT_STEPS) if (this.combo >= s.c) m = s.m;
      if (m > this.multiplier) {
        this.multiplier = m;
        this.audio.multiplierUp();
        this.addFloat(this.playerX, this.playerY - 70 * this.unit, `×${m}`, C.ink, 1, 1.4);
        this.shake = Math.min(this.shake + 1.5 * this.unit, 6 * this.unit);
      } else this.multiplier = m;
    }
    autopilot() {
      const look = this.H * 0.6;
      const laneDanger = [0, 0, 0]; const laneToken = [0, 0, 0];
      for (const o of this.obstacles) {
        if (o.passed) continue;
        if (o.y < this.playerY && o.y > this.playerY - look) {
          const dist = this.playerY - o.y;
          if (o.type === 'wall') laneDanger[o.lane] += (look - dist) / look;
        }
      }
      for (const t of this.tokenList) { if (!t.taken && t.y < this.playerY && t.y > this.playerY - look) laneToken[t.lane] += 1; }
      let bestLane = this.laneIndex, bestScore = -Infinity;
      for (let i = 0; i < LANES; i++) {
        const sc = laneToken[i] * 2 - laneDanger[i] * 5 - Math.abs(i - this.laneIndex) * 0.4;
        if (sc > bestScore) { bestScore = sc; bestLane = i; }
      }
      if (bestLane !== this.laneIndex) { this.prevLane = this.laneIndex; this.laneIndex = bestLane; this.laneChangeT = 0.3; this.targetX = this.laneX(bestLane); }
      for (const o of this.obstacles) {
        if (o.passed || o.lane !== this.laneIndex) continue;
        const dist = this.playerY - o.y;
        if (dist > 0 && dist < 60 * this.unit) {
          if (o.type === 'low' && this.jumpT <= 0) this.jumpT = this.jumpDur;
          if (o.type === 'over' && this.slideT <= 0) this.slideT = this.slideDur;
        }
      }
    }
    addScore(amount, x, y, text, color) { this.scoreFloat += amount; if (text) this.addFloat(x, y, text, color, 0.9, 1); }
    addFloat(x, y, text, color, life, scale) { this.floats.push({ x, y, text, color, life, maxLife: life, vy: -50 * this.unit, scale }); }
    spawnBurst(x, y, color, n) {
      if (this.reduceMotion) n = Math.ceil(n / 3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = randRange(this.rng, 40, 200) * this.unit;
        this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: randRange(this.rng, 0.25, 0.6), maxLife: 0.6, color, size: randRange(this.rng, 2, 4) * this.unit, gravity: 300 * this.unit });
      }
    }
    updateParticles(dt) {
      for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt; p.life -= dt; }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const f of this.floats) { f.y += f.vy * dt; f.vy *= 0.92; f.life -= dt; }
      this.floats = this.floats.filter((f) => f.life > 0);
    }
    gameOver() {
      this.state = 'gameover';
      this.audio.gameOver(); this.audio.stopMusic();
      this.shake = 10 * this.unit;
      const result = { score: Math.floor(this.scoreFloat), tokens: this.tokens, maxCombo: this.maxCombo, nearMisses: this.nearMisses, zoneName: this.zone.name, distance: Math.floor(this.distance / this.unit) };
      this.emitStats();
      this.onGameOver(result);
    }
    emitStats() {
      this.onStats({
        score: Math.floor(this.scoreFloat), best: this.best, lives: this.lives,
        multiplier: this.effectiveMultiplier(), combo: this.combo, maxCombo: this.maxCombo,
        zoneName: this.zone.name, zoneShort: this.zone.short, zoneAccent: this.zone.accent,
        lap: lapLabel(this.zoneCounter), flow: this.flowActive(), flowMeter: this.flowMeter,
        tokens: this.tokens, shieldT: this.shieldT, magnetT: this.magnetT, boostT: this.boostT,
        autopilotT: this.autopilotT, nearMisses: this.nearMisses,
      });
    }

    // ---------- Render ----------
    render() {
      const ctx = this.ctx; const { W, H, dpr } = this;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, H);
      let sx = 0, sy = 0;
      if (this.shake > 0 && !this.reduceMotion) { sx = (Math.random() - 0.5) * this.shake; sy = (Math.random() - 0.5) * this.shake; }
      ctx.save();
      ctx.translate(Math.round(sx), Math.round(sy));
      this.drawBackground();
      this.drawLanes();
      this.drawTokens();
      this.drawPowers();
      this.drawObstacles();
      this.drawPlayer();
      this.drawParticles();
      this.drawFloats();
      this.drawFlowOverlay();
      this.drawBanner();
      ctx.restore();
      if (this.zoneFlash > 0) {
        ctx.save();
        ctx.globalAlpha = this.zoneFlash * 0.5;
        ctx.fillStyle = this.zone.accent;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }
    drawBackground() {
      const ctx = this.ctx; const { W, H } = this;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, this.zone.tint);
      g.addColorStop(0.6, C.bg0);
      g.addColorStop(1, C.bg0);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // sparse pixel stars
      ctx.save();
      ctx.globalAlpha = 0.22;
      const scroll = (this.distance * 0.25) % 48;
      ctx.fillStyle = C.steel;
      for (let i = -1; i < H / 48 + 1; i++) {
        for (let j = 0; j < 4; j++) {
          const px2 = ((j * 113 + i * 59) % (W - 12)) + 6;
          const py = i * 48 + scroll;
          ctx.fillRect(Math.round(px2), Math.round(py), 2, 2);
        }
      }
      ctx.restore();
    }
    drawLanes() {
      const ctx = this.ctx; const { W, H } = this;
      ctx.save();
      // track edges — zone accent, subtle
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = this.zone.accent;
      ctx.fillRect(2, 0, 2, H);
      ctx.fillRect(W - 4, 0, 2, H);
      ctx.globalAlpha = 1;
      // dashed dividers
      ctx.strokeStyle = 'rgba(230,242,238,0.10)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -(this.distance % 20);
      for (let i = 1; i < LANES; i++) {
        const x = Math.round(this.laneWidth() * i);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      ctx.setLineDash([]);
      // conveyor ties
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = C.steel;
      const s2 = this.distance % 96;
      for (let y = -96 + s2; y < H; y += 96) ctx.fillRect(8, Math.round(y), W - 16, 2);
      ctx.restore();
    }
    drawTokens() {
      const ctx = this.ctx;
      for (const t of this.tokenList) {
        if (t.taken) continue;
        const p = Math.max(3, Math.round(this.px() * 0.85));
        const bob = Math.round(Math.sin(this.time * 5 + t.lane * 2) * 1.5) * 2;
        const map = t.golden ? MAPS.token_gold : MAPS.token;
        const w = map[0].length * p;
        drawMap(ctx, map, Math.round(t.x - w / 2), Math.round(t.y - w / 2 + bob), p);
      }
    }
    drawPowers() {
      const ctx = this.ctx;
      for (const pw of this.powers) {
        if (pw.taken) continue;
        const p = Math.max(3, Math.round(this.px() * 0.95));
        const x = this.laneX(pw.lane);
        const bob = Math.round(Math.sin(this.time * 4) * 2) * 2;
        drawPowIcon(pw.kind, ctx, Math.round(x - 6 * p), Math.round(pw.y - 6 * p + bob), p);
      }
    }
    drawObstacles() {
      const ctx = this.ctx;
      for (const o of this.obstacles) {
        if (o.passed && o.y > this.playerY) continue;
        const x = this.laneX(o.lane);
        const off = o.blink && Math.floor(this.time * 5) % 2 === 0;
        ctx.save();
        if (off) ctx.globalAlpha = 0.3;
        ctx.translate(Math.round(x), Math.round(o.y));
        const w = o.w, h = o.h;
        if (o.type === 'wall') this.drawCrates(ctx, w, h, off);
        else if (o.type === 'low') this.drawBug(ctx, w, h);
        else this.drawOverhead(ctx, w, h);
        ctx.restore();
        if (this.showHitboxes) {
          ctx.save();
          ctx.strokeStyle = C.gold; ctx.lineWidth = 1;
          const yOff = o.type === 'over' ? -this.playerSize * 0.5 : 0;
          ctx.strokeRect(x - w / 2, o.y - h / 2 + yOff, w, h);
          ctx.restore();
        }
      }
    }
    drawCrates(ctx, w, h, off) {
      // техдолг: стопка ящиков с warning-полосами и "!"
      const p = Math.max(2, Math.round(this.px() * 0.6));
      const cw = Math.round(w / 2 / p) * p;
      const rows = 2, cols = 2;
      const totalW = cw * cols, totalH = Math.round(h / rows / p) * p * rows;
      const x0 = -totalW / 2, y0 = -totalH / 2;
      for (let r = 0; r < rows; r++) {
        for (let c2 = 0; c2 < cols; c2++) {
          const cx = x0 + c2 * cw, cy = y0 + r * (totalH / rows), ch = totalH / rows;
          ctx.fillStyle = C.outline; ctx.fillRect(cx, cy, cw, ch);
          ctx.fillStyle = C.dangerDark; ctx.fillRect(cx + p, cy + p, cw - 2 * p, ch - 2 * p);
          ctx.fillStyle = C.dangerDeep;
          ctx.fillRect(cx + p, cy + ch - 3 * p, cw - 2 * p, 2 * p);
          // diagonal warning notches
          ctx.fillStyle = C.danger;
          for (let i = 0; i < 3; i++) ctx.fillRect(cx + 2 * p + i * 3 * p, cy + 2 * p, p, p);
        }
      }
      // "!" on top center
      ctx.fillStyle = C.ink;
      ctx.fillRect(-p / 2, y0 + 3 * p, p, 4 * p);
      ctx.fillRect(-p / 2, y0 + 8 * p, p, p);
      if (off) {
        ctx.strokeStyle = C.danger; ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
        ctx.strokeRect(x0, y0, totalW, totalH); ctx.setLineDash([]);
      }
    }
    drawBug(ctx, w, h) {
      const p = Math.max(3, Math.round(this.px() * 1.1));
      const map = MAPS.bug;
      const mw = map[0].length * p, mh = map.length * p;
      const hop = Math.round(Math.abs(Math.sin(this.time * 8)) * 2) * 2;
      drawMap(ctx, map, Math.round(-mw / 2), Math.round(-mh / 2 - hop), p);
    }
    drawOverhead(ctx, w, h) {
      const p = Math.max(2, Math.round(this.px() * 0.6));
      const yTop = -h / 2 - this.playerSize * 0.5;
      // cables
      ctx.fillStyle = C.slate;
      ctx.fillRect(-w / 2 + 3 * p, yTop - 200, p, 200);
      ctx.fillRect(w / 2 - 4 * p, yTop - 200, p, 200);
      // beam
      ctx.fillStyle = C.outline; ctx.fillRect(-w / 2, yTop, w, h);
      ctx.fillStyle = C.dangerDark; ctx.fillRect(-w / 2 + p, yTop + p, w - 2 * p, h - 2 * p);
      // hazard stripes
      ctx.fillStyle = C.danger;
      for (let x = -w / 2 + 2 * p; x < w / 2 - 3 * p; x += 4 * p) ctx.fillRect(x, yTop + 2 * p, 2 * p, h - 4 * p);
      // bottom edge dashes (низ, под который подкат)
      ctx.fillStyle = C.ink;
      for (let x = -w / 2 + p; x < w / 2 - p; x += 3 * p) ctx.fillRect(x, yTop + h - p, 2 * p, p);
    }
    jumpOffset() {
      if (this.jumpT <= 0) return 0;
      const pr = 1 - this.jumpT / this.jumpDur;
      return -Math.sin(pr * Math.PI) * this.playerSize * 1.4;
    }
    drawPlayer() {
      const ctx = this.ctx;
      const x = this.playerX, baseY = this.playerY;
      const jo = this.jumpOffset();
      const sliding = this.slideT > 0;
      const size = this.playerSize;
      const invBlink = this.invincT > 0 && this.shieldT <= 0 && this.autopilotT <= 0 && Math.floor(this.time * 12) % 2 === 0;
      // shadow
      ctx.save();
      const shadowScale = 1 - (Math.abs(jo) / (size * 1.4)) * 0.6;
      ctx.globalAlpha = 0.3 * shadowScale;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(x, baseY + size * 0.58, size * 0.38 * shadowScale, size * 0.12 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (invBlink) return;
      const p = this.px();
      const map = sliding ? MAPS.robot_slide : MAPS.robot;
      const mw = map[0].length * p, mh = map.length * p;
      const bob = this.jumpT > 0 ? 0 : Math.round(Math.sin(this.time * 9) * 1.2) * 2;
      const dx = Math.round(x - mw / 2);
      const dy2 = Math.round(baseY + jo - mh / 2 + bob);
      // shield ring (flat, no glow)
      if (this.shieldT > 0) {
        ctx.save();
        ctx.strokeStyle = C.blue; ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5 + Math.sin(this.time * 8) * 0.15;
        ctx.strokeRect(dx - 2 * p, dy2 - 2 * p, mw + 4 * p, mh + 4 * p);
        ctx.restore();
      }
      drawMap(ctx, map, dx, dy2, p);
      // autopilot indicator: small badge above
      if (this.autopilotT > 0) {
        ctx.fillStyle = C.bright;
        ctx.fillRect(dx + mw / 2 - p, dy2 - 4 * p, 2 * p, 2 * p);
      }
      if (this.showHitboxes) {
        ctx.strokeStyle = C.gold; ctx.lineWidth = 1;
        ctx.strokeRect(x - size * 0.35, baseY + jo - size * 0.35, size * 0.7, size * 0.7);
      }
    }
    drawParticles() {
      const ctx = this.ctx;
      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        const s = Math.max(2, Math.round(p.size));
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      }
      ctx.globalAlpha = 1;
    }
    drawFloats() {
      const ctx = this.ctx;
      for (const f of this.floats) {
        const a = Math.min(1, f.life / f.maxLife);
        ctx.save();
        ctx.globalAlpha = a;
        const fs = Math.round(17 * this.unit * f.scale);
        ctx.font = `800 ${fs}px Manrope, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = C.outline;
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }
    }
    drawFlowOverlay() {
      if (!this.flowActive() || this.reduceMotion) return;
      const ctx = this.ctx; const { W, H } = this;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = C.bright;
      ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, W - 8, H - 8);
      ctx.restore();
    }
    drawBanner() {
      if (this.bannerT <= 0) return;
      const ctx = this.ctx; const { W, H } = this;
      const a = Math.min(1, this.bannerT / 0.4);
      ctx.save();
      ctx.globalAlpha = a;
      const label = this.zone.name.toUpperCase();
      ctx.font = `700 ${Math.round(15 * this.unit)}px Manrope, sans-serif`;
      const tw = ctx.measureText(label).width;
      const padX = 18 * this.unit, ph = 38 * this.unit;
      const pw2 = tw + padX * 2 + 14 * this.unit;
      const bx = W / 2 - pw2 / 2, by = H * 0.28 - ph / 2;
      ctx.fillStyle = 'rgba(5,17,22,0.88)';
      ctx.beginPath();
      ctx.roundRect(bx, by, pw2, ph, ph / 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,242,238,0.18)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = this.zone.accent;
      ctx.beginPath(); ctx.arc(bx + padX, by + ph / 2, 4 * this.unit, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label, bx + padX + 10 * this.unit, by + ph / 2 + 1);
      const lap = lapLabel(this.zoneCounter);
      if (lap) {
        ctx.textAlign = 'center';
        ctx.font = `700 ${Math.round(11 * this.unit)}px Manrope, sans-serif`;
        ctx.fillStyle = C.danger;
        ctx.fillText(lap, W / 2, by + ph + 16 * this.unit);
      }
      ctx.restore();
    }
    renderStatic() {
      this.zone = getZone(this.startZone || 0);
      this.playerX = this.laneX(1);
      this.targetX = this.playerX;
      this.render();
    }
  }

  window.Rush = { Engine, spriteURL, drawMap, MAPS, C, ZONES };
})();
