import { Music2 } from 'lucide-react'
import MusicLayout from './components/MusicLayout.jsx'
import AppLink from './components/AppLink.jsx'
import useRoute from './hooks/useRoute.js'
import AlbumPage from './pages/AlbumPage.jsx'
import HomePage from './pages/HomePage.jsx'
import './App.css'

export default function App() {
  const route = useRoute()
  if (route.page !== 'not-found') {
    return <MusicLayout albumId={route.albumId} page={route.page === 'album' ? AlbumPage : HomePage} />
  }

  return (
    <main className="not-found">
      <Music2 size={42} /><h1>Page not found</h1>
      <AppLink className="btn retry-button" href="/">Back to Home</AppLink>
    </main>
  )
}
