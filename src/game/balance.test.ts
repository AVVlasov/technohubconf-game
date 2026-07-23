import { describe, expect, it } from 'vitest'
import {
  BARREL_KILL_CHANCE,
  BARREL_REFILL_PCT,
  WAVE_DURATION,
  applyPickup,
  bossHp,
  enemyHpMult,
  expectedPowerAtStageStart,
  playerDps,
  powerMissingLastUpgrade,
  stageDropPlan,
  stageSidekickKind,
  stageUpgradeKind,
  threatRatio,
  wavePressure,
} from './balance'

describe('stage drop contract', () => {
  it('каждый этап даёт ровно 1 апгрейд и 1 саб/замену', () => {
    for (let stage = 0; stage < 6; stage++) {
      const power = expectedPowerAtStageStart(stage)
      const plan = stageDropPlan(stage, power)
      const wantUp = stageUpgradeKind(stage, power)
      const wantSide = stageSidekickKind(power)
      expect(plan.filter((d) => d.kind === wantUp).length, `stage ${stage} upgrade`).toBe(1)
      expect(plan.filter((d) => d.kind === wantSide).length, `stage ${stage} sidekick`).toBe(1)
      expect(wantUp).not.toBe(wantSide)
      const upT = plan.find((d) => d.kind === wantUp)!.t
      expect(upT).toBeGreaterThanOrEqual(stage === 0 ? 5 : 9)
      expect(upT).toBeLessThan(WAVE_DURATION * 0.6)
    }
  })

  it('этап 0 знакомит с agent + mini', () => {
    const plan = stageDropPlan(0, expectedPowerAtStageStart(0))
    expect(plan.some((d) => d.kind === 'doc_agent')).toBe(true)
    expect(plan.some((d) => d.kind === 'mini')).toBe(true)
  })
})

describe('tutorial stage 0 curve', () => {
  const bare = expectedPowerAtStageStart(0)

  it('старт лёгкий — threat заметно ниже мощи', () => {
    expect(threatRatio(0, 0, bare)).toBeLessThan(0.7)
  })

  it('к концу волны выходит на норму', () => {
    const end = threatRatio(0, 1, bare)
    expect(end).toBeGreaterThan(0.75)
    expect(end).toBeLessThan(1.15)
  })

  it('давление монотонно растёт на этапе 0', () => {
    expect(wavePressure(0, 0)).toBeLessThan(wavePressure(0, 0.5))
    expect(wavePressure(0, 0.5)).toBeLessThan(wavePressure(0, 1))
  })
})

describe('upgrade gate — без апгрейда следующий этап не выжить', () => {
  it('старт этапа 1+ без прошлого апгрейда: threat >> power', () => {
    for (let stage = 1; stage < 6; stage++) {
      const missing = powerMissingLastUpgrade(stage)
      const ratio = threatRatio(stage, 0.35, missing)
      expect(ratio, `stage ${stage} missing upgrade`).toBeGreaterThan(1.35)
    }
  })

  it('со всеми прошлыми апгрейдами старт этапа проходим', () => {
    for (let stage = 1; stage < 6; stage++) {
      const full = expectedPowerAtStageStart(stage)
      const ratio = threatRatio(stage, 0.15, full)
      expect(ratio, `stage ${stage} equipped`).toBeLessThan(1.2)
      expect(ratio, `stage ${stage} not trivial`).toBeGreaterThan(0.55)
    }
  })
})

describe('mid-stage pressure and recovery', () => {
  it('середина без свежего апгрейда — «всё плохо»', () => {
    for (let stage = 1; stage < 6; stage++) {
      const atStart = expectedPowerAtStageStart(stage)
      const mid = threatRatio(stage, 0.5, atStart)
      expect(mid, `stage ${stage} mid uneqipped`).toBeGreaterThan(1.2)
    }
  })

  it('после подбора апгрейда снова справляемся', () => {
    for (let stage = 1; stage < 6; stage++) {
      const atStart = expectedPowerAtStageStart(stage)
      const midBad = threatRatio(stage, 0.5, atStart)
      const upgraded = applyPickup(atStart, stageUpgradeKind(stage, atStart))
      const withSide = applyPickup(upgraded, stageSidekickKind(upgraded))
      // к ~0.7 волны давление с пика спадает, билд уже полный
      const late = threatRatio(stage, 0.7, withSide)
      expect(late, `stage ${stage} recovered`).toBeLessThan(1.15)
      expect(late, `stage ${stage} better than mid`).toBeLessThan(midBad * 0.9)
      expect(late, `stage ${stage} still tense`).toBeGreaterThan(0.35)
    }
  })
})

describe('enemy armor tracks player power', () => {
  it('рост DPS между этапами не опережает рост брони', () => {
    for (let stage = 1; stage < 6; stage++) {
      const prevDps = playerDps(expectedPowerAtStageStart(stage - 1))
      const nextDps = playerDps(expectedPowerAtStageStart(stage))
      const dpsGrowth = nextDps / prevDps
      const armorGrowth = enemyHpMult(stage) / enemyHpMult(stage - 1)
      // броня покрывает усиление огня (с запасом ≥ усиления)
      expect(armorGrowth, `stage ${stage} armor vs dps`).toBeGreaterThanOrEqual(dpsGrowth * 0.95)
    }
  })

  it('финальный этап заметно толще первого', () => {
    expect(enemyHpMult(5) / enemyHpMult(0)).toBeGreaterThan(2.5)
  })
})

describe('boss is stage peak', () => {
  it('HP босса растёт с этапом и не слабее волны', () => {
    let prev = 0
    for (let stage = 0; stage < 6; stage++) {
      const hp = bossHp(stage)
      expect(hp).toBeGreaterThan(prev)
      // босс жирнее пачки врагов с бронёй этапа
      expect(hp).toBeGreaterThan(enemyHpMult(stage) * 12)
      prev = hp
    }
  })
})

describe('barrel economy −5%', () => {
  it('шанс и рефилл урезаны на 5% от прежних значений', () => {
    expect(BARREL_KILL_CHANCE).toBeCloseTo(0.171, 5)
    expect(BARREL_REFILL_PCT).toBeCloseTo(0.133, 5)
  })
})
