const API_BASE = 'https://www.googleapis.com/youtube/v3'
const PAGE_SIZE = 100
const PAGE_DELAY_MS = 75

export type YouTubeErrorReason =
  | 'quotaExceeded'
  | 'commentsDisabled'
  | 'videoNotFound'
  | 'invalidKey'
  | 'unknown'

export class YouTubeApiError extends Error {
  readonly reason: YouTubeErrorReason
  readonly status: number | undefined

  constructor(message: string, reason: YouTubeErrorReason, status?: number) {
    super(message)
    this.name = 'YouTubeApiError'
    this.reason = reason
    this.status = status
  }
}

export type VideoMeta = {
  id: string
  title: string
  channelTitle: string
  commentCount: number
  publishedAt: string
  thumbnailUrl: string | undefined
}

export type Comment = {
  id: string
  author: string
  authorChannelUrl: string | undefined
  authorProfileImageUrl: string | undefined
  text: string
  likeCount: number
  publishedAt: string
  replyCount: number
  replies: Comment[]
}

export type CommentSort = 'newest' | 'oldest' | 'likes'

export function sortComments(
  comments: Comment[],
  sort: CommentSort,
): Comment[] {
  const next = [...comments]
  switch (sort) {
    case 'likes':
      next.sort(
        (a, b) =>
          b.likeCount - a.likeCount ||
          b.publishedAt.localeCompare(a.publishedAt),
      )
      break
    case 'oldest':
      next.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
      break
    case 'newest':
      next.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      break
  }
  return next
}

type GoogleErrorPayload = {
  error?: {
    code?: number
    message?: string
    status?: string
    errors?: Array<{ reason?: string; message?: string }>
  }
}

type VideosListResponse = {
  items?: Array<{
    id: string
    snippet?: {
      title?: string
      channelTitle?: string
      publishedAt?: string
      thumbnails?: {
        medium?: { url?: string }
        default?: { url?: string }
      }
    }
    statistics?: {
      commentCount?: string
    }
  }>
}

type CommentSnippet = {
  authorDisplayName?: string
  authorChannelUrl?: string
  authorProfileImageUrl?: string
  textDisplay?: string
  textOriginal?: string
  likeCount?: number
  publishedAt?: string
}

type CommentThreadsListResponse = {
  nextPageToken?: string
  items?: Array<{
    id: string
    snippet?: {
      totalReplyCount?: number
      topLevelComment?: {
        id?: string
        snippet?: CommentSnippet
      }
    }
    replies?: {
      comments?: Array<{
        id: string
        snippet?: CommentSnippet
      }>
    }
  }>
}

function mapGoogleError(payload: unknown, status: number): YouTubeApiError {
  const body = payload as GoogleErrorPayload
  const error = body.error
  const firstReason = error?.errors?.[0]?.reason ?? error?.status ?? ''
  const message = error?.message ?? 'YouTube API request failed'

  if (firstReason === 'quotaExceeded' || firstReason === 'dailyLimitExceeded') {
    return new YouTubeApiError(
      'YouTube API quota exceeded. Try again after midnight Pacific Time.',
      'quotaExceeded',
      status,
    )
  }

  if (firstReason === 'commentsDisabled') {
    return new YouTubeApiError(
      'Comments are disabled on this video.',
      'commentsDisabled',
      status,
    )
  }

  if (firstReason === 'videoNotFound' || status === 404) {
    return new YouTubeApiError(
      'Video not found. Check the URL and try again.',
      'videoNotFound',
      status,
    )
  }

  if (
    firstReason === 'keyInvalid' ||
    firstReason === 'API_KEY_INVALID' ||
    /api key/i.test(message)
  ) {
    return new YouTubeApiError(
      'Invalid YouTube API key. Check VITE_YOUTUBE_API_KEY in .env.local.',
      'invalidKey',
      status,
    )
  }

  return new YouTubeApiError(message, 'unknown', status)
}

async function youtubeGet<T>(
  path: string,
  params: Record<string, string>,
  apiKey: string,
  signal: AbortSignal | undefined,
): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`)
  url.searchParams.set('key', apiKey)
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value)
  }

  const response = await fetch(url, { signal })
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw mapGoogleError(payload, response.status)
  }

  return payload as T
}

export async function fetchVideoMeta(
  videoId: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<VideoMeta> {
  const data = await youtubeGet<VideosListResponse>(
    'videos',
    { part: 'snippet,statistics', id: videoId },
    apiKey,
    signal,
  )

  const item = data.items?.[0]
  if (!item) {
    throw new YouTubeApiError(
      'Video not found. Check the URL and try again.',
      'videoNotFound',
    )
  }

  const commentCount = Number(item.statistics?.commentCount ?? 0)

  return {
    id: item.id,
    title: item.snippet?.title ?? '(untitled)',
    channelTitle: item.snippet?.channelTitle ?? '',
    commentCount: Number.isFinite(commentCount) ? commentCount : 0,
    publishedAt: item.snippet?.publishedAt ?? '',
    thumbnailUrl:
      item.snippet?.thumbnails?.medium?.url ??
      item.snippet?.thumbnails?.default?.url,
  }
}

function convertSnippet(id: string, snippet: CommentSnippet | undefined): Comment {
  return {
    id,
    author: snippet?.authorDisplayName ?? 'Unknown',
    authorChannelUrl: snippet?.authorChannelUrl,
    authorProfileImageUrl: snippet?.authorProfileImageUrl,
    text: snippet?.textOriginal ?? snippet?.textDisplay ?? '',
    likeCount: snippet?.likeCount ?? 0,
    publishedAt: snippet?.publishedAt ?? '',
    replyCount: 0,
    replies: [],
  }
}

function convertThread(
  thread: NonNullable<CommentThreadsListResponse['items']>[number],
): Comment {
  const top = convertSnippet(
    thread.snippet?.topLevelComment?.id ?? thread.id,
    thread.snippet?.topLevelComment?.snippet,
  )
  const replies = (thread.replies?.comments ?? []).map((reply) =>
    convertSnippet(reply.id, reply.snippet),
  )

  return {
    ...top,
    replyCount: thread.snippet?.totalReplyCount ?? replies.length,
    replies,
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      return
    }

    const timer = setTimeout(resolve, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export async function* fetchCommentPages(
  videoId: string,
  apiKey: string,
  signal?: AbortSignal,
): AsyncGenerator<Comment[]> {
  let pageToken = ''

  while (true) {
    const data = await youtubeGet<CommentThreadsListResponse>(
      'commentThreads',
      {
        part: 'snippet,replies',
        videoId,
        maxResults: String(PAGE_SIZE),
        order: 'time',
        textFormat: 'plainText',
        ...(pageToken ? { pageToken } : {}),
      },
      apiKey,
      signal,
    )

    yield (data.items ?? []).map(convertThread)

    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
    await delay(PAGE_DELAY_MS, signal)
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
