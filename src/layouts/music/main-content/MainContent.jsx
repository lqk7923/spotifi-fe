import { useEffect } from 'react'
import ScrollArea from '../../../components/ui/ScrollArea.jsx'

export default function MainContent({ scrollRef, resetKey, className = '', style, busy = false, header, children }) {
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [resetKey, scrollRef])

  return (
    <main className={`main-content ${className}`} style={style} aria-busy={busy}>
      {header}
      <ScrollArea scrollRef={scrollRef} className="main-scroll" contentClassName="main-page" label="Page content">
        {children}
      </ScrollArea>
    </main>
  )
}
