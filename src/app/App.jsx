import { Music2 } from 'lucide-react'
import MusicApp from './MusicApp.jsx'
import AppLink from './routing/AppLink.jsx'
import useRoute from './routing/useRoute.js'
import AlbumPage from '../pages/album/AlbumPage.jsx'
import HomePage from '../pages/home/HomePage.jsx'
import SearchPage from '../pages/search/SearchPage.jsx'
import '../styles/app.css'

const pages = { home: HomePage, album: AlbumPage, 'liked-songs': AlbumPage, search: SearchPage }

export default function App() {
  const route = useRoute()
  return (
    <>
      {route.page !== 'not-found' ? (
        <MusicApp route={route} page={pages[route.page]} />
      ) : (
        <main className="not-found">
          <Music2 size={42} /><h1>Page not found</h1>
          <AppLink className="btn retry-button" href="/">Back to Home</AppLink>
        </main>
      )}
    </>
  )
}
