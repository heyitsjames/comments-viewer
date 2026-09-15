const VIDEO_ID_PATTERN = /(?:v=|youtu\.be\/|shorts\/|live\/|embed\/)([\w-]{11})/
const FALLBACK_PATTERN = /([\w-]{11})$/

export function parseVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const match = VIDEO_ID_PATTERN.exec(trimmed) ?? FALLBACK_PATTERN.exec(trimmed)
  return match?.[1] ?? null
}
