/* AI PDLC RUSH v2 — vertical scroll shooter. Locked palette, pixel sprites, no glow.
   window.Rush2 = { Engine, spriteURL, C, STAGES } */
(function () {
  'use strict';

  const C = {
    bg0: '#07171D', outline: '#04121A', ink: '#F2F8F5',
    green: '#21A038', bright: '#3BD269', greenDark: '#15702C',
    blue: '#4C8DEB', cyan: '#25AEE8',
    gold: '#F2C14E', goldDark: '#B0862E',
    danger: '#F4574D', dangerDark: '#8F231C',
    white: '#FFFFFF', steel: '#D9E6E0', slate: '#22343B',
    violet: '#B98BF0', pink: '#E87BA8', brown: '#8A5A3B', brownDark: '#5C3A24',
  };

  const CAP_STEPS = [8000, 32000, 128000, 400000, 1000000];
  const capLabel = (i) => ['8K', '32K', '128K', '400K', '1M'][Math.min(i, 4)];

  const STAGES = [
    { name: 'Идея', enemy: 'olddev', enemyName: 'Разрабы-староверы', legend: 'Не верят в агентов, глушат прогресс ревью-стеной', boss: 'ДРЕЙФ ЦЕЛИ', bossLegend: 'Уводит задачу в сторону. Не дай уйти от цели', accent: '#E3C24E', tint: '#122430' },
    { name: 'Дизайн', enemy: 'slop', enemyName: 'AI Slop', legend: 'Красиво выглядит, не работает. Убьёшь — разделится', boss: 'ПОДХАЛИМАЖ', bossLegend: 'Со всем согласен, всё «отлично». Не верь — бей', accent: '#B98BF0', tint: '#171F31' },
    { name: 'Код', enemy: 'legacy', enemyName: 'Legacy-код', legend: 'Монолит без тестов. Толстый — бей дольше', boss: 'ТУННЕЛЬНОЕ МЫШЛЕНИЕ', bossLegend: 'Видит только свой подшаг и прёт напролом', accent: '#3BD269', tint: '#0C2822' },
    { name: 'Тест', enemy: 'hallu', enemyName: 'Галлюцинации', legend: 'Мерцают: то есть, то нет. Бей, пока видно', boss: 'ОТРАВЛЕНИЕ КОНТЕКСТА', bossLegend: 'Внедряет вредные инструкции через данные', accent: '#E89B5A', tint: '#241E18' },
    { name: 'Релиз', enemy: 'loop', enemyName: 'Зацикливание', legend: 'Кружат по спирали и жгут твои итерации', boss: 'АТРОФИЯ ИНСТРУКЦИЙ', bossLegend: 'Пишет «тесты прошли», не запуская их', accent: '#5AB8E8', tint: '#0E2430' },
    { name: 'Поддержка', enemy: 'rot', enemyName: 'Гниение контекста', legend: 'Рядом с ними токены горят вдвое быстрее', boss: 'КАСКАДНЫЙ СБОЙ', bossLegend: 'Одна ошибка заражает всю цепочку. Финал', accent: '#E87BA8', tint: '#231A24' },
  ];
  const HARNESS = ['GATE', 'JUDGE', 'MEMORY', 'HOOKS', 'RALPH LOOP'];

  const PAL = { o: C.outline, w: C.white, s: C.steel, g: C.bright, d: C.greenDark, k: '#0A1F28', r: C.danger, q: C.dangerDark, y: C.gold, h: C.goldDark, b: C.blue, c: C.cyan, v: C.violet, p: C.pink, n: C.brown, m: C.brownDark, t: C.slate, i: C.ink };

  const MAPS = {
    // игрок: корпус без глаз (лицо рисуется отдельно — эмоции)
    ship: [
      '.....gg.....',
      '.....oo.....',
      '..oooooooo..',
      '.owwwwwwwwo.',
      '.owkkkkkkwo.',
      '.owkkkkkkwo.',
      '.owkkkkkkwo.',
      '.owwwwwwwwo.',
      'oowwwwwwwwoo',
      'obwwwwwwwwbo',
      '.owwggggwwo.',
      '..oooooooo..',
      '..oo....oo..',
    ],
    mini: [
      '..oooo..',
      '.owwwwo.',
      '.owkkwo.',
      '.owkkwo.',
      '.owwwwo.',
      'obwwwwbo',
      '..oooo..',
      '..o..o..',
    ],
    olddev: [
      '...oooo....',
      '..onnnno...',
      '.onwwwwno..',
      '.onwkwkwo..',
      '.onwwwwno..',
      '..osssso...',
      '.osssssso..',
      'o.osssso.o.',
      '..otttto...',
      '..oo..oo...',
    ],
    slop1: [
      '...pp.pp...',
      '..pppppp...',
      '.pppppppp..',
      'ppwpppppwp.',
      'pppppppppp.',
      '.ppppppppp.',
      '..pp.ppp...',
    ],
    slop2: [
      '..pp..pp...',
      '.ppppppp...',
      'pppppppppp.',
      'pwpppppwpp.',
      '.ppppppppp.',
      'pppp.ppppp.',
      '.pp...pp...',
    ],
    legacy: [
      'oooooooooooo',
      'oqqqoqqqoqqo',
      'oooooooooooo',
      'oqoqqqoqqqoo',
      'oqoqwqoqqqoo',
      'oooooooooooo',
      'oqqqoqqoqqqo',
      'oooooooooooo',
    ],
    hallu: [
      '...vvvv....',
      '..vvvvvv...',
      '.vvwvvwvv..',
      '.vvvvvvvv..',
      '.vvvvvvvv..',
      '.vv.vv.vv..',
      '.v...v...v.',
    ],
    loop1: [
      '...cccc....',
      '..cc..cc...',
      '.cc....cc..',
      '.c...c..c..',
      '.cc.cc..c..',
      '..cc...cc..',
      '...ccccc...',
    ],
    loop2: [
      '...ccccc...',
      '..cc...cc..',
      '.c..cc.cc..',
      '.c..c...c..',
      '.cc....cc..',
      '..cc..cc...',
      '....cccc...',
    ],
    rot: [
      '..dd..gg...',
      '.dnnddng...',
      'dnnnnnnnd..',
      'dnwnnnwnd..',
      '.dnnnnnd...',
      '..dnnd.g...',
      '.g..dd.....',
    ],
    barrel: [
      '.oooooooo.',
      'oggggggggo',
      'oyyyyyyyyo',
      'ogggwwgggo',
      'oggwggwggo',
      'oggwggwggo',
      'ogggwwgggo',
      'oyyyyyyyyo',
      'oddddddddo',
      '.oooooooo.',
    ],
    doc_agent: [
      '.ooooooo..',
      '.owwwwwoo.',
      '.owwwwwwo.',
      '.owgggwwo.',
      '.owgwgwwo.',
      '.owgggwwo.',
      '.owgwgwwo.',
      '.owgwgwwo.',
      '.owwwwwwo.',
      '.oooooooo.',
    ],
    doc_skill: [
      '.ooooooo..',
      '.owwwwwoo.',
      '.owwwwwwo.',
      '.owbbbwwo.',
      '.owbwwwwo.',
      '.owbbbwwo.',
      '.owwwbwwo.',
      '.owbbbwwo.',
      '.owwwwwwo.',
      '.oooooooo.',
    ],
    perk_zip: [
      '.oooooooo.',
      'obbbbbbbbo',
      'obwbbbbwbo',
      'obbwbbwbbo',
      'obbbwwbbbo',
      'obbbwwbbbo',
      'obbwbbwbbo',
      'obwbbbbwbo',
      'obbbbbbbbo',
      '.oooooooo.',
    ],
    perk_win: [
      '.oooooooo.',
      'oyyyyyyyyo',
      'oywwyywwyo',
      'oywyyyywyo',
      'oyyyyyyyyo',
      'oyyyyyyyyo',
      'oywyyyywyo',
      'oywwyywwyo',
      'oyyyyyyyyo',
      '.oooooooo.',
    ],
    harness: [
      '.oooooooo.',
      'otttttttto',
      'otyyttyyto',
      'otyttttyto',
      'otttttttto',
      'otttyyttto',
      'otyttttyto',
      'otyyttyyto',
      'otttttttto',
      '.oooooooo.',
    ],
    heart: ['.xx..xx.', 'xxxxxxxx', 'xxxxxxxx', 'xxxxxxxx', '.xxxxxx.', '..xxxx..', '...xx...'],
    bolt: ['...xx.', '..xx..', '.xxxx.', '..xx..', '.xx...', 'xx....'],
    flag: ['xxxxxxx.', 'xwwxxxx.', 'xxxxxxx.', 'x.......', 'x.......', 'x.......', 'x.......', 'x.......'],
  };

  function drawMap(ctx, map, x, y, p, colorX) {
    for (let r = 0; r < map.length; r++) {
      const row = map[r];
      for (let c2 = 0; c2 < row.length; c2++) {
        const ch = row[c2];
        if (ch === '.') continue;
        ctx.fillStyle = ch === 'x' ? (colorX || C.ink) : PAL[ch];
        ctx.fillRect(x + c2 * p, y + r * p, p, p);
      }
    }
  }

  function spriteURL(name, scale) {
    const cv = document.createElement('canvas');
    const p = Math.max(1, Math.round(scale || 3));
    const map = MAPS[name] || MAPS.ship;
    cv.width = map[0].length * p; cv.height = map.length * p;
    const ctx = cv.getContext('2d');
    if (name === 'heart') drawMap(ctx, map, 0, 0, p, C.bright);
    else if (name === 'heart_empty') drawMap(ctx, MAPS.heart, 0, 0, p, '#22343B');
    else if (name === 'bolt') drawMap(ctx, map, 0, 0, p, C.gold);
    else if (name === 'flag') drawMap(ctx, map, 0, 0, p, C.steel);
    else drawMap(ctx, map, 0, 0, p);
    return cv.toDataURL();
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class Audio2 {
    constructor() { this.ctx = null; this.muted = true; this.musicTimer = 0; this.step = 0; }
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
    shot() { this.beep(720, 0.04, 'square', 0.018, -300); }
    kill() { this.beep(300, 0.12, 'sawtooth', 0.04, -140); }
    pickup() { this.beep(520, 0.12, 'square', 0.05, 260); }
    upgrade() { this.beep(660, 0.22, 'square', 0.06, 330); }
    hit() { this.beep(120, 0.28, 'sawtooth', 0.09, -70); }
    bossIn() { this.beep(180, 0.4, 'sawtooth', 0.07, -60); }
    bossDie() { this.beep(90, 0.6, 'sawtooth', 0.09, -50); }
    stage() { this.beep(392, 0.22, 'square', 0.05, 190); }
    lowTok() { this.beep(220, 0.09, 'triangle', 0.05); }
    gameOver() { this.beep(220, 0.5, 'sawtooth', 0.07, -160); }
    countdownTick(go) { this.beep(go ? 880 : 440, go ? 0.25 : 0.1, 'square', 0.06); }
    startMusic() {
      this.stopMusic();
      const notes = [110, 110, 165, 110, 131, 110, 165, 196];
      this.musicTimer = setInterval(() => { if (!this.muted) { this.beep(notes[this.step % 8], 0.1, 'triangle', 0.026); this.step++; } }, 230);
    }
    stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = 0; }
  }

  const ENEMY_DEF = {
    olddev: { hp: 1, r: 0.55, vy: 74, score: 40, w: 11 },
    slop: { hp: 1, r: 0.55, vy: 62, score: 50, w: 11 },
    legacy: { hp: 3, r: 0.62, vy: 46, score: 90, w: 12 },
    hallu: { hp: 1, r: 0.55, vy: 66, score: 70, w: 11 },
    loop: { hp: 2, r: 0.55, vy: 58, score: 80, w: 11 },
    rot: { hp: 2, r: 0.58, vy: 50, score: 90, w: 11 },
  };

  class Engine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.audio = new Audio2();
      this.W = 450; this.H = 800; this.unit = 1; this.dpr = 1;
      this.state = 'ready';
      this.raf = 0; this.lastTime = 0; this.time = 0;
      this.best = 0; this.reduceMotion = false;
      this.onStats = () => {}; this.onGameOver = () => {};
      this.startIdx = 0;
      this.resetVars();
    }
    resetVars() {
      this.rng = mulberry32(1);
      this.stageIdx = 0; this.lap = 0; this.stage = STAGES[0];
      this.phase = 'intro'; // intro | wave | boss | clear
      this.phaseT = 0; this.waveT = 0; this.spawnAcc = 0; this.dropQueue = [];
      this.px2 = 0; this.py2 = 0; this.tx = 0; this.ty = 0;
      this.capLevel = 0; this.tokens = CAP_STEPS[0];
      this.agentLvl = 1; this.skillLvl = 0; this.subs = 0;
      this.harness = []; this.darkFactory = false;
      this.compressT = 0; this.invincT = 0; this.fireAcc = 0; this.subFireAcc = 0;
      this.emo = 'ok'; this.emoT = 0;
      this.score = 0; this.kills = 0; this.barrels = 0;
      this.combo = 0; this.comboT = 0;
      this.enemies = []; this.bullets = []; this.orbs = []; this.pickups = []; this.particles = []; this.floats = [];
      this.boss = null;
      this.shake = 0; this.statsAcc = 0; this.lowTokT = 0;
      this.intro = null; this.distance = 0;
    }
    setBest(b) { this.best = b; }
    setReduceMotion(v) { this.reduceMotion = v; }
    setMuted(m) { this.audio.setMuted(m); }
    setStartStage(i) { this.startIdx = Math.max(0, Math.min(5, i | 0)); }
    resize(cssW, cssH, dpr) {
      this.W = cssW; this.H = cssH; this.dpr = dpr; this.unit = cssH / 800;
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
      if (this.state !== 'playing') { this.px2 = cssW / 2; this.py2 = cssH * 0.8; this.tx = this.px2; this.ty = this.py2; this.renderStatic(); }
    }
    pu() { return Math.max(2, Math.round(4 * this.unit)); } // базовый пиксель

    // --- управление: палец задаёт цель ---
    setTarget(x, y) {
      this.tx = Math.max(20, Math.min(this.W - 20, x));
      this.ty = Math.max(this.H * 0.42, Math.min(this.H - 40, y));
    }
    nudge(dx, dy) { this.setTarget(this.tx + dx, this.ty + dy); }

    start(seed) {
      this.resetVars();
      this.rng = mulberry32(seed >>> 0);
      this.px2 = this.W / 2; this.py2 = this.H * 0.8;
      this.tx = this.px2; this.ty = this.py2;
      this.state = 'playing';
      this.startStage(this.startIdx, 0);
      this.audio.resume(); this.audio.startMusic();
      this.emitStats();
      this.lastTime = 0;
      this.loop(performance.now());
    }
    stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.audio.stopMusic(); }
    pause() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.lastTime = 0; }
    resumeLoop() { if (this.state === 'playing' && !this.raf) this.loop(performance.now()); }

    startStage(idx, lap) {
      this.stageIdx = idx; this.lap = lap;
      this.stage = STAGES[idx];
      this.phase = 'intro'; this.phaseT = 2.6; this.waveT = 0;
      this.intro = { kind: 'stage', title: this.stage.enemyName, sub: this.stage.name.toUpperCase() + (lap > 0 ? ' · ПРОД В ОГНЕ' : ''), legend: this.stage.legend, sprite: this.stage.enemy };
      // гарантированные дропы на волну
      this.dropQueue = [
        { t: 4, kind: 'doc_agent' }, { t: 8, kind: 'barrel' }, { t: 12, kind: 'doc_skill' },
        { t: 16, kind: 'barrel' }, { t: 20, kind: this.rng() < 0.5 ? 'perk_zip' : 'perk_win' },
      ];
      if (idx === 1 || idx === 3 || lap > 0) this.dropQueue.push({ t: 14, kind: 'mini' });
      this.audio.stage();
      this.emitStats();
    }

    loop = (now) => {
      if (!this.lastTime) this.lastTime = now;
      let dt = (now - this.lastTime) / 1000; this.lastTime = now;
      if (dt > 0.05) dt = 0.05;
      if (this.state === 'playing') this.update(dt);
      this.render();
      if (this.state === 'playing') this.raf = requestAnimationFrame(this.loop);
      else this.raf = 0;
    };

    diff() { return Math.min(1, this.stageIdx / 5 + this.time / 240); }
    cap() { return CAP_STEPS[this.capLevel]; }

    update(dt) {
      this.time += dt;
      this.distance += 120 * this.unit * dt;
      this.invincT = Math.max(0, this.invincT - dt);
      this.compressT = Math.max(0, this.compressT - dt);
      if (this.emoT > 0) { this.emoT -= dt; if (this.emoT <= 0) this.emo = 'ok'; }
      if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

      // движение игрока
      const lerp = 1 - Math.pow(0.0004, dt);
      this.px2 += (this.tx - this.px2) * lerp;
      this.py2 += (this.ty - this.py2) * lerp;

      // расход токенов
      let burn = 130 * (1 + this.stageIdx * 0.09 + this.lap * 0.4) * Math.pow(0.85, this.skillLvl);
      if (this.compressT > 0) burn *= 0.55;
      let aura = false;
      if (this.stage.enemy === 'rot') {
        for (const e of this.enemies) {
          if (e.kind === 'rot' && Math.hypot(e.x - this.px2, e.y - this.py2) < 110 * this.unit) { aura = true; break; }
        }
      }
      if (aura) burn *= 2;
      this.tokens -= burn * dt;
      if (this.tokens / this.cap() < 0.2) {
        if (this.emo === 'ok') this.emo = 'worry';
        this.lowTokT -= dt;
        if (this.lowTokT <= 0) { this.lowTokT = 0.9; this.audio.lowTok(); }
      } else if (this.emo === 'worry' && this.emoT <= 0 && !aura) this.emo = 'ok';
      if (aura && this.emo === 'ok') this.emo = 'worry';
      if (this.tokens <= 0) { this.tokens = 0; this.gameOver(); return; }

      // стрельба
      const fireRate = this.agentLvl >= 3 ? 5 : 4;
      this.fireAcc += dt;
      const shotCost = 10 * Math.pow(0.88, this.skillLvl);
      if (this.fireAcc >= 1 / fireRate) {
        this.fireAcc = 0;
        this.fire(this.px2, this.py2 - 26 * this.unit, this.agentLvl);
        this.tokens = Math.max(1, this.tokens - shotCost);
      }
      if (this.subs > 0 || this.darkFactory) {
        this.subFireAcc += dt;
        if (this.subFireAcc >= 0.5) {
          this.subFireAcc = 0;
          const offs = [];
          if (this.subs >= 1) offs.push(-38); if (this.subs >= 2) offs.push(38);
          if (this.darkFactory) { offs.push(-64); offs.push(64); }
          for (const o of offs) this.bullets.push({ x: this.px2 + o * this.unit, y: this.py2 - 8 * this.unit, vy: -460 * this.unit, dmg: 1, sub: true });
          this.audio.shot();
        }
      }

      // фазы этапа
      this.phaseT = Math.max(0, this.phaseT - dt);
      if (this.phase === 'intro' && this.phaseT <= 0) { this.phase = 'wave'; this.waveT = 0; this.intro = null; }
      else if (this.phase === 'wave') {
        this.waveT += dt;
        // спавн врагов
        this.spawnAcc += dt;
        const interval = Math.max(0.35, 1.3 - this.diff() * 0.6 - this.stageIdx * 0.09);
        if (this.spawnAcc >= interval) { this.spawnAcc -= interval; this.spawnEnemy(); }
        // плановые дропы
        for (const d of this.dropQueue) {
          if (!d.done && this.waveT >= d.t) { d.done = true; this.spawnPickup(d.kind); }
        }
        if (this.waveT >= 24) { this.startBoss(); }
      } else if (this.phase === 'clear' && this.phaseT <= 0) {
        this.startStage(this.stageIdx + 1, 0);
      }

      this.updateEntities(dt);
      this.collide();
      this.updateParticles(dt);
      this.shake *= Math.pow(0.001, dt);
      if (this.shake < 0.05) this.shake = 0;

      this.statsAcc += dt;
      if (this.statsAcc >= 0.066) { this.statsAcc = 0; this.emitStats(); }
    }

    fire(x, y, lvl) {
      const v = -560 * this.unit;
      if (lvl <= 1) this.bullets.push({ x, y, vy: v, dmg: 1 });
      else if (lvl === 2) { this.bullets.push({ x: x - 8 * this.unit, y, vy: v, dmg: 1 }); this.bullets.push({ x: x + 8 * this.unit, y, vy: v, dmg: 1 }); }
      else {
        this.bullets.push({ x: x - 10 * this.unit, y, vy: v, dmg: 1, vx: -60 * this.unit });
        this.bullets.push({ x, y, vy: v, dmg: 2 });
        this.bullets.push({ x: x + 10 * this.unit, y, vy: v, dmg: 1, vx: 60 * this.unit });
      }
      this.audio.shot();
    }

    spawnEnemy() {
      const kind = this.stage.enemy;
      const def = ENEMY_DEF[kind];
      const x = 30 + this.rng() * (this.W - 60);
      const hp = def.hp + Math.floor(this.stageIdx / 2); // броня растёт с этапом
      this.enemies.push({
        kind, x, y: -40 * this.unit, hp, maxHp: hp,
        vy: def.vy * this.unit * (0.9 + this.rng() * 0.3) * (1 + this.stageIdx * 0.12 + this.diff() * 0.4),
        phase: this.rng() * Math.PI * 2, baseX: x, flash: 0, small: false,
      });
    }
    spawnPickup(kind, x, y) {
      this.pickups.push({ kind, x: x != null ? x : 30 + this.rng() * (this.W - 60), y: y != null ? y : -30 * this.unit, vy: 95 * this.unit });
    }
    startBoss() {
      this.phase = 'boss';
      this.enemies = this.enemies.filter((e) => e.y < this.H * 0.5); // подчистим хвост
      const hp = 30 + this.stageIdx * 14 + (this.stageIdx === 5 ? 22 : 0);
      this.boss = { x: this.W / 2, y: -80 * this.unit, ty: this.H * 0.2, hp, maxHp: hp, phase: 0, shootAcc: 0, minionAcc: 0, flash: 0 };
      this.intro = { kind: 'boss', title: this.stage.boss, sub: 'БОСС ЭТАПА · БОЛЕЗНЬ АГЕНТА', legend: this.stage.bossLegend, sprite: this.stage.enemy };
      this.phaseT = 2.2;
      this.audio.bossIn();
      this.emitStats();
    }

    updateEntities(dt) {
      // пули
      for (const b of this.bullets) { b.y += b.vy * dt; if (b.vx) b.x += b.vx * dt; }
      this.bullets = this.bullets.filter((b) => b.y > -30);
      // орбы босса
      for (const o of this.orbs) { o.x += o.vx * dt; o.y += o.vy * dt; }
      this.orbs = this.orbs.filter((o) => o.y < this.H + 30 && o.x > -30 && o.x < this.W + 30);
      // враги
      for (const e of this.enemies) {
        e.flash = Math.max(0, e.flash - dt);
        e.phase += dt * 3;
        e.y += e.vy * dt;
        if (e.kind === 'slop') e.x = e.baseX + Math.sin(e.phase) * 26 * this.unit;
        else if (e.kind === 'hallu') e.x = e.baseX + Math.sin(e.phase * 1.6) * 48 * this.unit;
        else if (e.kind === 'loop') e.x = e.baseX + Math.cos(e.phase * 2) * 40 * this.unit;
      }
      this.enemies = this.enemies.filter((e) => e.y < this.H + 60 && e.hp > 0);
      // пикапы
      for (const p of this.pickups) p.y += p.vy * dt;
      this.pickups = this.pickups.filter((p) => p.y < this.H + 40);
      // босс
      if (this.boss) {
        const b = this.boss;
        b.flash = Math.max(0, b.flash - dt);
        b.phase += dt;
        if (b.y < b.ty) b.y += 70 * this.unit * dt;
        else {
          b.x = this.W / 2 + Math.sin(b.phase * 0.8) * this.W * 0.28;
          if (this.phaseT <= 0) {
            b.shootAcc += dt;
            if (b.shootAcc > Math.max(0.75, 1.7 - this.diff() * 0.4 - this.stageIdx * 0.14)) {
              b.shootAcc = 0;
              const ang = Math.atan2(this.py2 - b.y, this.px2 - b.x);
              const n = this.stageIdx >= 3 ? 2 : 1;
              for (let i = -n; i <= n; i++) {
                const a = ang + i * (n === 2 ? 0.17 : 0.22);
                this.orbs.push({ x: b.x, y: b.y + 20 * this.unit, vx: Math.cos(a) * (170 + this.stageIdx * 14) * this.unit, vy: Math.sin(a) * (170 + this.stageIdx * 14) * this.unit });
              }
            }
            b.minionAcc += dt;
            if (b.minionAcc > Math.max(2.4, 4.5 - this.stageIdx * 0.4)) { b.minionAcc = 0; this.spawnEnemy(); this.spawnEnemy(); }
          }
        }
      }
    }

    collide() {
      const u = this.unit;
      // пули → враги/босс
      for (const b of this.bullets) {
        if (b.dead) continue;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (e.kind === 'hallu' && Math.floor(e.phase * 2) % 2 === 1) continue; // невидим — неуязвим
          const r = (ENEMY_DEF[e.kind].r * 40 + 8) * u * (e.small ? 0.6 : 1);
          if (Math.abs(b.x - e.x) < r && Math.abs(b.y - e.y) < r) { b.dead = true; this.damageEnemy(e, b.dmg); break; }
        }
        if (!b.dead && this.boss && this.boss.y > 0) {
          const bs = this.boss;
          if (Math.abs(b.x - bs.x) < 52 * u && Math.abs(b.y - bs.y) < 40 * u) { b.dead = true; this.damageBoss(b.dmg); }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.dead);
      // враги/орбы → игрок
      if (this.invincT <= 0) {
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (Math.hypot(e.x - this.px2, e.y - this.py2) < 34 * u) { e.hp = 0; this.burst(e.x, e.y, C.danger, 14); this.hurt(); break; }
        }
        if (this.invincT <= 0) {
          for (const o of this.orbs) {
            if (Math.hypot(o.x - this.px2, o.y - this.py2) < 26 * u) { o.y = this.H + 99; this.hurt(); break; }
          }
        }
      }
      // пикапы → игрок
      for (const p of this.pickups) {
        if (Math.hypot(p.x - this.px2, p.y - this.py2) < 42 * u) { p.y = this.H + 99; this.takePickup(p.kind); }
      }
    }

    damageEnemy(e, dmg) {
      e.hp -= dmg; e.flash = 0.08;
      if (e.hp <= 0) {
        this.kills++;
        this.combo++; this.comboT = 3;
        const mult = Math.min(5, 1 + Math.floor(this.combo / 5)) * (this.darkFactory ? 2 : 1);
        const sc = ENEMY_DEF[e.kind].score * mult;
        this.score += sc;
        this.addFloat(e.x, e.y, `+${sc}`, C.bright, 0.8, 1);
        this.burst(e.x, e.y, C.danger, 10);
        this.audio.kill();
        if (e.kind === 'slop' && !e.small) {
          for (let i = -1; i <= 1; i += 2) this.enemies.push({ kind: 'slop', x: e.x + i * 16 * this.unit, y: e.y, hp: 1, maxHp: 1, vy: e.vy * 1.25, phase: this.rng() * 6, baseX: e.x + i * 16 * this.unit, flash: 0, small: true });
        }
        if (this.rng() < 0.14) this.spawnPickup('barrel', e.x, e.y);
      }
    }
    damageBoss(dmg) {
      const b = this.boss;
      b.hp -= dmg; b.flash = 0.08;
      if (b.hp <= 0) {
        this.audio.bossDie();
        this.burst(b.x, b.y, C.gold, 34);
        this.shake = 10 * this.unit;
        const sc = 1000 * (this.darkFactory ? 2 : 1);
        this.score += sc;
        this.boss = null;
        this.orbs = [];
        if (this.stageIdx === 5) { this.finish(true); return; } // финал: Каскадный сбой побеждён
        this.addFloat(b.x, b.y, `БОСС ПОВЕРЖЕН +${sc}`, C.gold, 1.4, 1.2);
        // дроп: часть харнеса + бочки
        if (this.harness.length < 5) this.spawnPickup('harness', b.x, b.y);
        this.spawnPickup('barrel', b.x - 30 * this.unit, b.y);
        this.spawnPickup('barrel', b.x + 30 * this.unit, b.y);
        if (this.stageIdx % 2 === 1) this.spawnPickup('perk_win', b.x, b.y - 20 * this.unit);
        this.phase = 'clear'; this.phaseT = 2.4;
        // ralph loop: свежий контекст
        const refill = Math.round(this.cap() * 0.4);
        this.tokens = Math.min(this.cap(), this.tokens + refill);
        this.intro = { kind: 'clear', title: 'ЭТАП ПРОЙДЕН', sub: 'RALPH LOOP · СВЕЖИЙ КОНТЕКСТ', legend: `+${fmtInt(refill)} токенов — контекст перезапущен`, sprite: 'ship' };
        this.setEmo('happy', 2);
        this.emitStats();
      }
    }
    hurt() {
      const loss = Math.round(this.cap() * 0.13);
      this.tokens = Math.max(0, this.tokens - loss);
      this.invincT = 1.2;
      this.combo = 0;
      this.shake = 9 * this.unit;
      this.setEmo('hurt', 1);
      this.audio.hit();
      if (navigator.vibrate) { try { navigator.vibrate(100); } catch (e) { /* ignore */ } }
      this.addFloat(this.px2, this.py2 - 44 * this.unit, `−${fmtInt(loss)} токенов`, C.danger, 1, 1.1);
      if (this.tokens <= 0) this.gameOver();
    }
    setEmo(e, t) { this.emo = e; this.emoT = t; }

    takePickup(kind) {
      const u = this.unit;
      if (kind === 'barrel') {
        const add = Math.round(this.cap() * 0.16);
        this.tokens = Math.min(this.cap(), this.tokens + add);
        this.barrels++;
        this.addFloat(this.px2, this.py2 - 40 * u, `+${fmtInt(add)} токенов`, C.bright, 0.9, 1);
        this.audio.pickup();
      } else if (kind === 'doc_agent') {
        if (this.agentLvl < 3) this.agentLvl++;
        this.addFloat(this.px2, this.py2 - 46 * u, `AGENT.MD · огонь ур.${this.agentLvl}`, C.bright, 1.2, 1.1);
        this.audio.upgrade();
      } else if (kind === 'doc_skill') {
        if (this.skillLvl < 3) this.skillLvl++;
        this.addFloat(this.px2, this.py2 - 46 * u, `SKILL.MD · расход −${100 - Math.round(Math.pow(0.85, this.skillLvl) * 100)}%`, C.blue, 1.2, 1.1);
        this.audio.upgrade();
      } else if (kind === 'mini') {
        if (this.subs < 2) this.subs++;
        this.addFloat(this.px2, this.py2 - 46 * u, `SUBAGENT ×${this.subs}`, C.bright, 1.2, 1.1);
        this.audio.upgrade();
      } else if (kind === 'perk_zip') {
        this.compressT = 18;
        this.addFloat(this.px2, this.py2 - 46 * u, 'СЖАТИЕ КОНТЕКСТА −45%', C.blue, 1.2, 1.1);
        this.audio.upgrade();
      } else if (kind === 'perk_win') {
        if (this.capLevel < 4) {
          this.capLevel++;
          this.tokens = Math.min(this.cap(), this.tokens + this.cap() * 0.35);
          this.addFloat(this.px2, this.py2 - 46 * u, `ОКНО → ${capLabel(this.capLevel)} ТОКЕНОВ`, C.gold, 1.3, 1.2);
        } else {
          this.tokens = this.cap();
          this.addFloat(this.px2, this.py2 - 46 * u, 'ОКНО ПОЛНОЕ · РЕФИЛЛ', C.gold, 1, 1);
        }
        this.audio.upgrade();
      } else if (kind === 'harness') {
        const part = HARNESS[Math.min(this.harness.length, 4)];
        this.harness.push(part);
        this.addFloat(this.px2, this.py2 - 52 * u, `ХАРНЕС: ${part}`, C.gold, 1.5, 1.25);
        this.audio.upgrade();
        if (this.harness.length >= 5 && !this.darkFactory) {
          this.darkFactory = true;
          this.intro = { kind: 'dark', title: 'DARK FACTORY', sub: 'ХАРНЕС СОБРАН · СУДЬИ В ДЕЛЕ', legend: 'Судьи стреляют сами. Все очки ×2', sprite: 'ship' };
          this.phaseT = Math.max(this.phaseT, 2.2);
          this.shake = 6 * this.unit;
        }
      }
      this.setEmo('happy', 0.8);
      this.emitStats();
    }

    addFloat(x, y, text, color, life, scale) { this.floats.push({ x, y, text, color, life, maxLife: life, vy: -46 * this.unit, scale }); }
    burst(x, y, color, n) {
      if (this.reduceMotion) n = Math.ceil(n / 3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (40 + Math.random() * 170) * this.unit;
        this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.25 + Math.random() * 0.35, maxLife: 0.6, color, size: (2 + Math.random() * 2) * this.unit });
      }
    }
    updateParticles(dt) {
      for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const f of this.floats) { f.y += f.vy * dt; f.vy *= 0.92; f.life -= dt; }
      this.floats = this.floats.filter((f) => f.life > 0);
    }
    gameOver() { this.finish(false); }
    finish(won) {
      if (this.state !== 'playing') return;
      this.state = 'gameover';
      if (won) this.audio.upgrade(); else this.audio.gameOver();
      this.audio.stopMusic();
      this.shake = 10 * this.unit;
      const base = Math.floor(this.score);
      const tokenBonus = Math.round((Math.max(0, this.tokens) / this.cap()) * 2000);
      const harnessBonus = this.harness.length * 600;
      const victoryBonus = won ? 5000 : 0;
      const total = base + tokenBonus + harnessBonus + victoryBonus;
      this.score = total;
      this.emitStats();
      this.onGameOver({
        score: total, base, tokenBonus, harnessBonus, victoryBonus, won,
        kills: this.kills, barrels: this.barrels,
        stageName: this.stage.name, harness: this.harness.length, darkFactory: this.darkFactory,
        capLabel: capLabel(this.capLevel), agentLvl: this.agentLvl, subs: this.subs,
      });
    }
    emitStats() {
      this.onStats({
        score: Math.floor(this.score), best: this.best,
        tokens: Math.max(0, Math.floor(this.tokens)), cap: this.cap(), capLabel: capLabel(this.capLevel),
        tokenPct: Math.max(0, Math.min(1, this.tokens / this.cap())),
        stageName: this.stage.name, stageAccent: this.stage.accent,
        lap: this.lap > 0 ? 'ПРОД В ОГНЕ' : '',
        agentLvl: this.agentLvl, skillLvl: this.skillLvl, subs: this.subs,
        harness: this.harness.slice(), darkFactory: this.darkFactory,
        compress: this.compressT > 0, combo: this.combo,
        boss: this.boss ? { name: this.stage.boss, pct: Math.max(0, this.boss.hp / this.boss.maxHp) } : null,
        intro: this.intro && this.phaseT > 0 ? this.intro : null,
        kills: this.kills,
      });
    }

    // ---------- render ----------
    render() {
      const ctx = this.ctx; const { W, H, dpr } = this;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, H);
      let sx = 0, sy = 0;
      if (this.shake > 0 && !this.reduceMotion) { sx = (Math.random() - 0.5) * this.shake; sy = (Math.random() - 0.5) * this.shake; }
      ctx.save();
      ctx.translate(Math.round(sx), Math.round(sy));
      this.drawBg();
      this.drawPickups();
      this.drawEnemies();
      this.drawBoss();
      this.drawBullets();
      this.drawPlayer();
      this.drawParticles();
      this.drawFloats();
      if (this.darkFactory) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = C.gold; ctx.fillRect(2, 0, 2, H); ctx.fillRect(W - 4, 0, 2, H); ctx.restore(); }
      ctx.restore();
    }
    drawBg() {
      const ctx = this.ctx; const { W, H } = this;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, this.stage.tint); g.addColorStop(0.6, C.bg0); g.addColorStop(1, C.bg0);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = 0.22; ctx.fillStyle = C.steel;
      const scroll = (this.distance * 0.6) % 48;
      for (let i = -1; i < H / 48 + 1; i++) {
        for (let j = 0; j < 4; j++) {
          const px3 = ((j * 113 + i * 59) % (W - 12)) + 6;
          ctx.fillRect(Math.round(px3), Math.round(i * 48 + scroll), 2, 2);
        }
      }
      ctx.globalAlpha = 0.1; ctx.fillStyle = this.stage.accent;
      const s2 = (this.distance * 1.4) % 160;
      for (let y = -160 + s2; y < H; y += 160) ctx.fillRect(0, Math.round(y), W, 2);
      ctx.restore();
    }
    drawBullets() {
      const ctx = this.ctx;
      for (const b of this.bullets) {
        ctx.fillStyle = b.sub ? C.cyan : C.bright;
        const w = b.dmg > 1 ? 6 : 4;
        ctx.fillRect(Math.round(b.x - w / 2), Math.round(b.y - 8), w, 12);
      }
      for (const o of this.orbs) {
        ctx.fillStyle = C.danger;
        ctx.fillRect(Math.round(o.x - 5), Math.round(o.y - 5), 10, 10);
        ctx.fillStyle = C.white;
        ctx.fillRect(Math.round(o.x - 2), Math.round(o.y - 2), 4, 4);
      }
    }
    enemyMap(e) {
      const fr = Math.floor(e.phase * 4) % 2;
      if (e.kind === 'slop') return fr ? MAPS.slop2 : MAPS.slop1;
      if (e.kind === 'loop') return fr ? MAPS.loop2 : MAPS.loop1;
      if (e.kind === 'olddev') return MAPS.olddev;
      if (e.kind === 'legacy') return MAPS.legacy;
      if (e.kind === 'hallu') return MAPS.hallu;
      return MAPS.rot;
    }
    drawEnemies() {
      const ctx = this.ctx;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const map = this.enemyMap(e);
        let p = Math.max(2, Math.round(this.pu() * (e.small ? 0.7 : 1.05)));
        if (e.kind === 'legacy') p = Math.max(2, Math.round(this.pu() * 1.15));
        const mw = map[0].length * p, mh = map.length * p;
        ctx.save();
        if (e.kind === 'hallu') {
          const vis = Math.floor(e.phase * 2) % 2 === 0;
          ctx.globalAlpha = vis ? 1 : 0.22;
        }
        // walk-bob для староверов
        const bob = e.kind === 'olddev' ? Math.round(Math.sin(e.phase * 3) * 1.5) * 2 : 0;
        drawMap(ctx, map, Math.round(e.x - mw / 2), Math.round(e.y - mh / 2 + bob), p);
        if (e.flash > 0) { ctx.globalAlpha = 0.75; ctx.fillStyle = C.white; ctx.fillRect(Math.round(e.x - mw / 2), Math.round(e.y - mh / 2), mw, mh); }
        // hp-пипсы у толстых
        if (e.maxHp > 1) {
          ctx.globalAlpha = 1;
          for (let i = 0; i < e.maxHp; i++) {
            ctx.fillStyle = i < e.hp ? C.danger : 'rgba(230,242,238,0.25)';
            ctx.fillRect(Math.round(e.x - mw / 2 + i * 8), Math.round(e.y - mh / 2 - 7), 6, 3);
          }
        }
        ctx.restore();
      }
    }
    drawBoss() {
      if (!this.boss) return;
      const ctx = this.ctx; const b = this.boss;
      const map = this.enemyMap({ kind: this.stage.enemy, phase: b.phase * 2 });
      const p = Math.max(3, Math.round(this.pu() * 2.1));
      const mw = map[0].length * p, mh = map.length * p;
      ctx.save();
      drawMap(ctx, map, Math.round(b.x - mw / 2), Math.round(b.y - mh / 2), p);
      // корона болезни
      ctx.fillStyle = C.gold;
      for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(b.x - 12 + i * 10), Math.round(b.y - mh / 2 - 10), 5, 8);
      if (b.flash > 0) { ctx.globalAlpha = 0.7; ctx.fillStyle = C.white; ctx.fillRect(Math.round(b.x - mw / 2), Math.round(b.y - mh / 2), mw, mh); }
      ctx.restore();
    }
    drawPickups() {
      const ctx = this.ctx;
      for (const pk of this.pickups) {
        const map = MAPS[pk.kind] || MAPS.barrel;
        const p = Math.max(2, Math.round(this.pu() * 0.9));
        const mw = map[0].length * p, mh = map.length * p;
        const bob = Math.round(Math.sin(this.time * 4 + pk.x) * 1.5) * 2;
        drawMap(ctx, map, Math.round(pk.x - mw / 2), Math.round(pk.y - mh / 2 + bob), p);
      }
    }
    drawPlayer() {
      const ctx = this.ctx;
      if (this.invincT > 0 && Math.floor(this.time * 12) % 2 === 0 && this.state === 'playing') return;
      const p = this.pu();
      const map = MAPS.ship;
      const mw = map[0].length * p, mh = map.length * p;
      const tilt = Math.max(-0.16, Math.min(0.16, (this.tx - this.px2) * 0.004));
      ctx.save();
      ctx.translate(Math.round(this.px2), Math.round(this.py2));
      ctx.rotate(tilt);
      // пламя (2 кадра, синее)
      const fr = Math.floor(this.time * 14) % 2;
      ctx.fillStyle = C.cyan;
      ctx.fillRect(-p * 2.5, mh / 2 - p, p * 2, fr ? p * 3 : p * 2);
      ctx.fillRect(p * 0.5, mh / 2 - p, p * 2, fr ? p * 2 : p * 3);
      ctx.fillStyle = C.white;
      ctx.fillRect(-p * 2, mh / 2 - p, p, p);
      ctx.fillRect(p, mh / 2 - p, p, p);
      drawMap(ctx, map, -mw / 2, -mh / 2, p);
      this.drawFace(ctx, -mw / 2, -mh / 2, p);
      // щит сжатия
      if (this.compressT > 0) {
        ctx.globalAlpha = 0.4 + Math.sin(this.time * 6) * 0.12;
        ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
        ctx.strokeRect(-mw / 2 - 2 * p, -mh / 2 - 2 * p, mw + 4 * p, mh + 4 * p);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // сабагенты
      for (let i = 0; i < this.subs; i++) {
        const off = (i === 0 ? -38 : 38) * this.unit;
        const sp = Math.max(2, Math.round(p * 0.7));
        const sm = MAPS.mini;
        const bob = Math.round(Math.sin(this.time * 5 + i * 2) * 1.5) * 2;
        drawMap(ctx, sm, Math.round(this.px2 + off - sm[0].length * sp / 2), Math.round(this.py2 - sm.length * sp / 2 + bob), sp);
      }
      // судьи dark factory
      if (this.darkFactory) {
        for (let i = 0; i < 2; i++) {
          const off = (i === 0 ? -64 : 64) * this.unit;
          const sp = Math.max(2, Math.round(p * 0.6));
          const sm = MAPS.mini;
          ctx.save();
          drawMap(ctx, sm, Math.round(this.px2 + off - sm[0].length * sp / 2), Math.round(this.py2 - 14 * this.unit), sp);
          ctx.fillStyle = C.gold;
          ctx.fillRect(Math.round(this.px2 + off - sp), Math.round(this.py2 - 14 * this.unit - sp * 2), sp * 2, sp);
          ctx.restore();
        }
      }
    }
    drawFace(ctx, dx, dy, p) {
      // экран: строки 4-6, колонки 3-8
      const ex = (c2) => dx + c2 * p, ey = (r) => dy + r * p;
      const glow = C.bright;
      ctx.fillStyle = glow;
      if (this.emo === 'happy') {
        ctx.fillRect(ex(4), ey(4), p, p); ctx.fillRect(ex(7), ey(4), p, p);
        ctx.fillRect(ex(4), ey(6), p, p); ctx.fillRect(ex(7), ey(6), p, p);
        ctx.fillRect(ex(5), ey(6) + p * 0.5, p * 2, p * 0.6);
      } else if (this.emo === 'worry') {
        ctx.fillRect(ex(4), ey(5), p * 1.4, p * 0.7); ctx.fillRect(ex(7), ey(5), p * 1.4, p * 0.7);
        ctx.fillStyle = C.gold;
        ctx.fillRect(ex(5), ey(6) + p * 0.4, p * 2, p * 0.6);
      } else if (this.emo === 'hurt') {
        ctx.fillStyle = C.danger;
        ctx.fillRect(ex(4), ey(4), p, p); ctx.fillRect(ex(5), ey(5), p, p); ctx.fillRect(ex(4), ey(6) - p * 0.4, p, p);
        ctx.fillRect(ex(7), ey(4), p, p); ctx.fillRect(ex(8) - p, ey(5), p, p); ctx.fillRect(ex(7), ey(6) - p * 0.4, p, p);
      } else {
        const blink = Math.floor(this.time * 1.3) % 5 === 0 ? 0.35 : 1;
        ctx.fillRect(ex(4), ey(4) + p * (1 - blink) / 2, p, Math.max(p * 0.3, p * 1.6 * blink));
        ctx.fillRect(ex(7), ey(4) + p * (1 - blink) / 2, p, Math.max(p * 0.3, p * 1.6 * blink));
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
        ctx.save();
        ctx.globalAlpha = Math.min(1, f.life / f.maxLife);
        const fs = Math.round(15 * this.unit * f.scale);
        ctx.font = `800 ${fs}px Manrope, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = C.outline;
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }
    }
    renderStatic() {
      this.render();
    }
  }

  function fmtInt(n) { return Math.round(n).toLocaleString('ru-RU'); }

  window.Rush2 = { Engine, spriteURL, drawMap, MAPS, C, STAGES, HARNESS, capLabel };
})();
