export default function normalizeUrl(url: string) {
  url = url.trim()
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return new URL(url)
  }
  return new URL(`http://${url}`)
}
