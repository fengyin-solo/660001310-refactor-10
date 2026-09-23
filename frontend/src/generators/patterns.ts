import type { DesignParams, PatternType } from '../types'

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

// 坐标既可以是数字（由各图案自行决定 toFixed 精度），也可以是已格式化好的字符串
type Coord = number | string

/**
 * 共用的绘制上下文：颜色取模、描边宽度、透明度、图元属性顺序全部在这里注入。
 * 各图案只负责算出几何位置并调用 path / line / circle，不再出现任何样式属性。
 */
export interface PatternContext {
  // 统一的颜色取模入口，图案只给出颜色序号
  colorAt: (i: number) => string
  path: (d: string, colorIndex: number) => void
  line: (x1: Coord, y1: Coord, x2: Coord, y2: Coord, colorIndex: number) => void
  circle: (cx: Coord, cy: Coord, r: Coord, colorIndex: number) => void
  // 取出累积的 SVG 图元（仅在拼装层使用）
  output: () => string
}

export interface PatternInput {
  width: number
  height: number
  iterations: number
  scale: number
  rng: Rng
}

export type DrawPattern = (ctx: PatternContext, input: PatternInput) => void

/**
 * 样式注入层：颜色取模、描边宽度、透明度以及图元属性顺序都收拢在这一个函数里。
 * 各图案的 draw 函数对这些属性无感知。
 */
function createContext(palette: string[], strokeWidth: number, opacity: number): PatternContext {
  let out = ''
  const colorAt = (i: number) => palette[i % palette.length]
  return {
    colorAt,
    path: (d, i) => {
      out += `<path d="${d}" fill="none" stroke="${colorAt(i)}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`
    },
    line: (x1, y1, x2, y2, i) => {
      out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colorAt(i)}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`
    },
    circle: (cx, cy, r, i) => {
      out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colorAt(i)}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`
    },
    output: () => out,
  }
}

// ---------------------------------------------------------------------------
// 以下每个图案只负责“算点 + 报颜色序号”，不写任何 stroke / opacity / fill。
// 坐标的 toFixed 精度保持收拢前的原样，以保证最终 SVG 逐字节一致。
// ---------------------------------------------------------------------------

const drawSpiral: DrawPattern = (ctx, { width: w, height: h, iterations, scale, rng }) => {
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
    ctx.path(d, arm)
  }
}

const drawFractal: DrawPattern = (ctx, { width: w, height: h, iterations, scale, rng }) => {
  const depth = Math.min(8, Math.floor(iterations / 25) + 2)
  function tree(x: number, y: number, angle: number, len: number, d: number) {
    if (d <= 0 || len < 2) return
    const x2 = x + Math.cos(angle) * len
    const y2 = y + Math.sin(angle) * len
    ctx.line(x.toFixed(1), y.toFixed(1), x2.toFixed(1), y2.toFixed(1), d)
    const spread = 0.4 + rng() * 0.3
    tree(x2, y2, angle - spread, len * 0.7, d - 1)
    tree(x2, y2, angle + spread, len * 0.7, d - 1)
  }
  tree(w / 2, h * 0.85, -Math.PI / 2, h * 0.25 * scale, depth)
}

const drawWave: DrawPattern = (ctx, { width: w, height: h, iterations, scale, rng }) => {
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
    ctx.path(d, layer)
  }
}

const drawCircles: DrawPattern = (ctx, { width: w, height: h, iterations, scale, rng }) => {
  for (let i = 0; i < iterations; i++) {
    const cx = rng() * w
    const cy = rng() * h
    const r = 5 + rng() * 80 * scale
    ctx.circle(cx.toFixed(1), cy.toFixed(1), r.toFixed(1), i)
  }
}

const drawNoise: DrawPattern = (ctx, { width: w, height: h, scale, rng }) => {
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
      ctx.line(x, y, x2.toFixed(1), y2.toFixed(1), row + col)
    }
  }
}

// ---------------------------------------------------------------------------
// 图案注册表：新增/删除图案只需改这一处（以及对应 draw 函数），
// 拼装层和其它图案的代码都不用动。
// ---------------------------------------------------------------------------

export interface PatternDef {
  id: PatternType
  label: string
  draw: DrawPattern
}

export const PATTERNS: PatternDef[] = [
  { id: 'spiral',  label: '🌀 螺旋',    draw: drawSpiral },
  { id: 'fractal', label: '🌳 分形树', draw: drawFractal },
  { id: 'wave',    label: '🌊 波浪',    draw: drawWave },
  { id: 'circles', label: '⭕ 圆环',    draw: drawCircles },
  { id: 'noise',   label: '🎲 噪声场', draw: drawNoise },
]

const PATTERN_BY_ID = new Map<PatternType, PatternDef>(PATTERNS.map(p => [p.id, p]))

/**
 * 统一拼装层，固定顺序为：先背景图层、再图案图层、最后整体旋转。
 * 线条样式与透明度由内部的 PatternContext 统一注入。
 * 画面展示与导出（SVG / PNG）都使用这里产出的同一份字符串。
 */
export function renderArtwork(params: DesignParams): string {
  const { width, height, pattern, iterations, scale, palette, strokeWidth, opacity, bgColor, rotation, seed } = params
  const def = PATTERN_BY_ID.get(pattern)
  const content = def
    ? (() => {
        const ctx = createContext(palette, strokeWidth, opacity)
        def.draw(ctx, { width, height, iterations, scale, rng: createRng(seed) })
        return ctx.output()
      })()
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${bgColor}"/>
  <g transform="rotate(${rotation},${width / 2},${height / 2})">${content}</g>
</svg>`
}
