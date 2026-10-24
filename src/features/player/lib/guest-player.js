// Guest controls can request sign-in, but never create audio or sign media URLs.
export function createGuestPlayer(tracks, requestLogin) {
  const prompt = track => requestLogin(track || tracks[0] || null)
  return {
    currentTrack: null, isPlaying: false, isLoading: false, error: '',
    position: 0, duration: 0, shuffle: false,
    startTrack: prompt,
    selectTrack: prompt,
    togglePlayback: () => prompt(),
    setShuffle: () => prompt(),
  }
}
