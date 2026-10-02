import { navigate } from '../lib/navigation.js'

export default function AppLink({ href, onClick, children, ...props }) {
  return (
    <a href={href} {...props} onClick={(event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey || props.target || props.download != null) return
      onClick?.(event)
      if (event.defaultPrevented) return
      event.preventDefault()
      navigate(href)
    }}>
      {children}
    </a>
  )
}
