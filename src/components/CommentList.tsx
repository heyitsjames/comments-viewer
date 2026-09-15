import type { Comment } from '../lib/youtube'
import { CommentItem } from './CommentItem'

type Props = {
  comments: Comment[]
}

export function CommentList({ comments }: Props) {
  if (comments.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No comments loaded yet.</p>
    )
  }

  return (
    <ul className="divide-y divide-zinc-200">
      {comments.map((comment) => (
        <li key={comment.id} className="py-4 first:pt-0">
          <CommentItem comment={comment} />
        </li>
      ))}
    </ul>
  )
}
