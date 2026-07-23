import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import { Engine, GameResult, Stats } from './engine'

export interface GameControls {
  start: (seed: number) => void
  stop: () => void
  moveLeft: () => void
  moveRight: () => void
  jump: () => void
  slide: () => void
  usePowerup: () => void
  renderStatic: () => void
}

interface Props {
  active: boolean // принимать ли ввод (state === playing)
  reduceMotion: boolean
  best: number
  onStats: (s: Stats) => void
  onGameOver: (r: GameResult) => void
}

const SWIPE_THRESHOLD = 24

export const GameCanvas = forwardRef<GameControls, Props>(
  ({ active, reduceMotion, best, onStats, onGameOver }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapRef = useRef<HTMLDivElement>(null)
    const engineRef = useRef<Engine | null>(null)
    const activeRef = useRef(active)
    const pointer = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null)
    const lastTapRef = useRef(0)

    activeRef.current = active

    // Инициализация движка + ресайз
    useEffect(() => {
      const canvas = canvasRef.current
      const wrap = wrapRef.current
      if (!canvas || !wrap) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const engine = new Engine(ctx)
      engine.onStats = onStats
      engine.onGameOver = onGameOver
      engine.setBest(best)
      engine.setReduceMotion(reduceMotion)
      engineRef.current = engine

      const doResize = () => {
        const rect = wrap.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
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

      return () => {
        ro.disconnect()
        document.removeEventListener('visibilitychange', onVisibility)
        engine.stop()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      engineRef.current?.setReduceMotion(reduceMotion)
    }, [reduceMotion])

    useEffect(() => {
      engineRef.current?.setBest(best)
    }, [best])

    // Клавиатура (desktop / spectator)
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const eng = engineRef.current
        if (!eng || !activeRef.current) return
        switch (e.key) {
          case 'ArrowLeft':
          case 'a':
          case 'A':
            eng.moveLeft()
            break
          case 'ArrowRight':
          case 'd':
          case 'D':
            eng.moveRight()
            break
          case 'ArrowUp':
          case 'w':
          case 'W':
          case ' ':
            e.preventDefault()
            eng.jump()
            break
          case 'ArrowDown':
          case 's':
          case 'S':
            eng.slide()
            break
          case 'Shift':
            eng.usePowerup()
            break
        }
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }, [])

    useImperativeHandle(ref, () => ({
      start: (seed: number) => engineRef.current?.start(seed),
      stop: () => engineRef.current?.stop(),
      moveLeft: () => engineRef.current?.moveLeft(),
      moveRight: () => engineRef.current?.moveRight(),
      jump: () => engineRef.current?.jump(),
      slide: () => engineRef.current?.slide(),
      usePowerup: () => engineRef.current?.usePowerup(),
      renderStatic: () => engineRef.current?.renderStatic(),
    }))

    // --- Ввод: свайпы/тапы ---
    const handleDown = (x: number, y: number) => {
      pointer.current = { x, y, t: performance.now(), moved: false }
    }

    const handleMove = (x: number, y: number) => {
      const p = pointer.current
      const eng = engineRef.current
      if (!p || !eng || !activeRef.current) return
      const dx = x - p.x
      const dy = y - p.y
      if (p.moved) return
      if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_THRESHOLD) {
        p.moved = true
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) eng.moveRight()
          else eng.moveLeft()
        } else if (dy < 0) {
          eng.jump()
        } else {
          eng.slide()
        }
      }
    }

    const handleUp = (x: number, y: number) => {
      const p = pointer.current
      const eng = engineRef.current
      pointer.current = null
      if (!p || !eng || !activeRef.current) return
      if (p.moved) return
      // Это тап (без свайпа)
      const now = performance.now()
      if (now - lastTapRef.current < 280) {
        eng.usePowerup()
        lastTapRef.current = 0
        return
      }
      lastTapRef.current = now
      // Тап по левой/правой трети = смена полосы (запасной жест)
      const rect = canvasRef.current?.getBoundingClientRect()
      const w = rect?.width ?? window.innerWidth
      const relX = x - (rect?.left ?? 0)
      const relY = y - (rect?.top ?? 0)
      const h = rect?.height ?? window.innerHeight
      if (relY < h * 0.32) {
        eng.jump()
      } else if (relX < w * 0.34) {
        eng.moveLeft()
      } else if (relX > w * 0.66) {
        eng.moveRight()
      } else {
        eng.jump()
      }
    }

    return (
      <div
        ref={wrapRef}
        style={{
          position: 'absolute',
          inset: 0,
          touchAction: 'none',
          overflow: 'hidden',
        }}
        onPointerDown={(e) => {
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          handleDown(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => handleMove(e.clientX, e.clientY)}
        onPointerUp={(e) => handleUp(e.clientX, e.clientY)}
        onPointerCancel={() => {
          pointer.current = null
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
