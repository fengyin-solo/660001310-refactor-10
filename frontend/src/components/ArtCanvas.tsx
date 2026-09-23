import { useEffect, useRef } from 'react'
import { useDesignStore } from '../store/design'
import { renderArtwork } from '../generators/render'

export default function ArtCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const store = useDesignStore()

  useEffect(() => {
    // 背景 → 图案 → 整体旋转，以及颜色/描边/透明度全部由 renderArtwork 统一装配
    const svg = renderArtwork(store)
    store.setSvgContent(svg)
    if (containerRef.current) {
      containerRef.current.innerHTML = svg
    }
  }, [store.pattern, store.seed, store.iterations, store.scale, store.rotation,
      store.strokeWidth, store.opacity, store.bgColor, store.palette, store.width, store.height])

  return (
    <div
      ref={containerRef}
      className="shadow-2xl rounded border border-gray-700"
      style={{ maxWidth: '100%', maxHeight: '100%', overflow: 'hidden' }}
    />
  )
}
