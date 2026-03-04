import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/analyze',   label: 'Analyze'   },
  { to: '/history',   label: 'History'   },
]

export default function AppLayout() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f2f4]">
      {/* ── 상단 헤더 (Minitab 스타일 — 검정 바탕) ── */}
      <header className="sticky top-0 z-30 bg-black">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-0">
          {/* 로고 */}
          <NavLink to="/dashboard" className="flex items-center gap-2 py-3 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#0083CA]">
              <span className="text-[11px] font-black text-white tracking-tight">Cp</span>
            </div>
            <div className="leading-none">
              <p className="text-[13px] font-semibold text-white tracking-wide">
                Process Capability Analyzer
              </p>
            </div>
          </NavLink>

          {/* 메뉴 */}
          <nav className="flex items-stretch gap-0 flex-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-4 py-3 text-[13px] font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-[#0083CA] text-white bg-white/5'
                      : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* 로그아웃 */}
          <button
            onClick={() => {
              localStorage.removeItem('access_token')
              navigate('/login')
            }}
            className="py-3 text-[13px] text-gray-400 hover:text-white transition-colors shrink-0"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* 서브 헤더 — 파란 띠 (Minitab 스타일) */}
      <div className="bg-[#0083CA] h-0.5" />

      {/* 콘텐츠 */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white py-2 text-center text-[11px] text-gray-400">
        © 2025 Process Capability Analyzer · Powered by Minitab-compatible SPC engine
      </footer>
    </div>
  )
}
