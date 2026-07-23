import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import { Engine, GameResult, Stats } from './engine'

export interface GameControls {
  start: (seed: number) => void
  stop: () => void
  setTarget: (x: number, y: number) => void
  nudge: (dx: number, dy: number) => void
  setStartStage: (i: number) => void
  renderStatic: () => void
  countdownTick: (go: boolean) => void
  resumeAudio: () => void
}

interface Props {
  active: boolean // играем ли сейчас (принимать ввод перетаскивания)
  reduceMotion: boolean
  muted: boolean
  best: number
  onStats: (s: Stats) => void
  onGameOver: (r: GameResult) => void
}

export const GameCanvas = forwardRef<GameControls, Props>(
  ({ active, reduceMotion, muted, best, onStats, onGameOver }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapRef = useRef<HTMLDivElement>(null)
    const engineRef = useRef<Engine | null>(null)
    const activeRef = useRef(active)
    const dragging = useRef(false)

    activeRef.current = active

    useEffect(() => {
      const canvas = canvasRef.current
      const wrap = wrapRef.current
      if (!canvas || !wrap) return
      const engine = new Engine(canvas)
      engine.onStats = onStats
      engine.onGameOver = onGameOver
      engine.setBest(best)
      engine.setReduceMotion(reduceMotion)
      engine.setMuted(muted)
      engineRef.current = engine

      const doResize = () => {
        const rect = wrap.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        engine.resize(rect.width, rect.height, dpr)
        if (engine.state !== 'playing') engine.render()
      }
      doResize()
      const ro = new ResizeObserver(doResize)
      ro.observe(wrap)

      const onVisibility = () => {
        if (document.hidden) engine.pause()
        else engine.resumeLoop()
      }
      document.addEventListener('visibilitychange', onVisibility)

      const onKey = (e: KeyboardEvent) => {
        const eng = engineRef.current
        if (!eng || !activeRef.current) return
        const st = 34
        if (e.key === 'ArrowLeft' || e.key === 'a') eng.nudge(-st, 0)
        else if (e.key === 'ArrowRight' || e.key === 'd') eng.nudge(st, 0)
        else if (e.key === 'ArrowUp' || e.key === 'w') {
          e.preventDefault()
          eng.nudge(0, -st)
        } else if (e.key === 'ArrowDown' || e.key === 's') eng.nudge(0, st)
      }
      window.addEventListener('keydown', onKey)

      return () => {
        ro.disconnect()
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('keydown', onKey)
        engine.stop()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      engineRef.current?.setReduceMotion(reduceMotion)
    }, [reduceMotion])
    useEffect(() => {
      engineRef.current?.setMuted(muted)
    }, [muted])
    useEffect(() => {
      engineRef.current?.setBest(best)
    }, [best])

    useImperativeHandle(ref, () => ({
      start: (seed: number) => engineRef.current?.start(seed),
      stop: () => engineRef.current?.stop(),
      setTarget: (x: number, y: number) => engineRef.current?.setTarget(x, y),
      nudge: (dx: number, dy: number) => engineRef.current?.nudge(dx, dy),
      setStartStage: (i: number) => engineRef.current?.setStartStage(i),
      renderStatic: () => engineRef.current?.renderStatic(),
      countdownTick: (go: boolean) => engineRef.current?.audio.countdownTick(go),
      resumeAudio: () => engineRef.current?.audio.resume(),
    }))

    const toLocal = (clientX: number, clientY: number) => {
      const rect = wrapRef.current?.getBoundingClientRect()
      return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) }
    }

    return (
      <div
        ref={wrapRef}
        style={{ position: 'absolute', inset: 0, touchAction: 'none', overflow: 'hidden' }}
        onPointerDown={(e) => {
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          dragging.current = true
          if (activeRef.current) {
            const p = toLocal(e.clientX, e.clientY)
            engineRef.current?.setTarget(p.x, p.y - 40)
          }
        }}
        onPointerMove={(e) => {
          if (!dragging.current || !activeRef.current) return
          const p = toLocal(e.clientX, e.clientY)
          engineRef.current?.setTarget(p.x, p.y - 40)
        }}
        onPointerUp={() => {
          dragging.current = false
        }}
        onPointerCancel={() => {
          dragging.current = false
        }}
        onPointerLeave={() => {
          dragging.current = false
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
        />
      </div>
    )
  },
)

GameCanvas.displayName = 'GameCanvas'
