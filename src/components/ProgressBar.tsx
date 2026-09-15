import { formatNumber } from '../lib/format'

type Props = {
  loaded: number
  reportedTotal: number
  threadCount: number
}

export function ProgressBar({
  loaded,
  reportedTotal,
  threadCount,
}: Props) {
  const percent =
    reportedTotal > 0 ? Math.min(100, (loaded / reportedTotal) * 100) : 0

  return (
    <section className="space-y-2" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <h2 className="font-medium text-zinc-200">Load status</h2>
        <span className="tabular-nums text-zinc-400">{percent.toFixed(1)}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label="Comment load progress"
      >
        <div
          className="h-full rounded-full bg-rose-500 transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm text-zinc-400">
        Loaded {formatNumber(loaded)} of {formatNumber(reportedTotal)} reported
        comments. {formatNumber(threadCount)} top-level threads. YouTube’s total
        includes replies.
      </p>
    </section>
  )
}
