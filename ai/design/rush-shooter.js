/* AI PDLC RUSH v2.5 — vertical scroll shooter. Pixel sprites + dynamic light/shadow.
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
    orange: '#E89B5A',
  };
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  const CAP_STEPS = [8000, 32000, 128000, 400000, 1000000];
  const capLabel = (i) => ['8K', '32K', '128K', '400K', '1M'][Math.min(i, 4)];

  // у каждого этапа: свой враг, своя траектория, своё оружие
  const STAGES = [
    { name: 'Идея', enemy: 'olddev', enemyName: 'Разрабы-староверы', legend: 'Маршируют зигзагом и бьют очередями ревью-правок', boss: 'ДРЕЙФ ЦЕЛИ', bossLegend: 'Уводит задачу в сторону очередями. Не дай уйти от цели', accent: '#E3C24E', tint: '#122430' },
    { name: 'Дизайн', enemy: 'slop', enemyName: 'AI Slop', legend: 'Пикируют на тебя и кидают жирные блобы. Убьёшь — разделится', boss: 'ПОДХАЛИМАЖ', bossLegend: 'Заваливает «отличными» блобами. Не верь — бей', accent: '#B98BF0', tint: '#171F31' },
    { name: 'Код', enemy: 'legacy', enemyName: 'Legacy-код', legend: 'Монолиты льют непрерывный поток техдолга вниз', boss: 'ТУННЕЛЬНОЕ МЫШЛЕНИЕ', bossLegend: 'Прёт напролом и заливает всё сплошным огнём', accent: '#3BD269', tint: '#0C2822' },
    { name: 'Тест', enemy: 'hallu', enemyName: 'Галлюцинации', legend: 'Телепортируются и пускают наводящиеся фантомы', boss: 'ОТРАВЛЕНИЕ КОНТЕКСТА', bossLegend: 'Его фантомы сами найдут тебя. Сбивай их и бей', accent: '#E89B5A', tint: '#241E18' },
    { name: 'Релиз', enemy: 'loop', enemyName: 'Зацикливание', legend: 'Кружат по спирали, огонь вращается вокруг них', boss: 'АТРОФИЯ ИНСТРУКЦИЙ', bossLegend: 'Двойная спираль огня. Двигайся по кругу', accent: '#5AB8E8', tint: '#0E2430' },
    { name: 'Поддержка', enemy: 'rot', enemyName: 'Гниение контекста', legend: 'Сбрасывают бомбы с таймером. Сбивай их или беги', boss: 'КАСКАДНЫЙ СБОЙ', bossLegend: 'Бомбы + веер. Одна ошибка заражает всё. Финал', accent: '#E87BA8', tint: '#231A24' },
  ];
  const HARNESS = ['GATE', 'JUDGE', 'MEMORY', 'HOOKS', 'RALPH LOOP'];

  const PAL = { o: C.outline, w: C.white, s: C.steel, g: C.bright, d: C.greenDark, k: '#0A1F28', r: C.danger, q: C.dangerDark, y: C.gold, h: C.goldDark, b: C.blue, c: C.cyan, v: C.violet, p: C.pink, n: C.brown, m: C.brownDark, t: C.slate, i: C.ink, e: C.orange };

  const MAPS = {
    // игрок ур.1 — базовый дрон
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
    // ур.2 — боковые пушки
    ship2: [
      '......gg......',
      '......oo......',
      'g..oooooooo..g',
      'o.owwwwwwwwo.o',
      'o.owkkkkkkwo.o',
      'o.owkkkkkkwo.o',
      'o.owkkkkkkwo.o',
      'o.owwwwwwwwo.o',
      'boowwwwwwwwoob',
      '.obwwwwwwwwbo.',
      '..owwggggwwo..',
      '...oooooooo...',
      '...oo....oo...',
    ],
    // ур.3 — меха: плечи, антенны, золотой визор
    ship3: [
      '.y............y.',
      '.o.....gg.....o.',
      '.o.....oo.....o.',
      'oo..oooooooo..oo',
      'oy.owwwwwwwwo.yo',
      'oy.owkkkkkkwo.yo',
      'oy.owkkkkkkwo.yo',
      'oo.owkkkkkkwo.oo',
      '.o.owwwwwwwwo.o.',
      '.boowwwwwwwwoob.',
      '.oobwwwwwwwwboo.',
      '...owwyyyywwo...',
      '....oooooooo....',
      '...oo..oo..oo...',
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
    olddev2: [
      '...oooo....',
      '..onnnno...',
      '.onwwwwno..',
      '.onwkwkwo..',
      '.onwwwwno..',
      '..osssso...',
      'oosssssso..',
      '..osssso.o.',
      '..otttto...',
      '...oo.oo...',
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
    legacy2: [
      'oooooooooooo',
      'oqqqoyqqoqqo',
      'oooooooooooo',
      'oqoqwqoqqqoo',
      'oqoqqqoqyqoo',
      'oooooooooooo',
      'oyqqoqqoqqqo',
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
    hallu2: [
      '....vvvv...',
      '...vvvvvv..',
      '..vvwvvwvv.',
      '..vvvvvvvv.',
      '..vvvvvvvv.',
      '..vv.vv.vv.',
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
    rot2: [
      '..dd..g....',
      '.dnnddng...',
      'dnnnnnnnd..',
      'dnwnnnwnd..',
      '.dnnnnnd...',
      '..dnnd.....',
      '.g..dd..g..',
    ],
    bomb: [
      '....yy.',
      '...yo..',
      '..ooo..',
      '.oqqqo.',
      'oqrrqqo',
      'oqrwrqo',
      'oqrrrqo',
      '.oqqqo.',
      '..ooo..',
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
  // силуэт одним цветом — для теней
  function drawSil(ctx, map, x, y, p, color) {
    ctx.fillStyle = color;
    for (let r = 0; r < map.length; r++) {
      const row = map[r];
      for (let c2 = 0; c2 < row.length; c2++) {
        if (row[c2] === '.') continue;
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
    eShot() { this.beep(340, 0.05, 'square', 0.014, -120); }
    kill() { this.beep(300, 0.12, 'sawtooth', 0.04, -140); }
    boom() { this.beep(90, 0.3, 'sawtooth', 0.07, -50); }
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

  // hp/скорость/очки + цвет осколков смерти
  const ENEMY_DEF = {
    olddev: { hp: 1, r: 0.55, vy: 72, score: 40, chunk: C.brown },
    slop: { hp: 1, r: 0.55, vy: 62, score: 50, chunk: C.pink },
    legacy: { hp: 3, r: 0.62, vy: 54, score: 90, chunk: C.dangerDark },
    hallu: { hp: 1, r: 0.55, vy: 72, score: 70, chunk: C.violet },
    loop: { hp: 2, r: 0.55, vy: 56, score: 80, chunk: C.cyan },
    rot: { hp: 2, r: 0.58, vy: 50, score: 90, chunk: C.brown },
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
      this.phase = 'intro';
      this.phaseT = 0; this.waveT = 0; this.spawnAcc = 0; this.dropQueue = [];
      this.px2 = 0; this.py2 = 0; this.tx = 0; this.ty = 0;
      this.capLevel = 0; this.tokens = CAP_STEPS[0];
      this.agentLvl = 1; this.skillLvl = 0; this.subs = 0;
      this.harness = []; this.darkFactory = false;
      this.compressT = 0; this.invincT = 0; this.fireAcc = 0; this.subFireAcc = 0;
      this.emo = 'ok'; this.emoT = 0; this.muzzleT = 0; this.evolveT = 0;
      this.score = 0; this.kills = 0; this.barrels = 0;
      this.combo = 0; this.comboT = 0;
      this.enemies = []; this.bullets = []; this.orbs = []; this.pickups = []; this.particles = []; this.floats = []; this.lights = [];
      this.boss = null;
      this.shake = 0; this.statsAcc = 0; this.lowTokT = 0;
      this.intro = null; this.distance = 0; this.spawnN = 0;
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
    pu() { return Math.max(2, Math.round(4 * this.unit)); }

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
      // апгрейды растянуты: корпус — на чётных этапах, скилл — на нечётных
      this.dropQueue = [
        { t: 3, kind: 'barrel' },
        { t: 4, kind: idx % 2 === 0 ? 'doc_agent' : 'doc_skill' },
        { t: 7, kind: 'barrel' },
        { t: 11, kind: 'barrel' },
        { t: 14, kind: idx % 2 === 0 ? 'doc_skill' : 'doc_agent' },
        { t: 16, kind: 'barrel' },
        { t: 20, kind: this.rng() < 0.5 ? 'perk_zip' : 'perk_win' },
        { t: 22, kind: 'barrel' },
      ];
      if (idx === 1 || idx === 3 || lap > 0) this.dropQueue.push({ t: 12, kind: 'mini' });
      if (idx >= 2) this.dropQueue.push({ t: 9, kind: 'barrel' });
      if (idx >= 4) this.dropQueue.push({ t: 18, kind: 'barrel' });
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
    hell() { return Math.min(1, Math.max(0, (this.stageIdx - 2) / 3) + this.lap * 0.3); }
    cap() { return CAP_STEPS[this.capLevel]; }

    update(dt) {
      this.time += dt;
      this.distance += 120 * this.unit * dt;
      this.invincT = Math.max(0, this.invincT - dt);
      this.compressT = Math.max(0, this.compressT - dt);
      this.muzzleT = Math.max(0, this.muzzleT - dt);
      this.evolveT = Math.max(0, this.evolveT - dt);
      if (this.emoT > 0) { this.emoT -= dt; if (this.emoT <= 0) this.emo = 'ok'; }
      if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

      const lerp = 1 - Math.pow(0.0004, dt);
      this.px2 += (this.tx - this.px2) * lerp;
      this.py2 += (this.ty - this.py2) * lerp;

      const hell = this.hell();
      let burn = 185 * (1 + this.stageIdx * 0.12 + hell * 0.65 + this.lap * 0.45) * Math.pow(0.85, this.skillLvl);
      if (this.compressT > 0) burn *= 0.55;
      let aura = false;
      if (this.stage.enemy === 'rot' || this.enemies.some((e) => e.kind === 'rot')) {
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

      const fireRate = 3.2 + this.agentLvl * 1.5 + this.skillLvl * 1.15; // апгрейды резко поднимают темп
      this.fireAcc += dt;
      const shotCost = 14 * Math.pow(0.88, this.skillLvl);
      if (this.fireAcc >= 1 / fireRate) {
        this.fireAcc = 0;
        this.fire(this.px2, this.py2 - 26 * this.unit, this.agentLvl);
        this.tokens = Math.max(1, this.tokens - shotCost);
      }
      if (this.subs > 0 || this.darkFactory) {
        // сабы наследуют мощь игрока: темп от SKILL, урон от AGENT
        const subRate = 1.5 + this.skillLvl * 0.65 + this.agentLvl * 0.35;
        this.subFireAcc += dt;
        if (this.subFireAcc >= 1 / subRate) {
          this.subFireAcc = 0;
          const offs = [];
          if (this.subs >= 1) offs.push(-38); if (this.subs >= 2) offs.push(38);
          if (this.darkFactory) { offs.push(-64); offs.push(64); }
          const subDmg = this.agentLvl;
          const subSpd = -(420 + this.agentLvl * 50 + this.skillLvl * 40) * this.unit;
          for (const o of offs) {
            this.bullets.push({ x: this.px2 + o * this.unit, y: this.py2 - 8 * this.unit, vy: subSpd, dmg: subDmg, sub: true });
            if (this.agentLvl >= 3) {
              this.bullets.push({
                x: this.px2 + o * this.unit, y: this.py2 - 4 * this.unit,
                vy: subSpd * 0.92, dmg: Math.max(1, subDmg - 1),
                vx: (o < 0 ? -45 : 45) * this.unit, sub: true,
              });
            }
          }
          this.audio.shot();
        }
      }

      this.phaseT = Math.max(0, this.phaseT - dt);
      if (this.phase === 'intro' && this.phaseT <= 0) { this.phase = 'wave'; this.waveT = 0; this.intro = null; }
      else if (this.phase === 'wave') {
        this.waveT += dt;
        this.spawnAcc += dt;
        const interval = Math.max(0.2, 0.95 - this.diff() * 0.55 - this.stageIdx * 0.11 - hell * 0.2);
        if (this.spawnAcc >= interval) {
          this.spawnAcc -= interval;
          this.spawnEnemy();
          if (hell > 0.55 && this.rng() < 0.35 + hell * 0.25) this.spawnEnemy();
        }
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
      const v = -(540 + this.skillLvl * 40) * this.unit;
      const bonus = this.skillLvl >= 3 ? 1 : 0;
      const sk = this.skillLvl;
      if (lvl <= 1) this.bullets.push({ x, y, vy: v, dmg: 1 + bonus, sk });
      else if (lvl === 2) {
        this.bullets.push({ x: x - 9 * this.unit, y, vy: v, dmg: 1 + bonus, sk });
        this.bullets.push({ x: x + 9 * this.unit, y, vy: v, dmg: 1 + bonus, sk });
      } else {
        this.bullets.push({ x: x - 12 * this.unit, y: y + 6 * this.unit, vy: v, dmg: 1 + bonus, vx: -70 * this.unit, sk });
        this.bullets.push({ x, y: y - 4 * this.unit, vy: v * 1.05, dmg: 2 + bonus, plasma: true, sk });
        this.bullets.push({ x: x + 12 * this.unit, y: y + 6 * this.unit, vy: v, dmg: 1 + bonus, vx: 70 * this.unit, sk });
        if (this.skillLvl >= 2) {
          this.bullets.push({ x: x - 18 * this.unit, y: y + 10 * this.unit, vy: v * 0.9, dmg: 1, vx: -110 * this.unit, sk });
          this.bullets.push({ x: x + 18 * this.unit, y: y + 10 * this.unit, vy: v * 0.9, dmg: 1, vx: 110 * this.unit, sk });
        }
      }
      this.muzzleT = 0.06;
      this.audio.shot();
    }

    spawnEnemy() {
      let kind = this.stage.enemy;
      const mixChance = 0.12 + this.stageIdx * 0.07 + this.hell() * 0.18;
      if (this.stageIdx > 0 && this.rng() < mixChance) {
        const pool = STAGES.slice(0, this.stageIdx).map((s) => s.enemy);
        kind = pool[Math.floor(this.rng() * pool.length)];
      }
      const def = ENEMY_DEF[kind];
      this.spawnN++;
      const x = 30 + ((this.spawnN % 5) / 5 + this.rng() * 0.18) * (this.W - 60);
      const hp = def.hp + Math.floor((this.stageIdx + 1) / 2) + (this.hell() > 0.7 ? 1 : 0);
      const e = {
        kind, x, y: -40 * this.unit, hp, maxHp: hp,
        vy: def.vy * this.unit * (0.9 + this.rng() * 0.3) * (1 + this.stageIdx * 0.14 + this.diff() * 0.45 + this.hell() * 0.35),
        phase: this.rng() * Math.PI * 2, baseX: x, flash: 0, small: false, age: 0,
        shootAcc: this.rng() * 1.2, muzzle: 0,
      };
      if (kind === 'olddev') { e.dir = this.rng() < 0.5 ? -1 : 1; e.turnT = 0.7 + this.rng() * 0.8; }
      if (kind === 'legacy') { e.dir = this.rng() < 0.5 ? -1 : 1; e.winT = this.rng() * 3; e.gunSide = 1; }
      if (kind === 'hallu') e.tpT = 0.45 + this.rng() * 0.7;
      if (kind === 'loop') { e.cy = e.y; e.rad = (30 + this.rng() * 22) * this.unit; }
      this.enemies.push(e);
    }
    spawnPickup(kind, x, y) {
      this.pickups.push({ kind, x: x != null ? x : 30 + this.rng() * (this.W - 60), y: y != null ? y : -30 * this.unit, vy: 95 * this.unit });
    }
    startBoss() {
      this.phase = 'boss';
      this.enemies = this.enemies.filter((e) => e.y < this.H * 0.5);
      const hp = 40 + this.stageIdx * 20 + (this.stageIdx === 5 ? 40 : 0) + Math.round(this.hell() * 18);
      this.boss = { x: this.W / 2, y: -80 * this.unit, ty: this.H * 0.2, hp, maxHp: hp, phase: 0, shootAcc: 0, minionAcc: 0, flash: 0, bq: null, alt: false, muzzle: 0 };
      this.intro = { kind: 'boss', title: this.stage.boss, sub: 'БОСС ЭТАПА · БОЛЕЗНЬ АГЕНТА', legend: this.stage.bossLegend, sprite: this.stage.enemy };
      this.phaseT = 2.2;
      this.audio.bossIn();
      this.emitStats();
    }

    // --- вражеские снаряды ---
    spawnOrb(x, y, vx, vy, type, extra) {
      if (this.orbs.length > 80) return;
      const o = { x, y, vx, vy, type: type || 'orb' };
      if (extra) Object.assign(o, extra);
      this.orbs.push(o);
    }
    aimAng(x, y) { return Math.atan2(this.py2 - y, this.px2 - x); }

    enemyShoot(e, dt) {
      if (e.y < 26 * this.unit || e.y > this.H * 0.74) return;
      const u = this.unit;
      const hell = this.hell();
      const m = Math.max(0.32, 1 - this.stageIdx * 0.09 - this.lap * 0.2 - hell * 0.22);
      const speedUp = 1 + this.stageIdx * 0.1 + this.diff() * 0.18 + hell * 0.25;
      if (e.kind === 'olddev') {
        if (e.burst > 0) {
          e.burstT -= dt;
          if (e.burstT <= 0) {
            e.burstT = 0.12; e.burst--;
            const a = this.aimAng(e.x, e.y);
            this.spawnOrb(e.x, e.y + 14 * u, Math.cos(a) * 220 * u * speedUp, Math.sin(a) * 220 * u * speedUp);
            e.muzzle = 0.08; this.audio.eShot();
          }
        } else {
          e.shootAcc += dt;
          if (e.shootAcc > 2.35 * m) { e.shootAcc = 0; e.burst = hell > 0.6 ? 4 : 3; e.burstT = 0; }
        }
      } else if (e.kind === 'slop') {
        e.shootAcc += dt;
        if (e.shootAcc > 2.7 * m) {
          e.shootAcc = 0;
          const a = this.aimAng(e.x, e.y) + (this.rng() - 0.5) * 0.22;
          this.spawnOrb(e.x, e.y + 12 * u, Math.cos(a) * 125 * u * speedUp, Math.sin(a) * 125 * u * speedUp, 'big', { hp: 2 });
          e.muzzle = 0.1; this.audio.eShot();
        }
      } else if (e.kind === 'legacy') {
        e.winT += dt;
        if (e.winT % Math.max(2.2, 3 - hell) < 1.2 + hell * 0.35) {
          e.shootAcc += dt;
          if (e.shootAcc > 0.15) {
            e.shootAcc = 0; e.gunSide = -e.gunSide;
            const a = Math.max(Math.PI * 0.28, Math.min(Math.PI * 0.72, this.aimAng(e.x, e.y)));
            this.spawnOrb(e.x + e.gunSide * 14 * u, e.y + 16 * u, Math.cos(a) * 215 * u * speedUp, Math.sin(a) * 215 * u * speedUp);
            e.muzzle = 0.06; this.audio.eShot();
          }
        }
      } else if (e.kind === 'hallu') {
        e.shootAcc += dt;
        if (e.shootAcc > 1.85 * m && Math.floor(e.phase * 2) % 2 === 0) {
          e.shootAcc = 0;
          const a = this.aimAng(e.x, e.y);
          this.spawnOrb(e.x, e.y + 10 * u, Math.cos(a) * 155 * u * speedUp, Math.sin(a) * 155 * u * speedUp, 'homing', { life: 3.8, turn: 2.4 + hell * 1.4 });
          e.muzzle = 0.1; this.audio.eShot();
        }
      } else if (e.kind === 'loop') {
        e.shootAcc += dt;
        if (e.shootAcc > 0.48 * m) {
          e.shootAcc = 0;
          e.spN = (e.spN || 0) + 1;
          if (e.spN % 3 === 0) {
            const a = this.aimAng(e.x, e.y);
            this.spawnOrb(e.x, e.y, Math.cos(a) * 170 * u * speedUp, Math.sin(a) * 170 * u * speedUp);
          } else {
            const a = e.phase * 1.6;
            this.spawnOrb(e.x + Math.cos(a) * 18 * u, e.y + Math.sin(a) * 18 * u, Math.cos(a) * 145 * u, Math.sin(a) * 145 * u);
          }
          e.muzzle = 0.06;
        }
      } else if (e.kind === 'rot') {
        e.shootAcc += dt;
        if (e.shootAcc > 2.7 * m) {
          e.shootAcc = 0;
          const vx = Math.max(-110, Math.min(110, (this.px2 - e.x) * 0.55)) * u;
          this.spawnOrb(e.x, e.y + 14 * u, vx, 135 * u, 'bomb', { timer: 1.45 - hell * 0.25, hp: 1 });
          e.muzzle = 0.1; this.audio.eShot();
          if (hell > 0.5 && this.rng() < 0.45) {
            const a = this.aimAng(e.x, e.y);
            this.spawnOrb(e.x, e.y + 10 * u, Math.cos(a) * 160 * u * speedUp, Math.sin(a) * 160 * u * speedUp);
          }
        }
      }
    }

    explodeBomb(o) {
      const u = this.unit;
      this.burst(o.x, o.y, C.orange, 18);
      this.addLight(o.x, o.y, 120 * u, C.orange, 0.35, 0.6);
      this.shake = Math.max(this.shake, 5 * u);
      this.audio.boom();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.39;
        this.spawnOrb(o.x, o.y, Math.cos(a) * 150 * u, Math.sin(a) * 150 * u, 'frag');
      }
      if (this.invincT <= 0 && Math.hypot(o.x - this.px2, o.y - this.py2) < 80 * u) this.hurt();
    }

    updateEntities(dt) {
      const u = this.unit;
      const hell = this.hell();
      for (const b of this.bullets) { b.y += b.vy * dt; if (b.vx) b.x += b.vx * dt; }
      this.bullets = this.bullets.filter((b) => b.y > -30);

      // снаряды врагов
      for (const o of this.orbs) {
        if (o.type === 'homing') {
          o.life -= dt;
          if (o.life <= 0) { o.dead = true; continue; }
          const want = this.aimAng(o.x, o.y);
          let cur = Math.atan2(o.vy, o.vx);
          let d = want - cur;
          while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          const turn = (o.life > 1 ? o.turn : 0) * dt; // в конце перестаёт наводиться — можно увернуться
          cur += Math.max(-turn, Math.min(turn, d));
          const sp = Math.hypot(o.vx, o.vy);
          o.vx = Math.cos(cur) * sp; o.vy = Math.sin(cur) * sp;
        } else if (o.type === 'bomb') {
          o.vy += (28 * u - o.vy) * Math.min(1, 3 * dt); // тормозит и висит
          o.vx *= Math.pow(0.1, dt);
          o.timer -= dt;
          if (o.timer <= 0) { o.dead = true; this.explodeBomb(o); continue; }
        }
        o.x += o.vx * dt; o.y += o.vy * dt;
      }
      this.orbs = this.orbs.filter((o) => !o.dead && o.y < this.H + 30 && o.y > -60 && o.x > -30 && o.x < this.W + 30);

      // враги: уникальная траектория на каждом этапе
      for (const e of this.enemies) {
        e.flash = Math.max(0, e.flash - dt);
        e.muzzle = Math.max(0, e.muzzle - dt);
        e.phase += dt * 3;
        e.age += dt;
        const seek = 0.85 + hell * 0.7;
        if (e.kind === 'olddev') {
          e.y += e.vy * dt;
          e.x += e.dir * (52 + hell * 18) * u * dt;
          e.turnT -= dt;
          if (e.x < 26 || e.x > this.W - 26 || e.turnT <= 0) {
            e.dir = this.rng() < 0.75 + hell * 0.15 ? (this.px2 > e.x ? 1 : -1) : -e.dir;
            e.turnT = Math.max(0.45, 0.85 - hell * 0.25) + this.rng() * 0.7;
          }
        } else if (e.kind === 'slop') {
          e.y += e.vy * dt * (e.y > this.H * 0.38 ? 1.55 + hell * 0.35 : 1);
          if (e.y > this.H * 0.38 && !e.small) e.baseX += (this.px2 - e.baseX) * Math.min(1, 1.05 * seek * dt);
          e.x = e.baseX + Math.sin(e.phase) * 26 * u;
        } else if (e.kind === 'legacy') {
          e.y += e.vy * dt;
          e.x += e.dir * (46 + hell * 16) * u * dt;
          if (e.x < 30 || e.x > this.W - 30) e.dir = this.px2 > e.x ? 1 : -1;
        } else if (e.kind === 'hallu') {
          e.y += e.vy * dt;
          e.tpT -= dt;
          if (e.tpT <= 0) {
            e.tpT = Math.max(0.45, 0.75 - hell * 0.25) + this.rng() * 0.7;
            const toPlayer = (this.px2 - e.baseX) * (0.42 + hell * 0.25);
            e.baseX = Math.max(30, Math.min(this.W - 30, e.baseX + toPlayer + (this.rng() - 0.5) * 200 * u));
            this.burst(e.x, e.y, C.violet, 6);
          }
          e.x += (e.baseX - e.x) * Math.min(1, 11 * dt);
        } else if (e.kind === 'loop') {
          e.cy += e.vy * dt;
          e.baseX += (this.px2 - e.baseX) * Math.min(1, 0.55 * seek * dt);
          e.x = e.baseX + Math.cos(e.phase * 1.1) * e.rad;
          e.y = e.cy + Math.sin(e.phase * 1.1) * e.rad * 0.55;
        } else if (e.kind === 'rot') {
          e.y += e.vy * dt;
          e.baseX += (this.px2 - e.baseX) * Math.min(1, 0.7 * seek * dt);
          e.x = e.baseX + Math.sin(e.phase * 0.7) * 34 * u;
          if (this.rng() < dt * 2) this.particles.push({ x: e.x + (this.rng() - 0.5) * 20 * u, y: e.y + 14 * u, vx: 0, vy: 40 * u, life: 0.5, maxLife: 0.5, color: C.greenDark, size: 2 * u });
        } else {
          e.y += e.vy * dt;
        }
        this.enemyShoot(e, dt);
      }
      this.enemies = this.enemies.filter((e) => e.y < this.H + 60 && e.hp > 0);

      for (const p of this.pickups) p.y += p.vy * dt;
      this.pickups = this.pickups.filter((p) => p.y < this.H + 40);

      if (this.boss) this.updateBoss(dt);
    }

    updateBoss(dt) {
      const b = this.boss; const u = this.unit;
      b.flash = Math.max(0, b.flash - dt);
      b.muzzle = Math.max(0, b.muzzle - dt);
      b.phase += dt;
      if (b.y < b.ty) { b.y += 70 * u * dt; return; }
      b.x = this.W / 2 + Math.sin(b.phase * 0.8) * this.W * 0.28;
      if (this.phaseT > 0) return;
      const si = this.stageIdx;
      // очередь-паттерн в работе
      if (b.bq) {
        const q = b.bq;
        q.t -= dt;
        if (q.t <= 0) {
          q.t = q.gap; q.n--;
          b.muzzle = 0.07;
          if (q.kind === 'burst') {
            const a = this.aimAng(b.x, b.y);
            this.spawnOrb(b.x, b.y + 24 * u, Math.cos(a) * 230 * u, Math.sin(a) * 230 * u);
            this.audio.eShot();
          } else if (q.kind === 'rain') {
            const vx = (this.rng() - 0.5) * 160 * u;
            this.spawnOrb(b.x + (this.rng() - 0.5) * 60 * u, b.y + 24 * u, vx, 230 * u);
          } else if (q.kind === 'spiral') {
            b.sa = (b.sa || 0) + 0.42;
            for (let k = 0; k < 2; k++) { // двойная спираль
              const a = b.sa + k * Math.PI;
              this.spawnOrb(b.x + Math.cos(a) * 30 * u, b.y + Math.sin(a) * 30 * u, Math.cos(a) * 150 * u, Math.sin(a) * 150 * u);
            }
          }
          if (q.n <= 0) b.bq = null;
        }
      } else {
        b.shootAcc += dt;
        const cd = Math.max(0.72, 1.7 - si * 0.16 - this.diff() * 0.3);
        if (b.shootAcc > cd) {
          b.shootAcc = 0;
          b.alt = !b.alt;
          if (b.alt) {
            // фирменный паттерн болезни этапа
            if (si === 0) b.bq = { kind: 'burst', n: 5, t: 0, gap: 0.13 };
            else if (si === 1) {
              const a = this.aimAng(b.x, b.y);
              for (let i = -1; i <= 1; i++) this.spawnOrb(b.x, b.y + 20 * u, Math.cos(a + i * 0.38) * 120 * u, Math.sin(a + i * 0.38) * 120 * u, 'big', { hp: 2 });
              b.muzzle = 0.12; this.audio.eShot();
            } else if (si === 2) b.bq = { kind: 'rain', n: 12, t: 0, gap: 0.09 };
            else if (si === 3) {
              const a = this.aimAng(b.x, b.y);
              for (let i = -1; i <= 1; i += 2) this.spawnOrb(b.x + i * 30 * u, b.y + 16 * u, Math.cos(a + i * 0.5) * 150 * u, Math.sin(a + i * 0.5) * 150 * u, 'homing', { life: 3.4, turn: 2 });
              b.muzzle = 0.12; this.audio.eShot();
            } else if (si === 4) b.bq = { kind: 'spiral', n: 22, t: 0, gap: 0.09 };
            else {
              for (let i = -1; i <= 1; i += 2) this.spawnOrb(b.x + i * 26 * u, b.y + 20 * u, i * 60 * u, 150 * u, 'bomb', { timer: 1.5, hp: 1 });
              b.bq = { kind: 'burst', n: 3, t: 0.4, gap: 0.14 };
              b.muzzle = 0.12; this.audio.eShot();
            }
          } else {
            // классический прицельный веер
            const ang = this.aimAng(b.x, b.y);
            const n = si >= 3 ? 2 : 1;
            for (let i = -n; i <= n; i++) {
              const a = ang + i * (n === 2 ? 0.17 : 0.22);
              this.spawnOrb(b.x, b.y + 20 * u, Math.cos(a) * (170 + si * 14) * u, Math.sin(a) * (170 + si * 14) * u);
            }
            b.muzzle = 0.1; this.audio.eShot();
          }
        }
        b.minionAcc += dt;
        if (b.minionAcc > Math.max(2.6, 4.8 - si * 0.4)) { b.minionAcc = 0; this.spawnEnemy(); this.spawnEnemy(); }
      }
    }

    collide() {
      const u = this.unit;
      for (const b of this.bullets) {
        if (b.dead) continue;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (e.kind === 'hallu' && Math.floor(e.phase * 2) % 2 === 1) continue;
          const r = (ENEMY_DEF[e.kind].r * 40 + 8) * u * (e.small ? 0.6 : 1);
          if (Math.abs(b.x - e.x) < r && Math.abs(b.y - e.y) < r) { b.dead = true; this.damageEnemy(e, b.dmg); break; }
        }
        // жирные снаряды и бомбы можно сбивать
        if (!b.dead) {
          for (const o of this.orbs) {
            if (o.dead || (o.type !== 'big' && o.type !== 'bomb')) continue;
            const r = (o.type === 'big' ? 16 : 13) * u;
            if (Math.abs(b.x - o.x) < r && Math.abs(b.y - o.y) < r) {
              b.dead = true; o.hp -= b.dmg;
              if (o.hp <= 0) {
                o.dead = true;
                this.burst(o.x, o.y, o.type === 'big' ? C.pink : C.orange, 8);
                this.addLight(o.x, o.y, 60 * u, o.type === 'big' ? C.pink : C.orange, 0.25, 0.5);
                this.score += 15;
                this.addFloat(o.x, o.y, '+15', C.steel, 0.6, 0.8);
                this.audio.kill();
              }
              break;
            }
          }
        }
        if (!b.dead && this.boss && this.boss.y > 0) {
          const bs = this.boss;
          if (Math.abs(b.x - bs.x) < 52 * u && Math.abs(b.y - bs.y) < 40 * u) { b.dead = true; this.damageBoss(b.dmg); }
        }
      }
      this.bullets = this.bullets.filter((b) => !b.dead);
      if (this.invincT <= 0) {
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          if (Math.hypot(e.x - this.px2, e.y - this.py2) < 34 * u) { e.hp = 0; this.burst(e.x, e.y, C.danger, 14); this.hurt(); break; }
        }
        if (this.invincT <= 0) {
          for (const o of this.orbs) {
            if (o.dead) continue;
            const r = (o.type === 'big' ? 26 : o.type === 'bomb' ? 20 : o.type === 'frag' ? 16 : 20) * u;
            if (Math.hypot(o.x - this.px2, o.y - this.py2) < r) { o.dead = true; if (o.type === 'bomb') this.explodeBomb(o); this.hurt(); break; }
          }
        }
      }
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
        // осколки цвета врага + вспышка света
        this.burst(e.x, e.y, ENEMY_DEF[e.kind].chunk, 8);
        this.burst(e.x, e.y, C.white, 4);
        this.addLight(e.x, e.y, 70 * this.unit, ENEMY_DEF[e.kind].chunk, 0.28, 0.5);
        this.audio.kill();
        if (e.kind === 'slop' && !e.small) {
          for (let i = -1; i <= 1; i += 2) this.enemies.push({ kind: 'slop', x: e.x + i * 16 * this.unit, y: e.y, hp: 1, maxHp: 1, vy: e.vy * 1.25, phase: this.rng() * 6, baseX: e.x + i * 16 * this.unit, flash: 0, small: true, age: 0.3, shootAcc: -2, muzzle: 0 });
        }
        if (this.rng() < 0.18) this.spawnPickup('barrel', e.x, e.y);
      }
    }
    damageBoss(dmg) {
      const b = this.boss;
      b.hp -= dmg; b.flash = 0.08;
      if (b.hp <= 0) {
        this.audio.bossDie();
        this.burst(b.x, b.y, C.gold, 34);
        this.burst(b.x, b.y, C.white, 12);
        this.addLight(b.x, b.y, 220 * this.unit, C.gold, 0.6, 0.7);
        this.shake = 10 * this.unit;
        const sc = 1000 * (this.darkFactory ? 2 : 1);
        this.score += sc;
        this.boss = null;
        this.orbs = [];
        if (this.stageIdx === 5) { this.finish(true); return; }
        this.addFloat(b.x, b.y, `БОСС ПОВЕРЖЕН +${sc}`, C.gold, 1.4, 1.2);
        if (this.harness.length < 5) this.spawnPickup('harness', b.x, b.y);
        this.spawnPickup('barrel', b.x - 30 * this.unit, b.y);
        this.spawnPickup('barrel', b.x + 30 * this.unit, b.y);
        this.spawnPickup('barrel', b.x, b.y + 24 * this.unit);
        if (this.stageIdx % 2 === 1) this.spawnPickup('perk_win', b.x, b.y - 20 * this.unit);
        this.phase = 'clear'; this.phaseT = 2.4;
        const refill = Math.round(this.cap() * 0.28);
        this.tokens = Math.min(this.cap(), this.tokens + refill);
        this.intro = { kind: 'clear', title: 'ЭТАП ПРОЙДЕН', sub: 'RALPH LOOP · СВЕЖИЙ КОНТЕКСТ', legend: `+${fmtInt(refill)} токенов — контекст перезапущен`, sprite: 'ship' };
        this.setEmo('happy', 2);
        this.emitStats();
      }
    }
    hurt() {
      const loss = Math.round(this.cap() * (0.16 + this.hell() * 0.04));
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
        const add = Math.round(this.cap() * 0.14);
        this.tokens = Math.min(this.cap(), this.tokens + add);
        this.barrels++;
        this.addFloat(this.px2, this.py2 - 40 * u, `+${fmtInt(add)} токенов`, C.bright, 0.9, 1);
        this.audio.pickup();
      } else if (kind === 'doc_agent') {
        if (this.agentLvl < 3) {
          this.agentLvl++;
          this.evolveT = 1.2; // вспышка эволюции корпуса
          this.burst(this.px2, this.py2, C.bright, 20);
          this.addLight(this.px2, this.py2, 140 * u, C.bright, 0.5, 0.6);
          this.addFloat(this.px2, this.py2 - 46 * u, this.agentLvl >= 3 ? 'ЭВОЛЮЦИЯ: МЕХА-АГЕНТ' : 'AGENT.MD · корпус ур.' + this.agentLvl, C.bright, 1.3, 1.15);
        } else this.addFloat(this.px2, this.py2 - 46 * u, 'МАКС. КОРПУС', C.bright, 0.9, 1);
        this.audio.upgrade();
      } else if (kind === 'doc_skill') {
        if (this.skillLvl < 3) this.skillLvl++;
        this.burst(this.px2, this.py2, C.blue, 14);
        this.addLight(this.px2, this.py2, 110 * u, C.blue, 0.4, 0.5);
        this.addFloat(this.px2, this.py2 - 46 * u, `SKILL.MD · огонь +${Math.round(this.skillLvl * 35)}% · расход −${100 - Math.round(Math.pow(0.85, this.skillLvl) * 100)}%`, C.blue, 1.3, 1.1);
        this.audio.upgrade();
      } else if (kind === 'mini') {
        if (this.subs < 2) this.subs++;
        this.addFloat(this.px2, this.py2 - 46 * u, `SUBAGENT ×${this.subs} · урон ${this.agentLvl}`, C.bright, 1.2, 1.1);
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
    addLight(x, y, r, color, life, alpha) {
      if (this.lights.length > 24) return;
      this.lights.push({ x, y, r, color, life, maxLife: life, alpha: alpha || 0.5 });
    }
    burst(x, y, color, n) {
      if (this.reduceMotion) n = Math.ceil(n / 3);
      if (this.particles.length > 240) return;
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
      for (const l of this.lights) l.life -= dt;
      this.lights = this.lights.filter((l) => l.life > 0);
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
    glow(x, y, r, color, alpha) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(color, alpha));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.restore();
    }
    shadowOf(map, x, y, p) {
      const u = this.unit;
      this.ctx.save();
      this.ctx.globalAlpha = 0.2;
      drawSil(this.ctx, map, Math.round(x + 6 * u), Math.round(y + 14 * u), p, '#020A0E');
      this.ctx.restore();
    }
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
      this.drawOrbs();
      this.drawBullets();
      this.drawPlayer();
      this.drawParticles();
      this.drawLights();
      this.drawFloats();
      if (this.darkFactory) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = C.gold; ctx.fillRect(2, 0, 2, H); ctx.fillRect(W - 4, 0, 2, H); ctx.restore(); }
      // виньетка — мягкое затемнение краёв
      const vg = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, H * 0.85);
      vg.addColorStop(0, 'rgba(2,8,12,0)');
      vg.addColorStop(1, 'rgba(2,8,12,0.42)');
      ctx.fillStyle = vg; ctx.fillRect(-10, -10, W + 20, H + 20);
      ctx.restore();
    }
    drawBg() {
      const ctx = this.ctx; const { W, H } = this;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, this.stage.tint); g.addColorStop(0.6, C.bg0); g.addColorStop(1, C.bg0);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save();
      // дальний слой: силуэты фабрики (параллакс)
      ctx.globalAlpha = 0.16; ctx.fillStyle = '#0D2530';
      const ts = (this.distance * 0.25) % 220;
      for (let i = -1; i < H / 220 + 1; i++) {
        const yy = Math.round(i * 220 + ts);
        const seed = ((i * 7 + 3) % 5);
        ctx.fillRect(20 + seed * 30, yy, 46, 60);
        ctx.fillRect(W - 90 - seed * 20, yy + 90, 60, 40);
        ctx.fillRect(W * 0.45, yy + 140, 30, 70);
      }
      // звёзды: два слоя параллакса
      ctx.globalAlpha = 0.14; ctx.fillStyle = C.steel;
      const s0 = (this.distance * 0.35) % 64;
      for (let i = -1; i < H / 64 + 1; i++) {
        for (let j = 0; j < 3; j++) {
          const px3 = ((j * 149 + i * 83) % (W - 12)) + 6;
          ctx.fillRect(Math.round(px3), Math.round(i * 64 + s0), 3, 3);
        }
      }
      ctx.globalAlpha = 0.28; ctx.fillStyle = C.steel;
      const scroll = (this.distance * 0.7) % 48;
      for (let i = -1; i < H / 48 + 1; i++) {
        for (let j = 0; j < 4; j++) {
          const px3 = ((j * 113 + i * 59) % (W - 12)) + 6;
          ctx.fillRect(Math.round(px3), Math.round(i * 48 + scroll), 2, 2);
        }
      }
      // линии конвейера
      ctx.globalAlpha = 0.1; ctx.fillStyle = this.stage.accent;
      const s2 = (this.distance * 1.4) % 160;
      for (let y = -160 + s2; y < H; y += 160) ctx.fillRect(0, Math.round(y), W, 2);
      // световой луч, медленно гуляющий по полю
      const bx = W / 2 + Math.sin(this.time * 0.13) * W * 0.4;
      const lg = ctx.createLinearGradient(bx - 90, 0, bx + 90, 0);
      lg.addColorStop(0, hexA(this.stage.accent, 0));
      lg.addColorStop(0.5, hexA(this.stage.accent, 0.05));
      lg.addColorStop(1, hexA(this.stage.accent, 0));
      ctx.globalAlpha = 1; ctx.fillStyle = lg;
      ctx.fillRect(bx - 90, 0, 180, H);
      ctx.restore();
    }
    drawBullets() {
      const ctx = this.ctx; const u = this.unit;
      for (const b of this.bullets) {
        if (b.plasma) {
          // тяжёлая плазма ур.3
          this.glow(b.x, b.y, 18 * u, C.bright, 0.4);
          ctx.fillStyle = C.bright;
          ctx.fillRect(Math.round(b.x - 5), Math.round(b.y - 10), 10, 18);
          ctx.fillStyle = C.white;
          ctx.fillRect(Math.round(b.x - 2), Math.round(b.y - 8), 4, 14);
          ctx.globalAlpha = 0.3; ctx.fillStyle = C.bright;
          ctx.fillRect(Math.round(b.x - 3), Math.round(b.y + 8), 6, 10);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = b.sub ? C.cyan : C.bright;
          const w = b.dmg > 1 ? 6 : 4;
          const len = b.sk >= 2 ? 15 : 12;
          ctx.fillRect(Math.round(b.x - w / 2), Math.round(b.y - 8), w, len);
          // SKILL.MD: белое ядро у прокачанных выстрелов
          if (b.sk > 0 && !b.sub) { ctx.fillStyle = C.white; ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 7), 2, 6); }
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = b.sub ? C.cyan : C.bright;
          ctx.fillRect(Math.round(b.x - 1), Math.round(b.y + 4), 2, 8);
          ctx.globalAlpha = 1;
        }
      }
    }
    drawOrbs() {
      const ctx = this.ctx; const u = this.unit;
      for (const o of this.orbs) {
        if (o.type === 'big') {
          const wob = Math.floor(this.time * 8) % 2;
          this.glow(o.x, o.y, 22 * u, C.pink, 0.3);
          ctx.fillStyle = C.pink;
          ctx.fillRect(Math.round(o.x - 9 - wob), Math.round(o.y - 8), 18 + wob * 2, 16);
          ctx.fillRect(Math.round(o.x - 6), Math.round(o.y - 11), 12, 22);
          ctx.fillStyle = C.white;
          ctx.fillRect(Math.round(o.x - 3), Math.round(o.y - 4), 4, 4);
        } else if (o.type === 'homing') {
          this.glow(o.x, o.y, 16 * u, C.violet, 0.35);
          const s = 6;
          ctx.save();
          ctx.translate(Math.round(o.x), Math.round(o.y));
          ctx.rotate(Math.atan2(o.vy, o.vx) + Math.PI / 4);
          ctx.fillStyle = C.violet; ctx.fillRect(-s, -s, s * 2, s * 2);
          ctx.fillStyle = C.white; ctx.fillRect(-2, -2, 4, 4);
          ctx.restore();
        } else if (o.type === 'bomb') {
          const panic = o.timer < 0.6;
          const blink = Math.floor(this.time * (panic ? 16 : 7)) % 2 === 0;
          if (blink) this.glow(o.x, o.y, (panic ? 34 : 22) * u, C.danger, panic ? 0.5 : 0.3);
          const map = MAPS.bomb;
          const p = Math.max(2, Math.round(this.pu() * 0.8));
          this.shadowOf(map, o.x - map[0].length * p / 2, o.y - map.length * p / 2, p);
          drawMap(ctx, map, Math.round(o.x - map[0].length * p / 2), Math.round(o.y - map.length * p / 2), p);
          if (blink) { ctx.fillStyle = C.white; ctx.fillRect(Math.round(o.x - 3), Math.round(o.y - 1), 6, 6); }
        } else if (o.type === 'frag') {
          ctx.fillStyle = C.orange;
          ctx.fillRect(Math.round(o.x - 3), Math.round(o.y - 3), 6, 6);
        } else {
          ctx.fillStyle = C.danger;
          ctx.fillRect(Math.round(o.x - 5), Math.round(o.y - 5), 10, 10);
          ctx.fillStyle = C.white;
          ctx.fillRect(Math.round(o.x - 2), Math.round(o.y - 2), 4, 4);
          // дешёвое свечение без градиента
          ctx.save();
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12;
          ctx.fillStyle = C.danger;
          ctx.fillRect(Math.round(o.x - 9), Math.round(o.y - 9), 18, 18);
          ctx.restore();
        }
      }
    }
    enemyMap(e) {
      const fr = Math.floor(e.phase * 4) % 2;
      if (e.kind === 'slop') return fr ? MAPS.slop2 : MAPS.slop1;
      if (e.kind === 'loop') return fr ? MAPS.loop2 : MAPS.loop1;
      if (e.kind === 'olddev') return fr ? MAPS.olddev2 : MAPS.olddev;
      if (e.kind === 'legacy') return Math.floor(e.phase * 1.5) % 2 ? MAPS.legacy2 : MAPS.legacy;
      if (e.kind === 'hallu') return fr ? MAPS.hallu2 : MAPS.hallu;
      return fr ? MAPS.rot2 : MAPS.rot;
    }
    drawEnemies() {
      const ctx = this.ctx;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const map = this.enemyMap(e);
        let p = Math.max(2, Math.round(this.pu() * (e.small ? 0.7 : 1.05)));
        if (e.kind === 'legacy') p = Math.max(2, Math.round(this.pu() * 1.15));
        const mw = map[0].length * p, mh = map.length * p;
        const bob = e.kind === 'olddev' ? Math.round(Math.sin(e.phase * 3) * 1.5) * 2 : 0;
        ctx.save();
        const fadeIn = Math.min(1, e.age * 4);
        if (e.kind === 'hallu') {
          const vis = Math.floor(e.phase * 2) % 2 === 0;
          ctx.globalAlpha = (vis ? 1 : 0.22) * fadeIn;
        } else ctx.globalAlpha = fadeIn;
        if (fadeIn >= 1 && !(e.kind === 'hallu' && Math.floor(e.phase * 2) % 2 === 1)) this.shadowOf(map, e.x - mw / 2, e.y - mh / 2 + bob, p);
        drawMap(ctx, map, Math.round(e.x - mw / 2), Math.round(e.y - mh / 2 + bob), p);
        // дульная вспышка
        if (e.muzzle > 0) {
          ctx.fillStyle = C.white;
          let fx = e.x, fy = e.y + mh / 2;
          if (e.kind === 'loop') { const a = e.phase * 1.6; fx = e.x + Math.cos(a) * 18 * this.unit; fy = e.y + Math.sin(a) * 18 * this.unit; }
          ctx.fillRect(Math.round(fx - 3), Math.round(fy - 3), 6, 6);
          this.glow(fx, fy, 20 * this.unit, C.gold, 0.4);
        }
        // вращающийся эмиттер у loop — виден всегда
        if (e.kind === 'loop') {
          const a = e.phase * 1.6;
          ctx.fillStyle = C.white;
          ctx.fillRect(Math.round(e.x + Math.cos(a) * 18 * this.unit - 2), Math.round(e.y + Math.sin(a) * 18 * this.unit - 2), 4, 4);
        }
        if (e.flash > 0) { ctx.globalAlpha = 0.75; ctx.fillStyle = C.white; ctx.fillRect(Math.round(e.x - mw / 2), Math.round(e.y - mh / 2), mw, mh); }
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
      this.glow(b.x, b.y, mh * 0.9, this.stage.accent, 0.16);
      this.shadowOf(map, b.x - mw / 2, b.y - mh / 2, p);
      drawMap(ctx, map, Math.round(b.x - mw / 2), Math.round(b.y - mh / 2), p);
      ctx.fillStyle = C.gold;
      for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(b.x - 12 + i * 10), Math.round(b.y - mh / 2 - 10), 5, 8);
      if (b.muzzle > 0) {
        ctx.fillStyle = C.white;
        ctx.fillRect(Math.round(b.x - 4), Math.round(b.y + mh / 2 - 4), 8, 8);
        this.glow(b.x, b.y + mh / 2, 34 * this.unit, C.gold, 0.45);
      }
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
        const gc = pk.kind === 'harness' || pk.kind === 'perk_win' ? C.gold : pk.kind === 'doc_skill' || pk.kind === 'perk_zip' ? C.blue : C.bright;
        this.glow(pk.x, pk.y + bob, mh * 0.9, gc, 0.16 + Math.sin(this.time * 5) * 0.05);
        this.shadowOf(map, pk.x - mw / 2, pk.y - mh / 2 + bob, p);
        drawMap(ctx, map, Math.round(pk.x - mw / 2), Math.round(pk.y - mh / 2 + bob), p);
      }
    }
    shipMap() { return this.agentLvl >= 3 ? MAPS.ship3 : this.agentLvl === 2 ? MAPS.ship2 : MAPS.ship; }
    faceOff() { return this.agentLvl >= 3 ? { dx: 2, dy: 1 } : this.agentLvl === 2 ? { dx: 1, dy: 0 } : { dx: 0, dy: 0 }; }
    drawPlayer() {
      const ctx = this.ctx;
      if (this.invincT > 0 && Math.floor(this.time * 12) % 2 === 0 && this.state === 'playing') return;
      const p = this.pu();
      const map = this.shipMap();
      const fo = this.faceOff();
      const mw = map[0].length * p, mh = map.length * p;
      const tilt = Math.max(-0.16, Math.min(0.16, (this.tx - this.px2) * 0.004));
      // свет двигателя — ниже корпуса, не затемняет игрока (тени на герое нет)
      this.glow(this.px2, this.py2 + mh * 0.75, 34 * this.unit, C.cyan, 0.14 + (Math.floor(this.time * 14) % 2) * 0.05);
      if (this.agentLvl >= 3) this.glow(this.px2, this.py2, mh * 0.8, C.gold, 0.07); // золотая аура мехи
      ctx.save();
      ctx.translate(Math.round(this.px2), Math.round(this.py2));
      ctx.rotate(tilt);
      // пламя: масштабируется с уровнем корпуса
      const fr = Math.floor(this.time * 14) % 2;
      const flames = this.agentLvl >= 3 ? [-4.5, -0.5, 3.5] : [-2.5, 0.5];
      ctx.fillStyle = C.cyan;
      for (let i = 0; i < flames.length; i++) {
        const fx = flames[i] * p;
        const tall = (i + fr) % 2 ? p * 3 : p * 2;
        ctx.fillRect(fx, mh / 2 - p, p * 2, tall + (this.agentLvl >= 3 ? p : 0));
      }
      ctx.fillStyle = C.white;
      for (let i = 0; i < flames.length; i++) ctx.fillRect(flames[i] * p + p * 0.5, mh / 2 - p, p, p);
      drawMap(ctx, map, -mw / 2, -mh / 2, p);
      // огни на пушках ур.2+ — апгрейд читается сразу
      if (this.agentLvl >= 2) {
        const blinkOn = Math.floor(this.time * 6) % 2 === 0;
        ctx.fillStyle = blinkOn ? C.bright : C.cyan;
        ctx.fillRect(-mw / 2, -mh / 2 + 2 * p, p, p);
        ctx.fillRect(mw / 2 - p, -mh / 2 + 2 * p, p, p);
      }
      this.drawFace(ctx, -mw / 2 + fo.dx * p, -mh / 2 + fo.dy * p, p);
      // вспышка выстрела на носу
      if (this.muzzleT > 0) {
        ctx.fillStyle = C.white;
        ctx.fillRect(-p, -mh / 2 - p * 2, p * 2, p * 2);
        this.glow(0, -mh / 2 - p, 26 * this.unit, C.bright, 0.5);
      }
      // аура эволюции
      if (this.evolveT > 0) {
        ctx.globalAlpha = this.evolveT / 1.2;
        ctx.strokeStyle = C.bright; ctx.lineWidth = 2;
        const rr = (1.2 - this.evolveT) * 80 * this.unit + 10;
        ctx.strokeRect(-rr, -rr, rr * 2, rr * 2);
        ctx.globalAlpha = 1;
      }
      if (this.compressT > 0) {
        ctx.globalAlpha = 0.4 + Math.sin(this.time * 6) * 0.12;
        ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
        ctx.strokeRect(-mw / 2 - 2 * p, -mh / 2 - 2 * p, mw + 4 * p, mh + 4 * p);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      for (let i = 0; i < this.subs; i++) {
        const off = (i === 0 ? -38 : 38) * this.unit;
        const sp = Math.max(2, Math.round(p * 0.7));
        const sm = MAPS.mini;
        const bob = Math.round(Math.sin(this.time * 5 + i * 2) * 1.5) * 2;
        this.shadowOf(sm, this.px2 + off - sm[0].length * sp / 2, this.py2 - sm.length * sp / 2 + bob, sp);
        drawMap(ctx, sm, Math.round(this.px2 + off - sm[0].length * sp / 2), Math.round(this.py2 - sm.length * sp / 2 + bob), sp);
      }
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
    drawLights() {
      for (const l of this.lights) {
        this.glow(l.x, l.y, l.r * (1 + (1 - l.life / l.maxLife) * 0.4), l.color, l.alpha * (l.life / l.maxLife));
      }
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
