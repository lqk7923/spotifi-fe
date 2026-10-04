import { useState } from 'react'

export default function useLibraryFilters(albumId) {
  const [filters, setFilters] = useState({ scope: albumId, search: '', likedOnly: false })
  const search = filters.scope === albumId ? filters.search : ''
  const likedOnly = filters.scope === albumId ? filters.likedOnly : false

  return {
    search, likedOnly,
    setSearch: value => setFilters({ scope: albumId, search: value, likedOnly }),
    resetFilters: () => setFilters({ scope: undefined, search: '', likedOnly: false }),
    showLiked: () => setFilters({ scope: undefined, search: '', likedOnly: !likedOnly }),
  }
}
