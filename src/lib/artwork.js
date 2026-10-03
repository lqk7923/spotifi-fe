const palettes = [
  ['#6b3bbd', '#b098e8'], ['#0b716a', '#88d7b2'], ['#a84832', '#edba86'],
  ['#264b97', '#90b8db'], ['#982c65', '#e993b9'], ['#807227', '#d9d58c'],
]

export function artworkColors(track) {
  const hash = [...(track?.trackId || 'music')]
    .reduce((sum, letter) => sum + letter.charCodeAt(0), 0)
  return palettes[hash % palettes.length]
}
