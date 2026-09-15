import { useMemo, useRef, useState, type FormEvent } from 'react'
import { CommentList } from './components/CommentList'
import { ProgressBar } from './components/ProgressBar'
import { formatDate, formatNumber } from './lib/format'
import { parseVideoId } from './lib/parseVideoId'
import {
  fetchCommentPages,
  fetchVideoMeta,
  isAbortError,
  sortComments,
  YouTubeApiError,
  type Comment,
  type CommentSort,
  type VideoMeta,
} from './lib/youtube'

type Status = 'idle' | 'loading' | 'stopped' | 'complete' | 'error'

export default function App() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [video, setVideo] = useState<VideoMeta | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [sort, setSort] = useState<CommentSort>('likes')
  const [loadedCount, setLoadedCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const sortedComments = useMemo(
    () => sortComments(comments, sort),
    [comments, sort],
  )

  const loading = status === 'loading'

  function stopLoading() {
    abortRef.current?.abort()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (loading) {
      stopLoading()
      return
    }

    const videoId = parseVideoId(url)
    if (!videoId) {
      setStatus('error')
      setError('Paste a YouTube video URL or 11-character video ID.')
      return
    }

    const key = import.meta.env.VITE_YOUTUBE_API_KEY?.trim() ?? ''
    if (!key) {
      setStatus('error')
      setError('Set VITE_YOUTUBE_API_KEY in .env.local and restart the dev server.')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus('loading')
    setError(null)
    setVideo(null)
    setComments([])
    setLoadedCount(0)

    try {
      const meta = await fetchVideoMeta(videoId, key, controller.signal)
      setVideo(meta)

      let indexed = 0
      const nextComments: Comment[] = []

      for await (const page of fetchCommentPages(
        videoId,
        key,
        controller.signal,
      )) {
        nextComments.push(...page)
        indexed += page.reduce(
          (sum, comment) => sum + 1 + comment.replyCount,
          0,
        )
        setComments([...nextComments])
        setLoadedCount(indexed)
      }

      setStatus('complete')
    } catch (err) {
      if (isAbortError(err)) {
        setStatus('stopped')
        return
      }

      const message =
        err instanceof YouTubeApiError
          ? err.message
          : 'Something went wrong while loading comments.'
      setStatus('error')
      setError(message)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Comments Viewer
        </h1>
        <p className="text-sm text-zinc-600">
          Paste a YouTube URL and stream public comments with the Data API.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="video-url">
          YouTube video URL
        </label>
        <input
          id="video-url"
          type="text"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=sjr8L64qfvY"
          autoFocus
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-rose-500"
        />
        <button
          type="submit"
          className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
            loading
              ? 'border border-zinc-300 text-zinc-800 hover:border-zinc-500'
              : 'bg-rose-600 text-white hover:bg-rose-500'
          }`}
        >
          {loading ? 'Stop' : 'Load'}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </p>
      )}

      {status === 'stopped' && (
        <p className="text-sm text-amber-700">Loading stopped.</p>
      )}

      {video && (
        <section className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-3">
          {video.thumbnailUrl && (
            <img
              src={video.thumbnailUrl}
              alt=""
              width={160}
              height={90}
              className="h-[90px] w-40 shrink-0 rounded-md object-cover"
            />
          )}
          <div className="min-w-0">
            <h2 className="text-base font-medium text-zinc-900">{video.title}</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {video.channelTitle}
              {video.publishedAt ? ` · ${formatDate(video.publishedAt)}` : ''}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {formatNumber(video.commentCount)} comments reported
            </p>
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-rose-600 hover:text-rose-500"
            >
              Open on YouTube
            </a>
          </div>
        </section>
      )}

      {status === 'loading' && video && (
        <ProgressBar
          loaded={loadedCount}
          reportedTotal={video.commentCount}
          threadCount={comments.length}
        />
      )}

      {(comments.length > 0 || status === 'complete') && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-zinc-800">Comments</h2>
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label="Sort comments"
            >
              {(
                [
                  ['newest', 'Newest'],
                  ['oldest', 'Oldest'],
                  ['likes', 'Likes'],
                ] as const
              ).map(([value, label]) => {
                const selected = sort === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSort(value)}
                    className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                      selected
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <CommentList comments={sortedComments} />
        </section>
      )}
    </div>
  )
}
