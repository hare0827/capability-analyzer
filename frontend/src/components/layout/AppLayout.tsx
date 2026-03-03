import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dashboard',  label: '대시보드' },
  { to: '/analyze',    label: '새 분석' },
  { to: '/history',    label: '분석 이력' },
]

export default function AppLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* 상단 네비게이션 바 */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          {/* 로고 */}
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <span className="rounded-lg bg-blue-600 px-2 py-1 text-sm font-bold text-white">PCA</span>
            <span className="hidden text-sm font-semibold text-gray-700 sm:block">
              Process Capability Analyzer
            </span>
          </NavLink>

          {/* 메뉴 */}
          <nav className="flex items-center gap-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100',
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
            className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 페이지 콘텐츠 */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
