import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard', label: '대시보드', icon: '⬡' },
  { to: '/analyze',   label: '새 분석',  icon: '◈' },
  { to: '/history',   label: '분석 이력', icon: '◎' },
]

export default function AppLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' }}>
      {/* 상단 헤더 — 다크 슬레이트 */}
      <header
        className="sticky top-0 z-30 border-b border-slate-700/50"
        style={{
          background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 60%, #1e3a5f 100%)',
          boxShadow: '0 2px 16px rgba(15,23,42,0.4)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          {/* 로고 */}
          <NavLink to="/dashboard" className="flex items-center gap-3 group">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}
            >
              Cp
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-white leading-none">
                Process Capability
              </p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">Analyzer</p>
            </div>
          </NavLink>

          {/* 메뉴 */}
          <nav className="flex items-center gap-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* 로그아웃 */}
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 페이지 콘텐츠 */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Outlet />
      </main>

      {/* 하단 푸터 */}
      <footer className="border-t border-slate-200 py-3 text-center text-xs text-slate-400">
        Process Capability Analyzer · Statistical Quality Control
      </footer>
    </div>
  )
}
