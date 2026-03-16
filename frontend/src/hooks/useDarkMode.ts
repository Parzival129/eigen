import { useState, useEffect } from 'react'

export function useDarkMode(): [boolean, () => void] {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('eigen-dark-mode')
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
    localStorage.setItem('eigen-dark-mode', String(isDarkMode))
  }, [isDarkMode])

  const toggle = () => setIsDarkMode((d) => !d)

  return [isDarkMode, toggle]
}
