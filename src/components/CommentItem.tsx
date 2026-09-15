import { useState } from 'react'
import { formatCompact, formatDate } from '../lib/format'
import type { Comment } from '../lib/youtube'

type Props = {
  comment: Comment
  nested?: boolean
}

export function CommentItem({ comment, nested = false }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [repliesCollapsed, setRepliesCollapsed] = useState(false)
  const hasReplies = !nested && comment.replies.length > 0
  const replyLabel =
    comment.replyCount === 1 ? '1 reply' : `${comment.replyCount} replies`
  const showingNote =
    hasReplies && comment.replies.length < comment.replyCount
      ? ` · showing ${comment.replies.length}`
      : ''

  const author = comment.authorChannelUrl ? (
    <a
      href={comment.authorChannelUrl}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-zinc-100 hover:underline"
    >
      {comment.author}
    </a>
  ) : (
    <span className="font-medium text-zinc-100">{comment.author}</span>
  )

  return (
    <article
      className={`flex gap-3 ${nested ? '' : '[content-visibility:auto] [contain-intrinsic-size:auto_7rem]'}`}
    >
      <button
        type="button"
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand comment' : 'Collapse comment'}
        onClick={() => setCollapsed((value) => !value)}
        className="mt-1 flex size-5 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
      >
        <Chevron expanded={!collapsed} />
      </button>
      {comment.authorProfileImageUrl ? (
        <img
          src={comment.authorProfileImageUrl}
          alt=""
          width={nested ? 28 : 40}
          height={nested ? 28 : 40}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`shrink-0 rounded-full bg-zinc-800 ${nested ? 'size-7' : 'size-10'}`}
        />
      ) : (
        <div
          className={`shrink-0 rounded-full bg-zinc-800 ${nested ? 'size-7' : 'size-10'}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
          {author}
          {comment.publishedAt && (
            <time
              dateTime={comment.publishedAt}
              className="text-zinc-500"
              title={comment.publishedAt}
            >
              {formatDate(comment.publishedAt)}
            </time>
          )}
          {collapsed && (
            <span className="text-xs text-zinc-500">
              {formatCompact(comment.likeCount)} likes
              {!nested && comment.replyCount > 0 ? ` · ${replyLabel}` : ''}
            </span>
          )}
        </div>
        {!collapsed && (
          <>
            <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-200">
              {comment.text}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-zinc-500">
              <span>{formatCompact(comment.likeCount)} likes</span>
              {hasReplies && (
                <button
                  type="button"
                  aria-expanded={!repliesCollapsed}
                  onClick={() => setRepliesCollapsed((value) => !value)}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  {repliesCollapsed ? `Show ${replyLabel}` : `Hide ${replyLabel}`}
                  {showingNote}
                </button>
              )}
              {!nested && !hasReplies && comment.replyCount > 0 && (
                <span>
                  {replyLabel}
                  {showingNote}
                </span>
              )}
            </div>
            {hasReplies && !repliesCollapsed && (
              <div className="mt-3 space-y-3 border-l border-zinc-800 pl-3">
                {comment.replies.map((reply) => (
                  <CommentItem key={reply.id} comment={reply} nested />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </article>
  )
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={`size-4 transition-transform ${expanded ? '' : '-rotate-90'}`}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}
