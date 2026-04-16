import { ref, watch } from 'vue'
import { STORAGE_KEYS } from '@/lib/storage'

export type Theme = 'light' | 'dark'

function detectInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.theme)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage might throw in private mode
  }
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
}

const theme = ref<Theme>(detectInitialTheme())
applyTheme(theme.value)

watch(theme, (t) => {
  applyTheme(t)
  try {
    localStorage.setItem(STORAGE_KEYS.theme, t)
  } catch {
    // localStorage might throw in private mode
  }
})

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }
  function set(t: Theme) {
    theme.value = t
  }
  return { theme, toggle, set }
}
