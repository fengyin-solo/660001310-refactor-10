import type { DesignParams } from '../types'
import { createRng, getPattern, type Shape } from './patterns'

/**
 * 统一的线条属性注入：颜色取模、描边宽度、透明度都只在这里拼装一次，
 * 各图案生成器只产出几何 Shape，不接触这些属性。
 */
function serializeShape(shape: Shape, palette: string[], strokeWidth: number, opacity: number): string {
  const color = palette[shape.colorIndex % palette.length]
  switch (shape.type) {
    case 'path':
      return `<path d="${shape.d}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`
    case 'line':
      return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`
    case 'circle':
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`
  }
}

/**
 * 画面装配的唯一入口，图层顺序固定为：
 *   1. 背景图层（rect）
 *   2. 图案图层（统一注入颜色、描边、透明度）
 *   3. 整体旋转
 * 预览画面与 SVG/PNG 存盘都使用这份输出。
 */
export function renderArtwork(params: DesignParams): string {
  const { width, height, pattern, iterations, scale, palette, strokeWidth, opacity, bgColor, rotation } = params

  const definition = getPattern(pattern)
  const shapes = definition
    ? definition.generate({ width, height, iterations, scale, palette, rng: createRng(params.seed) })
    : []
  const content = shapes.map(s => serializeShape(s, palette, strokeWidth, opacity)).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${bgColor}"/>
  <g transform="rotate(${rotation},${width/2},${height/2})">${content}</g>
</svg>`
}
