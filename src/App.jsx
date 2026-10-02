import { Music2 } from 'lucide-react'
import HomePage from './pages/HomePage.jsx'
import './App.css'

export default function App() {
  const isHome = ['/home', '/home/'].includes(window.location.pathname)
  if (isHome) return <HomePage />

  return (
    <main className="not-found">
      <Music2 size={42} /><h1>Page not found</h1>
      <a className="btn retry-button" href="/home">Back to your music</a>
    </main>
  )
}
