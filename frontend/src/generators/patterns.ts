// Seeded PRNG (mulberry32)
export function createRng(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = ReturnType<typeof createRng>

/**
 * 图案只负责描述几何形状，颜色下标指向调色板。
 * 颜色取值、描边宽度、透明度统一由渲染器（renderArtwork）注入，
 * 各图案不再各自拼装这些线条属性。
 */
export type Shape =
  | { type: 'path';   d: string; colorIndex: number }
  | { type: 'line';   x1: string; y1: string; x2: string; y2: string; colorIndex: number }
  | { type: 'circle'; cx: string; cy: string; r: string; colorIndex: number }

export interface PatternContext {
  width: number
  height: number
  iterations: number
  scale: number
  palette: string[]
  rng: Rng
}

export type PatternGenerator = (ctx: PatternContext) => Shape[]

export interface PatternDefinition {
  id: string
  name: string
  generate: PatternGenerator
}

export function generateSpiral(ctx: PatternContext): Shape[] {
  const { width: w, height: h, iterations, scale, rng } = ctx
  const shapes: Shape[] = []
  const cx = w / 2, cy = h / 2
  const arms = 3 + Math.floor(rng() * 5)
  for (let arm = 0; arm < arms; arm++) {
    const offset = (arm / arms) * Math.PI * 2
    let d = ''
    for (let i = 0; i < iterations; i++) {
      const angle = (i / iterations) * Math.PI * 8 + offset
      const r = (i / iterations) * Math.min(w, h) * 0.45 * scale
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)
    }
    shapes.push({ type: 'path', d, colorIndex: arm })
  }
  return shapes
}

export function generateFractal(ctx: PatternContext): Shape[] {
  const { width: w, height: h, iterations, scale, rng } = ctx
  const shapes: Shape[] = []
  const depth = Math.min(8, Math.floor(iterations / 25) + 2)
  function tree(x: number, y: number, angle: number, len: number, d: number) {
    if (d <= 0 || len < 2) return
    const x2 = x + Math.cos(angle) * len
    const y2 = y + Math.sin(angle) * len
    shapes.push({
      type: 'line',
      x1: x.toFixed(1), y1: y.toFixed(1),
      x2: x2.toFixed(1), y2: y2.toFixed(1),
      colorIndex: d,
    })
    const spread = 0.4 + rng() * 0.3
    tree(x2, y2, angle - spread, len * 0.7, d - 1)
    tree(x2, y2, angle + spread, len * 0.7, d - 1)
  }
  tree(w / 2, h * 0.85, -Math.PI / 2, h * 0.25 * scale, depth)
  return shapes
}

export function generateWave(ctx: PatternContext): Shape[] {
  const { width: w, height: h, iterations, scale, rng } = ctx
  const shapes: Shape[] = []
  const layers = Math.min(20, Math.floor(iterations / 10))
  for (let layer = 0; layer < layers; layer++) {
    const freq = 0.005 + rng() * 0.01
    const amp = 30 + rng() * 60 * scale
    const baseY = (layer / layers) * h
    const phase = rng() * Math.PI * 2
    let d = `M0,${baseY.toFixed(1)}`
    for (let x = 0; x <= w; x += 4) {
      const y = baseY + Math.sin(x * freq + phase) * amp + Math.cos(x * freq * 2 + phase) * amp * 0.3
      d += ` L${x},${y.toFixed(1)}`
    }
    shapes.push({ type: 'path', d, colorIndex: layer })
  }
  return shapes
}

export function generateCircles(ctx: PatternContext): Shape[] {
  const { width: w, height: h, iterations, scale, rng } = ctx
  const shapes: Shape[] = []
  for (let i = 0; i < iterations; i++) {
    const cx = rng() * w
    const cy = rng() * h
    const r = 5 + rng() * 80 * scale
    shapes.push({
      type: 'circle',
      cx: cx.toFixed(1), cy: cy.toFixed(1), r: r.toFixed(1),
      colorIndex: i,
    })
  }
  return shapes
}

export function generateNoise(ctx: PatternContext): Shape[] {
  const { width: w, height: h, iterations, scale, rng } = ctx
  const shapes: Shape[] = []
  const step = Math.max(4, Math.floor(20 / scale))
  const cols = Math.floor(w / step)
  const rows = Math.floor(h / step)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (rng() > 0.4) continue
      const x = col * step
      const y = row * step
      const len = 5 + rng() * 15 * scale
      const angle = rng() * Math.PI * 2
      const x2 = x + Math.cos(angle) * len
      const y2 = y + Math.sin(angle) * len
      shapes.push({
        type: 'line',
        x1: `${x}`, y1: `${y}`,
        x2: x2.toFixed(1), y2: y2.toFixed(1),
        colorIndex: row + col,
      })
    }
  }
  return shapes
}

/**
 * 图案注册表：增删图案只改这一处，
 * 画布、侧栏等其余代码自动跟随，无需改动任何其它图案的代码。
 */
export const PATTERNS: Record<string, PatternDefinition> = {
  spiral:  { id: 'spiral',  name: '🌀 螺旋',   generate: generateSpiral },
  fractal: { id: 'fractal', name: '🌳 分形树', generate: generateFractal },
  wave:    { id: 'wave',    name: '🌊 波浪',   generate: generateWave },
  circles: { id: 'circles', name: '⭕ 圆环',   generate: generateCircles },
  noise:   { id: 'noise',   name: '🎲 噪声场', generate: generateNoise },
}

export function getPattern(id: string): PatternDefinition | undefined {
  return PATTERNS[id]
}
