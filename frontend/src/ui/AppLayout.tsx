import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

function getInitialTheme(): Exclude<Theme, 'system'> {
  // 1) Ako je ručno podešeno ranije -> koristi to
  const saved = localStorage.getItem('theme') as Theme | null
  if (saved && saved !== 'system') return saved

  // 2) U suprotnom poštuj sistemski
  const prefersDark = window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

function applyTheme(t: Exclude<Theme, 'system'>) {
  const root = document.documentElement
  if (t === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<Exclude<Theme, 'system'>>(getInitialTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    // Sync na mount-u + osluškuj promjenu sistemskog moda
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handle = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('theme') as Theme | null
      if (!saved || saved === 'system') {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener?.('change', handle)
    return () => mq.removeEventListener?.('change', handle)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const navItems = [
    { path: '/', label: 'Početna' },
    { path: '/documents', label: 'Dokumenti' },
    { path: '/chat', label: 'Chat' },
    { path: '/settings', label: 'Podešavanja' },
  ]

  const cycleTheme = () => {
    // Light <-> Dark (možeš dodati i 'system' ako želiš trostruki toggle)
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  return (
    <div className="min-h-dvh
      bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]
      from-slate-50 via-slate-50 to-slate-100
      dark:from-slate-900 dark:via-slate-900 dark:to-slate-950
      text-slate-900 dark:text-slate-100"
    >
      {/* Sticky, glassy top bar */}
      <nav className="sticky top-0 z-40 backdrop-blur-md
        bg-white/70 dark:bg-slate-900/70
        border-b border-slate-200/70 dark:border-slate-800/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr
                from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20
                grid place-items-center"
              >
                <span className="text-white font-bold text-lg">MR</span>
              </div>
              <div className="leading-tight">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-clip-text text-transparent
                  bg-gradient-to-r from-slate-900 to-slate-700
                  dark:from-white dark:to-slate-300"
                >
                  Multi-agentski RAG
                </h1>
                <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
                  Sistem za prošireno pretraživanje i kolaborativne agente
                </p>
              </div>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }: { isActive: boolean }) =>
                      [
                        'px-3 py-2 text-sm font-medium rounded-md transition-all',
                        'hover:text-slate-900 hover:bg-slate-100/70',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                        'dark:hover:text-white dark:hover:bg-slate-800/60',
                        isActive
                          ? 'text-slate-900 bg-slate-100/80 shadow-[inset_0_-2px_0_0_rgba(59,130,246,.5)] dark:text-white dark:bg-slate-800/70'
                          : 'text-slate-600 dark:text-slate-300'
                      ].join(' ')
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>

              {/* Theme toggle */}
              <button
                onClick={cycleTheme}
                title={theme === 'dark' ? 'Prebaci na svijetli način' : 'Prebaci na tamni način'}
                className="ml-2 rounded-lg p-2 text-sm font-medium
                  text-slate-700 hover:text-slate-900 hover:bg-slate-100/70
                  dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800/60
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                aria-label="Promijeni temu"
              >
                {/* Ikone bez dodatnih paketa */}
                {theme === 'dark' ? (
                  // Sun
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="4" strokeWidth="2" />
                    <path strokeWidth="2" d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l-1.5-1.5M20.5 20.5L19 19M5 19l-1.5 1.5M20.5 3.5L19 5" />
                  </svg>
                ) : (
                  // Moon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeWidth="2" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="ml-1 rounded-lg px-3 py-2 text-sm font-medium
                  text-slate-700 hover:text-slate-900 hover:bg-slate-100/70
                  dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800/60
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                Odjavi se
              </button>
            </div>

            {/* Mobile toggle */}
            <div className="md:hidden flex items-center gap-2">
              {/* Theme on mobile */}
              <button
                onClick={cycleTheme}
                aria-label="Promijeni temu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border
                  border-slate-300/60 bg-white/60 hover:bg-white transition
                  dark:border-slate-700/60 dark:bg-slate-900/60 dark:hover:bg-slate-800"
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="4" strokeWidth="2" />
                    <path strokeWidth="2" d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l-1.5-1.5M20.5 20.5L19 19M5 19l-1.5 1.5M20.5 3.5L19 5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeWidth="2" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Otvori meni"
                aria-expanded={mobileOpen}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border
                  border-slate-300/60 bg-white/60 hover:bg-white transition
                  dark:border-slate-700/60 dark:bg-slate-900/60 dark:hover:bg-slate-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  {mobileOpen ? (
                    <path strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeWidth="2" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200/70 dark:border-slate-800/70
            bg-white/80 dark:bg-slate-900/80 backdrop-blur"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }: { isActive: boolean }) =>
                    [
                      'block w-full rounded-md px-3 py-2 text-sm font-medium',
                      'hover:bg-slate-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                      'dark:hover:bg-slate-800/60',
                      isActive
                        ? 'text-slate-900 bg-slate-100/80 dark:text-white dark:bg-slate-800/70'
                        : 'text-slate-600 dark:text-slate-300'
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              <button
                onClick={() => {
                  setMobileOpen(false)
                  handleLogout()
                }}
                className="mt-1 w-full text-left rounded-md px-3 py-2 text-sm font-medium
                  text-slate-700 hover:bg-slate-100/80
                  dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                Odjavi se
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800
          bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm shadow-sm p-4 sm:p-6 lg:p-8"
        >
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800/80
        bg-white/70 dark:bg-slate-900/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 text-center text-sm text-slate-600 dark:text-slate-300">
            Multi-Agentni Sistem za Prošireno Pretraživanje — <span className="font-medium">MULTI-RAG</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
