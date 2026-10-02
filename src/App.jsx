import { Music2 } from 'lucide-react'
import MusicLayout from './components/MusicLayout.jsx'
import AppLink from './components/AppLink.jsx'
import useRoute from './hooks/useRoute.js'
import './App.css'

export default function App() {
  const route = useRoute()
  if (route.page !== 'not-found') return <MusicLayout albumId={route.albumId} />

  return (
    <main className="not-found">
      <Music2 size={42} /><h1>Page not found</h1>
      <AppLink className="btn retry-button" href="/">Back to Home</AppLink>
    </main>
  )
}
