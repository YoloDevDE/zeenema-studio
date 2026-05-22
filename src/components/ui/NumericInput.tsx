import { useRef, useState, useCallback } from 'react'

interface NumericInputProps {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  decimals?: number
  steps?: number[]
  className?: string
}

export function NumericInput({
  value,
  onChange,
  step = 1,
  min,
  max,
  decimals = 2,
  className = '',
}: NumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const dragStartX = useRef<number | null>(null)
  const dragStartValue = useRef(0)
  const dragged = useRef(false)
  const dragAccum = useRef(0)

  const clamp = useCallback((v: number) => {
    if (min !== undefined && v < min) v = min
    if (max !== undefined && v > max) v = max
    return v
  }, [min, max])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    if (editing) return
    e.preventDefault()
    dragStartX.current = e.clientX
    dragStartValue.current = value
    dragged.current = false
    dragAccum.current = 0

    const onMove = (me: MouseEvent) => {
      if (dragStartX.current === null) return
      const dx = me.clientX - dragStartX.current
      if (Math.abs(dx) > 3) dragged.current = true
      if (!dragged.current) return
      // Shift = fine (0.1x), Ctrl = coarse (10x)
      const multiplier = me.shiftKey ? 0.1 : me.ctrlKey ? 10 : 1
      dragAccum.current = dx * step * multiplier
      const next = parseFloat((dragStartValue.current + dragAccum.current).toFixed(decimals))
      onChange(clamp(next))
    }

    const onUp = () => {
      if (!dragged.current) {
        // No drag → enter edit mode
        setEditing(true)
        setEditValue(value.toFixed(decimals))
        setTimeout(() => {
          inputRef.current?.select()
        }, 0)
      }
      dragStartX.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [editing, value, step, decimals, onChange, clamp])

  const commitEdit = useCallback(() => {
    const v = parseFloat(editValue)
    if (!isNaN(v)) onChange(clamp(v))
    setEditing(false)
  }, [editValue, onChange, clamp])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setEditing(false) }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const mult = e.shiftKey ? 10 : e.ctrlKey ? 0.1 : 1
      const next = parseFloat((value + step * mult).toFixed(decimals))
      onChange(clamp(next))
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const mult = e.shiftKey ? 10 : e.ctrlKey ? 0.1 : 1
      const next = parseFloat((value - step * mult).toFixed(decimals))
      onChange(clamp(next))
    }
  }, [commitEdit, value, step, decimals, onChange, clamp])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={editValue}
        step={step}
        min={min}
        max={max}
        autoFocus
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={handleKeyDown}
        className={`h-6 w-full rounded border border-[var(--color-accent)] bg-[var(--color-surface-2)] text-xs tabular-nums outline-none text-[var(--color-text)] text-center px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
      />
    )
  }

  return (
    <div
      className={`h-6 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs tabular-nums text-[var(--color-text)] text-center px-1 flex items-center justify-center cursor-ew-resize select-none hover:border-[var(--color-accent)]/60 transition-colors ${className}`}
      onMouseDown={handleMouseDown}
      title="Drag to change · Click to type · Shift=fine · Ctrl=coarse"
    >
      {value.toFixed(decimals)}
    </div>
  )
}
