import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage    from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import AnalyzePage  from '@/pages/AnalyzePage'
import ResultPage   from '@/pages/ResultPage'
import HistoryPage  from '@/pages/HistoryPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

// 간단한 인증 가드 (Phase 5에서 JWT 검증으로 교체)
function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('access_token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="analyze"   element={<AnalyzePage />} />
            <Route path="result"    element={<ResultPage />} />
            <Route path="history"   element={<HistoryPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  )
}
