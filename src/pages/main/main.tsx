import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { GameCanvas, GameControls } from '../../game/GameCanvas'
import { GameResult, IntroCard, Stats } from '../../game/engine'
import { C, spriteURL } from '../../game/sprites'
import {
  addScore,
  getBest,
  getLeaderboard,
  getSettings,
  saveSettings,
  ScoreEntry,
  setBest,
} from '../../game/storage'

type Screen = 'menu' | 'tutorial' | 'countdown' | 'playing' | 'gameover'

const ICON_NAMES = [
  'ship', 'mini', 'barrel', 'doc_agent', 'doc_skill', 'perk_zip', 'perk_win',
  'harness', 'olddev', 'slop1', 'legacy', 'hallu', 'loop1', 'rot', 'bolt', 'flag',
]

const GRAD = `linear-gradient(90deg, ${C.cyan}, ${C.bright})`

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap');
[class*="aip2-i-"]{background-size:contain;background-position:center;background-repeat:no-repeat;image-rendering:pixelated}
@keyframes aip-pop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
@keyframes aip-count{0%{transform:scale(1.6);opacity:0}25%{opacity:1;transform:scale(1)}80%{opacity:1}100%{transform:scale(.92);opacity:0}}
@keyframes aip-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.aip-btn{transition:transform .08s ease;user-select:none;-webkit-tap-highlight-color:transparent}
.aip-btn:active{transform:scale(0.96)}
.aip-scroll::-webkit-scrollbar{width:4px}
.aip-scroll::-webkit-scrollbar-thumb{background:rgba(230,242,238,0.2);border-radius:4px}
input::placeholder{color:rgba(230,242,238,0.4)}
*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
`

const fmt = (n: number): string => (n || 0).toLocaleString('ru-RU')
const FONT = "'Manrope', system-ui, -apple-system, sans-serif"
const TITLE_FONT = "'Unbounded', system-ui, sans-serif"

export const MainPage: React.FC = () => {
  const controls = useRef<GameControls>(null)
  const [screen, setScreen] = useState<Screen>('menu')
  const [stats, setStats] = useState<Stats | null>(null)
  const [result, setResult] = useState<GameResult | null>(null)
  const [best, setBestState] = useState<number>(getBest())
  const [settings, setSettings] = useState(getSettings())
  const [muted, setMuted] = useState(getSettings().muted)
  const [count, setCount] = useState(3)
  const [showLb, setShowLb] = useState(false)
  const [daily, setDaily] = useState(false)
  const [lastRank, setLastRank] = useState(-1)
  const [nameInput, setNameInput] = useState(settings.name)
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>(getLeaderboard())
  const [displayScore, setDisplayScore] = useState(0)
  const [shareBusy, setShareBusy] = useState(false)
  const savedRef = useRef(false)
  const scoreRaf = useRef(0)

  // Инъекция пиксельных иконок
  useEffect(() => {
    let css = ''
    for (const n of ICON_NAMES) {
      const url = spriteURL(n, 6)
      css += `.aip2-i-${n}{background-image:url("${url}")}`
    }
    let tag = document.getElementById('aip2-icons')
    if (!tag) {
      tag = document.createElement('style')
      tag.id = 'aip2-icons'
      document.head.appendChild(tag)
    }
    tag.textContent = css
  }, [])

  const handleStats = useCallback((s: Stats) => setStats(s), [])

  const handleGameOver = useCallback((r: GameResult) => {
    if (savedRef.current) return
    savedRef.current = true
    const newBest = setBest(r.score)
    setBestState(newBest)
    const name = (getSettings().name || 'Гость').slice(0, 14)
    const entry: ScoreEntry = { name, score: r.score, zone: r.stageName, date: Date.now() }
    const rank = addScore(entry)
    setLeaderboard(getLeaderboard())
    setLastRank(rank)
    setResult(r)
    setScreen('gameover')
    setDisplayScore(0)
    const start = performance.now()
    const dur = 900
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      setDisplayScore(Math.floor(r.score * (1 - Math.pow(1 - p, 3))))
      if (p < 1) scoreRaf.current = requestAnimationFrame(tick)
    }
    scoreRaf.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => () => cancelAnimationFrame(scoreRaf.current), [])

  const beginCountdown = useCallback((d: boolean) => {
    controls.current?.resumeAudio()
    setDaily(d)
    savedRef.current = false
    setResult(null)
    setCount(3)
    setScreen('countdown')
  }, [])

  useEffect(() => {
    if (screen !== 'countdown') return
    let n = 3
    setCount(3)
    controls.current?.countdownTick(false)
    const id = window.setInterval(() => {
      n -= 1
      if (n > 0) {
        setCount(n)
        controls.current?.countdownTick(false)
      } else if (n === 0) {
        setCount(0)
        controls.current?.countdownTick(true)
      } else {
        clearInterval(id)
        const seed = daily
          ? Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''))
          : Math.floor(Math.random() * 1e9)
        setScreen('playing')
        controls.current?.start(seed)
      }
    }, 750)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  const onPlay = useCallback(
    (d: boolean) => {
      if (!getSettings().tutorialSeen) {
        setDaily(d)
        setScreen('tutorial')
      } else beginCountdown(d)
    },
    [beginCountdown],
  )

  const finishTutorial = useCallback(() => {
    setSettings(saveSettings({ tutorialSeen: true }))
    beginCountdown(daily)
  }, [beginCountdown, daily])

  const toggleMute = useCallback(() => {
    const m = !getSettings().muted
    setSettings(saveSettings({ muted: m }))
    setMuted(m)
  }, [])

  const toggleMotion = useCallback(() => {
    setSettings(saveSettings({ reduceMotion: !getSettings().reduceMotion }))
  }, [])

  const commitName = useCallback((v: string) => {
    const clean = v.slice(0, 14)
    setNameInput(clean)
    setSettings(saveSettings({ name: clean }))
  }, [])

  const doShare = useCallback(async () => {
    if (!result || shareBusy) return
    setShareBusy(true)
    try {
      const blob = await buildShareCard(result, getSettings().name || 'Гость', lastRank)
      const file = new File([blob], 'ai-pdlc-rush.png', { type: 'image/png' })
      const navAny = navigator as Navigator & {
        canShare?: (d: unknown) => boolean
        share?: (d: unknown) => Promise<void>
      }
      if (navAny.share && navAny.canShare && navAny.canShare({ files: [file] })) {
        await navAny.share({
          files: [file],
          title: 'AI PDLC RUSH',
          text: `Мой результат: ${fmt(result.score)} очков. #каквсбере`,
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'ai-pdlc-rush.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
      }
    } catch {
      /* отменено */
    } finally {
      setShareBusy(false)
    }
  }, [result, shareBusy, lastRank])

  const openLb = useCallback(() => {
    setLeaderboard(getLeaderboard())
    setShowLb(true)
  }, [])

  const top3Delta = useMemo(() => {
    if (!result) return null
    const lb = getLeaderboard()
    if (lb.length < 3 || result.score >= lb[2].score) return null
    return lb[2].score - result.score + 1
  }, [result])

  const active = screen === 'playing'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#030B0E',
        display: 'flex',
        justifyContent: 'center',
        fontFamily: FONT,
        color: C.ink,
        overflow: 'hidden',
      }}
    >
      <style>{STYLES}</style>
      <div
        style={{
          position: 'relative',
          width: 'min(100vw, 480px)',
          height: '100%',
          maxHeight: '100dvh',
          overflow: 'hidden',
          background: '#07171D',
        }}
      >
        <GameCanvas
          ref={controls}
          active={active}
          reduceMotion={settings.reduceMotion}
          muted={muted}
          best={best}
          onStats={handleStats}
          onGameOver={handleGameOver}
        />

        {active && stats && <Hud stats={stats} muted={muted} onMute={toggleMute} />}

        {screen === 'menu' && (
          <Menu
            best={best}
            name={nameInput}
            onName={commitName}
            onPlay={() => onPlay(false)}
            onDaily={() => onPlay(true)}
            onLb={openLb}
            muted={muted}
            onMute={toggleMute}
            reduceMotion={settings.reduceMotion}
            onMotion={toggleMotion}
          />
        )}

        {screen === 'tutorial' && <Tutorial onDone={finishTutorial} />}
        {screen === 'countdown' && <Countdown count={count} />}

        {screen === 'gameover' && result && (
          <GameOver
            result={result}
            best={best}
            rank={lastRank}
            displayScore={displayScore}
            top3Delta={top3Delta}
            onRetry={() => beginCountdown(daily)}
            onMenu={() => {
              setScreen('menu')
              controls.current?.renderStatic()
            }}
            onShare={doShare}
            shareBusy={shareBusy}
            onLb={openLb}
            daily={daily}
          />
        )}

        {showLb && <Leaderboard entries={leaderboard} onClose={() => setShowLb(false)} />}
      </div>
    </div>
  )
}

// ---------- HUD ----------
const card = {
  background: 'rgba(5,17,22,0.78)',
  border: '1px solid rgba(230,242,238,0.12)',
} as const

const Hud: React.FC<{ stats: Stats; muted: boolean; onMute: () => void }> = ({ stats, muted, onMute }) => {
  const pct = stats.tokenPct == null ? 1 : stats.tokenPct
  const tokColor = pct > 0.4 ? C.bright : pct > 0.2 ? C.gold : C.danger
  const skillPct = 100 - Math.round(Math.pow(0.85, stats.skillLvl) * 100)
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Верхняя строка */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ ...card, borderRadius: 14, padding: '7px 13px 9px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(230,242,238,0.62)' }}>ОЧКИ</div>
          <div style={{ fontFamily: TITLE_FONT, fontSize: 22, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
            {fmt(stats.score)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...card, borderRadius: 999, padding: '6px 13px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: stats.stageAccent }} />
            <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 0.5 }}>{stats.stageName}</div>
          </div>
          {stats.lap && <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: C.danger }}>{stats.lap}</div>}
          {stats.darkFactory && (
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5, color: '#04140C', background: C.gold, borderRadius: 999, padding: '3px 10px' }}>
              DARK FACTORY ×2
            </div>
          )}
        </div>
        <button
          onClick={onMute}
          className="aip-btn"
          style={{ pointerEvents: 'auto', ...card, color: muted ? 'rgba(230,242,238,0.5)' : C.bright, borderRadius: 999, padding: '8px 12px', fontFamily: FONT, fontSize: 11.5, fontWeight: 800, letterSpacing: 1, cursor: 'pointer' }}
        >
          {muted ? 'ВЫКЛ' : 'ЗВУК'}
        </button>
      </div>

      {/* Контекст-бар */}
      <div style={{ ...card, borderRadius: 14, padding: '8px 13px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(230,242,238,0.62)' }}>
            КОНТЕКСТ · ОКНО {stats.capLabel}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: tokColor }}>{fmt(stats.tokens)}</div>
        </div>
        <div style={{ marginTop: 6, height: 8, borderRadius: 4, background: 'rgba(230,242,238,0.1)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, background: tokColor, width: `${Math.round(pct * 100)}%`, transition: 'width .1s linear' }} />
        </div>
      </div>

      {/* Чипы апгрейдов */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip icon="doc_agent" text={`ОГОНЬ ур.${stats.agentLvl}`} color={C.bright} />
        {stats.skillLvl > 0 && <Chip icon="doc_skill" text={`РАСХОД −${skillPct}%`} color={C.blue} />}
        {stats.subs > 0 && <Chip icon="mini" text={`SUB ×${stats.subs}`} color={C.bright} />}
        {stats.compress && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(76,141,235,0.15)', border: `1px solid rgba(76,141,235,0.55)`, borderRadius: 999, padding: '4px 10px 4px 5px' }}>
            <div className="aip2-i-perk_zip" style={{ width: 18, height: 18 }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: C.blue }}>СЖАТИЕ</span>
          </div>
        )}
        {stats.combo >= 5 && (
          <div style={{ fontSize: 12, fontWeight: 800, color: '#04140C', background: C.bright, borderRadius: 999, padding: '5px 11px' }}>
            СЕРИЯ {stats.combo}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, ...card, borderRadius: 999, padding: '6px 11px', marginLeft: 'auto' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                background: i < stats.harness.length ? C.gold : 'rgba(230,242,238,0.08)',
                border: `1px solid ${i < stats.harness.length ? C.gold : 'rgba(230,242,238,0.25)'}`,
              }}
            />
          ))}
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: 'rgba(230,242,238,0.62)', marginLeft: 4 }}>ХАРНЕС</span>
        </div>
      </div>

      {/* Босс-бар */}
      {stats.boss && (
        <div style={{ background: 'rgba(5,17,22,0.85)', border: `1px solid rgba(244,87,77,0.5)`, borderRadius: 14, padding: '8px 13px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: C.danger }}>{stats.boss.name}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(230,242,238,0.55)' }}>БОЛЕЗНЬ АГЕНТА</div>
          </div>
          <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: 'rgba(230,242,238,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: C.danger, width: `${Math.round(stats.boss.pct * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Intro-карточка */}
      {stats.intro && <Intro card={stats.intro} accent={stats.stageAccent} />}
    </div>
  )
}

const Chip: React.FC<{ icon: string; text: string; color: string }> = ({ icon, text, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...card, borderRadius: 999, padding: '4px 10px 4px 5px' }}>
    <div className={`aip2-i-${icon}`} style={{ width: 20, height: 20 }} />
    <span style={{ fontSize: 12, fontWeight: 800, color }}>{text}</span>
  </div>
)

const Intro: React.FC<{ card: IntroCard; accent: string }> = ({ card: intro, accent }) => {
  const sprMap: Record<string, string> = {
    olddev: 'olddev', slop: 'slop1', legacy: 'legacy', hallu: 'hallu', loop: 'loop1', rot: 'rot', ship: 'ship',
  }
  const introAccent = intro.kind === 'boss' ? C.danger : intro.kind === 'dark' || intro.kind === 'clear' ? C.gold : accent
  const border = intro.kind === 'boss' ? 'rgba(244,87,77,0.55)' : 'rgba(230,242,238,0.18)'
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: '38%', display: 'flex', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ background: 'rgba(5,17,22,0.92)', border: `1px solid ${border}`, borderRadius: 20, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', maxWidth: 330, animation: 'aip-pop .3s ease' }}>
        <div className={`aip2-i-${sprMap[intro.sprite] || 'ship'}`} style={{ width: 56, height: 52, flexShrink: 0 }} />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 2, color: introAccent }}>{intro.sub}</div>
          <div style={{ fontFamily: TITLE_FONT, fontSize: 16, fontWeight: 700, marginTop: 2 }}>{intro.title}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.45, color: 'rgba(230,242,238,0.72)', marginTop: 4 }}>{intro.legend}</div>
        </div>
      </div>
    </div>
  )
}

// ---------- Меню ----------
interface MenuProps {
  best: number
  name: string
  onName: (v: string) => void
  onPlay: () => void
  onDaily: () => void
  onLb: () => void
  muted: boolean
  onMute: () => void
  reduceMotion: boolean
  onMotion: () => void
}
const Menu: React.FC<MenuProps> = ({ best, name, onName, onPlay, onDaily, onLb, muted, onMute, reduceMotion, onMotion }) => (
  <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', background: 'linear-gradient(168deg, rgba(8,42,46,0.94) 0%, rgba(7,26,32,0.95) 38%, rgba(6,18,23,0.97) 100%)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 0' }}>
      <Dots color={C.ink} />
      <div style={{ border: '1.5px solid rgba(230,242,238,0.35)', borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'rgba(230,242,238,0.85)' }}>#каквсбере</div>
      <Dots color={C.bright} />
    </div>
    <div className="aip-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 24px', textAlign: 'center' }}>
      <div className="aip2-i-ship" style={{ width: 72, height: 80, animation: 'aip-bob 2.6s ease-in-out infinite' }} />
      <div style={{ marginTop: 14, fontSize: 12, fontWeight: 800, letterSpacing: 3, color: C.bright }}>AI PDLC DISRUPT</div>
      <h1 style={{ margin: '8px 0 0', fontFamily: TITLE_FONT, fontSize: 38, fontWeight: 800, lineHeight: 1.04, color: C.ink }}>
        AI PDLC<br />RUSH
      </h1>
      <div style={{ width: 56, height: 5, background: GRAD, margin: '14px auto 0' }} />
      <div style={{ marginTop: 14, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'rgba(230,242,238,0.72)', maxWidth: 310 }}>
        Прокачай агента от 8K контекста до Dark Factory. Сбивай болезни агентов, собирай токены и харнес.
      </div>
      <div style={{ width: '100%', maxWidth: 320, marginTop: 18, textAlign: 'left' }}>
        <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'rgba(230,242,238,0.62)' }}>НИК ДЛЯ ЛИДЕРБОРДА</label>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Введи ник"
          maxLength={14}
          style={{ width: '100%', marginTop: 6, padding: '13px 16px', borderRadius: 14, border: '1px solid rgba(230,242,238,0.2)', background: 'rgba(4,12,16,0.7)', color: C.ink, fontFamily: FONT, fontSize: 16, fontWeight: 600, outline: 'none' }}
        />
      </div>
      <PrimaryButton onClick={onPlay} label="Играть" />
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 320, marginTop: 10 }}>
        <GhostButton onClick={onDaily} label="Забег дня" />
        <GhostButton onClick={onLb} label="Лидерборд" />
      </div>
      <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: 'rgba(230,242,238,0.62)' }}>
        Рекорд <span style={{ color: C.bright, fontWeight: 800 }}>{fmt(best)}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Pill active={!muted} label={muted ? 'Звук: выкл' : 'Звук: вкл'} onClick={onMute} />
        <Pill active={!reduceMotion} label={reduceMotion ? 'Эффекты: меньше' : 'Эффекты: вкл'} onClick={onMotion} />
      </div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 18px' }}>
      <div style={{ border: '1.5px solid rgba(230,242,238,0.3)', borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 700, color: 'rgba(230,242,238,0.8)' }}>Технохаб Конф</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1.5px solid rgba(230,242,238,0.3)', borderRadius: 999, padding: '5px 13px' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.bright }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(230,242,238,0.8)' }}>Санкт-Петербург</span>
      </div>
    </div>
  </div>
)

const Dots: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
    <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
    <div style={{ width: 12, height: 12, border: `2px solid ${color}` }} />
    <div style={{ width: 12, height: 12, border: `2px solid ${color}`, borderRadius: '50%' }} />
  </div>
)

// ---------- Туториал ----------
const Tutorial: React.FC<{ onDone: () => void }> = ({ onDone }) => (
  <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,12,16,0.9)', padding: 24 }}>
    <div style={{ width: '100%', maxWidth: 330 }}>
      <h2 style={{ margin: 0, fontFamily: TITLE_FONT, fontSize: 22, fontWeight: 700, textAlign: 'center' }}>Как играть</h2>
      <div style={{ display: 'grid', gap: 9, marginTop: 18 }}>
        <TutRow icon="ship" text="Веди пальцем — агент летит за ним и стреляет сам" />
        <TutRow icon="barrel" text="Токены — топливо и жизнь. Горят постоянно, пополняй бочонками" />
        <TutRow icon="doc_agent" text="AGENT.MD — сильнее огонь, SKILL.MD — меньше расход, SUBAGENT — напарники" />
        <TutRow icon="perk_win" text="Перки: сжатие контекста и окно от 8K до 1M токенов" />
        <TutRow icon="harness" text="Собери 5 частей харнеса с боссов — включится DARK FACTORY: судьи и очки ×2" />
      </div>
      <PrimaryButton onClick={onDone} label="Понятно, поехали" full />
    </div>
  </div>
)

const TutRow: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(230,242,238,0.05)', border: '1px solid rgba(230,242,238,0.1)', borderRadius: 16, padding: '11px 14px' }}>
    <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: 'rgba(4,12,16,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className={`aip2-i-${icon}`} style={{ width: 26, height: 26 }} />
    </div>
    <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{text}</div>
  </div>
)

// ---------- Countdown ----------
const Countdown: React.FC<{ count: number }> = ({ count }) => (
  <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,12,16,0.55)' }}>
    <div key={count} style={{ fontFamily: TITLE_FONT, fontSize: 110, fontWeight: 800, color: count === 0 ? C.bright : C.ink, animation: 'aip-count .75s ease forwards' }}>
      {count === 0 ? 'GO' : count}
    </div>
  </div>
)

// ---------- Game Over ----------
interface GameOverProps {
  result: GameResult
  best: number
  rank: number
  displayScore: number
  top3Delta: number | null
  onRetry: () => void
  onMenu: () => void
  onShare: () => void
  shareBusy: boolean
  onLb: () => void
  daily: boolean
}
const GameOver: React.FC<GameOverProps> = ({ result, best, rank, displayScore, top3Delta, onRetry, onMenu, onShare, shareBusy, onLb }) => {
  const isRecord = result.score >= best && result.score > 0
  const tally: Array<{ k: string; v: string; c: string }> = [
    { k: 'Очки за забег', v: fmt(result.base), c: C.ink },
    { k: 'Остаток контекста', v: `+${fmt(result.tokenBonus)}`, c: C.bright },
    { k: `Харнес ${result.harness}/5`, v: `+${fmt(result.harnessBonus)}`, c: C.gold },
  ]
  if (result.victoryBonus) tally.push({ k: 'Бонус за финал', v: `+${fmt(result.victoryBonus)}`, c: C.gold })

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,12,16,0.9)', padding: 20 }}>
      <div className="aip-scroll" style={{ width: '100%', maxWidth: 330, textAlign: 'center', maxHeight: '100%', overflowY: 'auto' }}>
        {isRecord && <Badge bg={C.gold} color="#04140C" text="НОВЫЙ РЕКОРД" />}
        {result.won && <Badge bg={GRAD} color="#04140C" text="ПАЙПЛАЙН ПРОЙДЕН" />}
        {!result.won && <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: 'rgba(230,242,238,0.62)' }}>КОНТЕКСТ ИСЧЕРПАН</div>}

        <div style={{ fontFamily: TITLE_FONT, fontSize: 54, fontWeight: 800, lineHeight: 1.1, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>{fmt(displayScore)}</div>
        {rank >= 0 && rank < 50 && (
          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: 'rgba(230,242,238,0.85)' }}>
            место в топе <span style={{ color: C.bright, fontWeight: 800 }}>#{rank + 1}</span>
          </div>
        )}
        {result.darkFactory && (
          <div style={{ display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: C.gold, border: '1px solid rgba(242,193,78,0.5)', borderRadius: 999, padding: '5px 13px' }}>
            DARK FACTORY СОБРАНА
          </div>
        )}

        <div style={{ marginTop: 14, textAlign: 'left', border: '1px solid rgba(230,242,238,0.12)', borderRadius: 14, padding: '11px 16px', display: 'grid', gap: 6, background: 'rgba(230,242,238,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: 'rgba(230,242,238,0.5)' }}>ПОДСЧЁТ ОЧКОВ</div>
          {tally.map((t, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(230,242,238,0.7)' }}>{t.k}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: t.c, fontVariantNumeric: 'tabular-nums' }}>{t.v}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <ResultStat icon="bolt" label="СБИТО" value={String(result.kills)} />
          <ResultStat icon="flag" label="ДОШЁЛ ДО" value={result.stageName} />
          <ResultStat icon="harness" label="ХАРНЕС" value={`${result.harness}/5`} />
          <ResultStat icon="perk_win" label="ОКНО" value={result.capLabel} />
        </div>

        {top3Delta != null && (
          <div style={{ marginTop: 12, fontSize: 13.5, fontWeight: 600, padding: '10px 14px', borderRadius: 14, background: 'rgba(242,193,78,0.1)', border: '1px solid rgba(242,193,78,0.35)', color: C.ink }}>
            До топ-3 всего <span style={{ color: C.gold, fontWeight: 800 }}>{fmt(top3Delta)}</span> очков
          </div>
        )}

        <PrimaryButton onClick={onRetry} label="Ещё разок" full />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <GhostButton onClick={onShare} label={shareBusy ? '…' : 'Поделиться'} />
          <GhostButton onClick={onLb} label="Топ" />
          <GhostButton onClick={onMenu} label="Меню" />
        </div>
      </div>
    </div>
  )
}

const Badge: React.FC<{ bg: string; color: string; text: string }> = ({ bg, color, text }) => (
  <div style={{ display: 'inline-block', fontSize: 12.5, fontWeight: 800, letterSpacing: 2, color, background: bg, borderRadius: 999, padding: '6px 16px', margin: '0 4px' }}>{text}</div>
)

const ResultStat: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 14, background: 'rgba(230,242,238,0.05)', border: '1px solid rgba(230,242,238,0.1)', textAlign: 'left' }}>
    <div className={`aip2-i-${icon}`} style={{ width: 20, height: 20, flexShrink: 0 }} />
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(230,242,238,0.55)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{value}</div>
    </div>
  </div>
)

// ---------- Leaderboard ----------
const Leaderboard: React.FC<{ entries: ScoreEntry[]; onClose: () => void }> = ({ entries, onClose }) => (
  <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,12,16,0.9)', padding: 20 }}>
    <div style={{ width: '100%', maxWidth: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontFamily: TITLE_FONT, fontSize: 20, fontWeight: 700 }}>Лидерборд</h2>
        <button onClick={onClose} className="aip-btn" style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid rgba(230,242,238,0.28)', background: 'transparent', color: C.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>✕</button>
      </div>
      {entries.length === 0 ? (
        <div style={{ color: 'rgba(230,242,238,0.62)', textAlign: 'center', padding: '36px 10px', fontSize: 14.5, fontWeight: 600 }}>Пока пусто. Стань первым.</div>
      ) : (
        <div className="aip-scroll" style={{ maxHeight: '60vh', overflowY: 'auto', display: 'grid', gap: 6 }}>
          {entries.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderRadius: 14, background: i < 3 ? 'rgba(33,160,56,0.12)' : 'rgba(230,242,238,0.05)', border: `1px solid ${i < 3 ? 'rgba(59,210,105,0.45)' : 'rgba(230,242,238,0.1)'}` }}>
              <div style={{ width: 26, height: 26, flexShrink: 0, borderRadius: '50%', background: i < 3 ? C.green : 'rgba(230,242,238,0.1)', color: i < 3 ? '#FFFFFF' : 'rgba(230,242,238,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(230,242,238,0.55)' }}>{e.zone}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.bright, fontVariantNumeric: 'tabular-nums' }}>{fmt(e.score)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)

// ---------- Кнопки ----------
const PrimaryButton: React.FC<{ onClick: () => void; label: string; full?: boolean }> = ({ onClick, label, full }) => (
  <button
    onClick={onClick}
    className="aip-btn"
    style={{ width: '100%', maxWidth: full ? undefined : 320, marginTop: full ? 18 : 14, padding: 17, borderRadius: 999, border: 'none', fontFamily: FONT, fontSize: 17, fontWeight: 800, letterSpacing: 0.5, color: '#FFFFFF', background: GRAD, cursor: 'pointer' }}
  >
    {label}
  </button>
)

const GhostButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="aip-btn"
    style={{ flex: 1, padding: '13px 8px', borderRadius: 999, border: '1.5px solid rgba(230,242,238,0.28)', background: 'transparent', color: C.ink, fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
  >
    {label}
  </button>
)

const Pill: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className="aip-btn"
    style={{ padding: '8px 14px', borderRadius: 999, border: `1px solid ${active ? 'rgba(59,210,105,0.5)' : 'rgba(230,242,238,0.25)'}`, background: 'transparent', color: active ? C.bright : 'rgba(230,242,238,0.5)', fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
  >
    {label}
  </button>
)

// ---------- Шер-карточка ----------
const buildShareCard = async (r: GameResult, name: string, rank: number): Promise<Blob> => {
  try {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready
  } catch {
    /* ignore */
  }
  const W = 600
  const H = 800
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')
  if (!ctx) throw new Error('no ctx')
  ctx.fillStyle = '#07171D'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(230,242,238,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ;(ctx as CanvasRenderingContext2D & { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect?.(W / 2 - 150, 52, 300, 40, 20)
  ctx.stroke()
  ctx.fillStyle = 'rgba(230,242,238,0.85)'
  ctx.font = '700 15px Manrope, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('AI PDLC DISRUPT · ТЕХНОХАБ КОНФ', W / 2, 73)
  ctx.fillStyle = '#F2F8F5'
  ctx.font = '800 52px Unbounded, Manrope, sans-serif'
  ctx.fillText('AI PDLC RUSH', W / 2, 150)
  const grad = ctx.createLinearGradient(W / 2 - 28, 0, W / 2 + 28, 0)
  grad.addColorStop(0, C.cyan)
  grad.addColorStop(1, C.bright)
  ctx.fillStyle = grad
  ctx.fillRect(W / 2 - 28, 185, 56, 5)
  ctx.font = '700 24px Manrope, sans-serif'
  ctx.fillStyle = '#F2F8F5'
  ctx.fillText(name, W / 2, 250)
  ctx.font = '800 104px Unbounded, Manrope, sans-serif'
  ctx.fillStyle = C.bright
  ctx.fillText(r.score.toLocaleString('ru-RU'), W / 2, 360)
  ctx.font = '700 16px Manrope, sans-serif'
  ctx.fillStyle = 'rgba(230,242,238,0.62)'
  ctx.fillText('ОЧКОВ', W / 2, 425)
  const rows: Array<[string, string]> = [
    ['Сбито врагов', String(r.kills)],
    ['Дошёл до', r.stageName],
    ['Харнес', `${r.harness}/5`],
    ['Контекстное окно', r.capLabel],
  ]
  ctx.font = '700 22px Manrope, sans-serif'
  let y = 520
  for (const [k, v] of rows) {
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(230,242,238,0.62)'
    ctx.fillText(k, 90, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#F2F8F5'
    ctx.fillText(v, W - 90, y)
    y += 44
  }
  if (r.darkFactory) {
    ctx.textAlign = 'center'
    ctx.fillStyle = C.gold
    ctx.font = '800 26px Manrope, sans-serif'
    ctx.fillText('DARK FACTORY СОБРАНА', W / 2, y + 16)
    y += 50
  }
  if (rank >= 0 && rank < 50) {
    ctx.textAlign = 'center'
    ctx.fillStyle = C.gold
    ctx.font = '800 26px Manrope, sans-serif'
    ctx.fillText(`МЕСТО #${rank + 1}`, W / 2, y + 16)
  }
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(230,242,238,0.5)'
  ctx.font = '600 17px Manrope, sans-serif'
  ctx.fillText('#каквсбере · обгони меня', W / 2, H - 40)
  return new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png'))
}

export default MainPage
