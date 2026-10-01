# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Styling and icons

Tailwind CSS is configured through `@tailwindcss/vite`, and daisyUI is enabled
in `src/index.css`. Use Tailwind utilities and daisyUI component classes directly
in JSX. Import icons individually from `lucide-react`:

```jsx
import { Play } from 'lucide-react'

export function PlayButton() {
  return (
    <button type="button" className="btn btn-primary gap-2">
      <Play size={20} aria-hidden="true" />
      Play
    </button>
  )
}
```

Documentation: [Tailwind CSS](https://tailwindcss.com/docs/installation/using-vite),
[daisyUI](https://daisyui.com/docs/install/vite/),
and [Lucide React](https://lucide.dev/guide/react).

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
