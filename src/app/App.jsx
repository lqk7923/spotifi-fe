import { Music2 } from 'lucide-react'
import MusicApp from './MusicApp.jsx'
import AppLink from './routing/AppLink.jsx'
import useRoute from './routing/useRoute.js'
import AlbumPage from '../pages/album/AlbumPage.jsx'
import HomePage from '../pages/home/HomePage.jsx'
import '../styles/app.css'

export default function App() {
  const route = useRoute()
  if (route.page !== 'not-found') {
    return <MusicApp albumId={route.albumId} page={route.page === 'album' ? AlbumPage : HomePage} />
  }

  return (
    <main className="not-found">
      <Music2 size={42} /><h1>Page not found</h1>
      <AppLink className="btn retry-button" href="/">Back to Home</AppLink>
    </main>
  )
}
