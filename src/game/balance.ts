// Кривая сложности AI PDLC RUSH.
// Мощность игрока и угроза врагов считаются одной шкалой (DPS / threat),
// чтобы апгрейды не улетали вперёд брони врагов.
//
// Контракт прохождения:
// - этап 0 — обучающий: старт лёгкий, к концу волны ≈ норма
// - каждый этап: ровно 1 апгрейд + 1 сабагент (пока есть слот)
// - середина этапа без свежего апгрейда: threat > power («всё плохо»)
// - подбор апгрейда выравнивает; без прошлого апгрейда следующий этап не выжить
// - босс = пик угрозы текущего этапа

export interface PowerState {
  agentLvl: number
  skillLvl: number
  subs: number
  darkFactory?: boolean
}

export interface StageDrop {
  t: number
  kind: string
}

export const WAVE_DURATION = 24
export const MAX_AGENT = 3
export const MAX_SKILL = 3
export const MAX_SUBS = 2

const BASE_POWER: PowerState = { agentLvl: 1, skillLvl: 0, subs: 0 }

/** Шанс бочки с убийства (−5% к прошлому 0.18). */
export const BARREL_KILL_CHANCE = 0.18 * 0.95

/** Доля окна токенов с бочки (−5% к прошлому 0.14). */
export const BARREL_REFILL_PCT = 0.14 * 0.95

/** Рефилл после босса (−5% к прошлому 0.28). */
export const STAGE_CLEAR_REFILL_PCT = 0.28 * 0.95

/** Сколько плановых бочек на этап (этап 0 чуть щедрее — обучение). */
export function barrelCountForStage(stageIdx: number): number {
  if (stageIdx === 0) return 3
  return 2
}

export function fireRate(p: PowerState): number {
  return 3.4 + p.agentLvl * 1.0 + p.skillLvl * 0.85
}

export function shotDamageTotal(p: PowerState): number {
  const bonus = p.skillLvl >= 3 ? 1 : 0
  if (p.agentLvl <= 1) return 1 + bonus
  if (p.agentLvl === 2) return 2 * (1 + bonus)
  // ур.3: spread + плазма; при skill>=2 ещё +2 боковых
  let total = 1 + bonus + (2 + bonus) + (1 + bonus)
  if (p.skillLvl >= 2) total += 2
  return total
}

export function subFireRate(p: PowerState): number {
  if (p.subs <= 0 && !p.darkFactory) return 0
  return 1.4 + p.skillLvl * 0.5 + p.agentLvl * 0.25
}

export function subDamage(p: PowerState): number {
  return Math.max(1, p.agentLvl)
}

/** Суммарный DPS игрока (главный ствол + сабы / dark factory). */
export function playerDps(p: PowerState): number {
  const main = fireRate(p) * shotDamageTotal(p)
  const guns = p.subs + (p.darkFactory ? 2 : 0)
  if (guns <= 0) return main
  const subVolley = subDamage(p) * guns * (p.agentLvl >= 3 ? 1.7 : 1)
  return main + subFireRate(p) * subVolley
}

export function baselineDps(): number {
  return playerDps(BASE_POWER)
}

/** Какой апгрейд выпадает на этапе (с учётом уже взятых). */
export function stageUpgradeKind(stageIdx: number, power: PowerState): string {
  const preferAgent = stageIdx % 2 === 0
  if (preferAgent) {
    if (power.agentLvl < MAX_AGENT) return 'doc_agent'
    if (power.skillLvl < MAX_SKILL) return 'doc_skill'
  } else {
    if (power.skillLvl < MAX_SKILL) return 'doc_skill'
    if (power.agentLvl < MAX_AGENT) return 'doc_agent'
  }
  return stageIdx % 2 === 0 ? 'perk_win' : 'perk_zip'
}

/** Второй критичный дроп: саб, пока есть слот; иначе харнес (не пересекается с апгрейдом). */
export function stageSidekickKind(power: PowerState): string {
  if (power.subs < MAX_SUBS) return 'mini'
  return 'harness'
}

export function applyPickup(power: PowerState, kind: string): PowerState {
  const next = { ...power }
  if (kind === 'doc_agent' && next.agentLvl < MAX_AGENT) next.agentLvl++
  if (kind === 'doc_skill' && next.skillLvl < MAX_SKILL) next.skillLvl++
  if (kind === 'mini' && next.subs < MAX_SUBS) next.subs++
  return next
}

/** Мощность к старту этапа, если игрок собрал все критичные дропы прошлых этапов. */
export function expectedPowerAtStageStart(stageIdx: number): PowerState {
  let p: PowerState = { agentLvl: 1, skillLvl: 0, subs: 0 }
  for (let i = 0; i < stageIdx; i++) {
    p = applyPickup(p, stageUpgradeKind(i, p))
    p = applyPickup(p, stageSidekickKind(p))
  }
  return p
}

/** Мощность без критичных дропов прошлого этапа (пропустил апгрейд и саба). */
export function powerMissingLastUpgrade(stageIdx: number): PowerState {
  if (stageIdx <= 0) return expectedPowerAtStageStart(0)
  let p: PowerState = { agentLvl: 1, skillLvl: 0, subs: 0 }
  for (let i = 0; i < stageIdx - 1; i++) {
    p = applyPickup(p, stageUpgradeKind(i, p))
    p = applyPickup(p, stageSidekickKind(p))
  }
  // прошлый этап полностью пропущен — к новому не готов
  return p
}

/**
 * Множитель HP врагов: растёт с ожидаемым DPS игрока к старту этапа,
 * плюс лёгкий «панцирь» самого этапа, чтобы новая мощь не тащила соло.
 */
export function enemyHpMult(stageIdx: number): number {
  const expected = playerDps(expectedPowerAtStageStart(stageIdx))
  const fromPower = expected / baselineDps()
  // панцирь этапа чуть обгоняет рост DPS — без свежего апгрейда станет тесно
  const stageArmor = 1 + stageIdx * 0.18
  return fromPower * stageArmor
}

export function enemyHp(baseHp: number, stageIdx: number): number {
  return Math.max(1, Math.round(baseHp * enemyHpMult(stageIdx)))
}

/**
 * Давление спавна по ходу волны.
 * Этап 0: от очень низкого к норме.
 * Этапы 1+: старт терпимый, середина — пик («всё плохо»), к боссу чуть отпускает.
 */
export function wavePressure(stageIdx: number, waveProgress: number): number {
  const t = Math.max(0, Math.min(1, waveProgress))
  if (stageIdx === 0) {
    return 0.42 + t * 0.58
  }
  // узкий пик в середине; к 0.7 уже почти норма — апгрейд успевает «вытянуть»
  const peak = Math.exp(-Math.pow((t - 0.5) / 0.16, 2))
  const base = 0.7 + stageIdx * 0.035
  return Math.min(1.75, base + peak * (0.55 + stageIdx * 0.04))
}

/** Интервал спавна врагов (сек). */
export function spawnInterval(stageIdx: number, waveProgress: number): number {
  const pressure = wavePressure(stageIdx, waveProgress)
  const base = stageIdx === 0 ? 1.35 : Math.max(0.52, 1.1 - stageIdx * 0.07)
  return Math.max(0.26, base / pressure)
}

/**
 * Индекс угрозы волны.
 * Якорь — ожидаемая мощь на СТАРТЕ этапа: при pressure=1 ratio≈1 для экипированного игрока.
 * Пик pressure без свежего апгрейда → «всё плохо»; апгрейд поднимает DPS и выравнивает.
 */
export function waveThreat(stageIdx: number, waveProgress: number): number {
  const expectedStart = playerDps(expectedPowerAtStageStart(stageIdx))
  return expectedStart * wavePressure(stageIdx, waveProgress)
}

/** Отношение угроза / мощь. ~1 — норма, >1.25 — «плохо», <0.7 — слишком легко. */
export function threatRatio(stageIdx: number, waveProgress: number, power: PowerState): number {
  return waveThreat(stageIdx, waveProgress) / playerDps(power)
}

/** HP босса: пик этапа, рассчитан под полный билд этапа (с апгрейдом волны). */
export function bossHp(stageIdx: number): number {
  const full = expectedPowerAtStageStart(stageIdx)
  const withUpgrade = applyPickup(full, stageUpgradeKind(stageIdx, full))
  const withSide = applyPickup(withUpgrade, stageSidekickKind(withUpgrade))
  const dps = playerDps(withSide)
  // Цель: ~14–18 сек чистого фокуса при полном билде этапа
  const targetSeconds = 15 + stageIdx * 1.5
  const raw = dps * targetSeconds * 0.55
  return Math.round(Math.max(28, raw) + stageIdx * 8 + (stageIdx === 5 ? 30 : 0))
}

/** Кулдаун атаки босса — короче к финалу. */
export function bossShootCd(stageIdx: number): number {
  return Math.max(0.55, 1.45 - stageIdx * 0.14)
}

/** План дропов этапа: бочки + ровно 1 апгрейд + 1 саб/замена. */
export function stageDropPlan(stageIdx: number, power: PowerState): StageDrop[] {
  const drops: StageDrop[] = []
  const barrels = barrelCountForStage(stageIdx)
  const barrelTimes = stageIdx === 0 ? [2.5, 10, 19] : [5, 17]
  for (let i = 0; i < barrels; i++) {
    drops.push({ t: barrelTimes[i] ?? 6 + i * 6, kind: 'barrel' })
  }

  const upgrade = stageUpgradeKind(stageIdx, power)
  const sidekick = stageSidekickKind(power)

  // апгрейд в середине волны — первая половина давит без него
  drops.push({ t: stageIdx === 0 ? 7 : 11, kind: upgrade })
  // саб чуть позже, чтобы успеть осознать апгрейд
  drops.push({ t: stageIdx === 0 ? 13 : 16, kind: sidekick })

  // этап 0: обучение окну контекста (не дублируем, если апгрейд уже perk_*)
  if (stageIdx === 0 && upgrade !== 'perk_win') {
    drops.push({ t: 18, kind: 'perk_win' })
  } else if ((stageIdx === 2 || stageIdx === 4) && upgrade !== 'perk_win') {
    drops.push({ t: 20, kind: 'perk_win' })
  }

  return drops.sort((a, b) => a.t - b.t)
}

/** Микс прошлых врагов — растёт со сложностью, на этапе 0 = 0. */
export function enemyMixChance(stageIdx: number): number {
  if (stageIdx <= 0) return 0
  return Math.min(0.55, 0.1 + stageIdx * 0.08)
}
