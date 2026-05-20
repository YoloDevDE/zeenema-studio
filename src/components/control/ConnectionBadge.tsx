import { cn } from '@/lib/utils'
import { useConnectionStore } from '@/store/connectionStore'

export function ConnectionBadge() {
  const { status, sceneName } = useConnectionStore()

  const label =
    status === 'connected'
      ? sceneName ?? 'Connected'
      : status === 'connecting'
      ? 'Connecting…'
      : 'Disconnected'

  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
      <span
        className={cn('h-2 w-2 rounded-full', {
          'bg-[var(--color-success)]': status === 'connected',
          'bg-[var(--color-warning)] animate-pulse': status === 'connecting',
          'bg-[var(--color-text-muted)]': status === 'disconnected',
        })}
      />
      {label}
    </div>
  )
}
