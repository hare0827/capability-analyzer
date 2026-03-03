/**
 * SCR-01: 로그인 페이지
 * POST /api/v1/auth/login 연동 (사양서 §10)
 */
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await authApi.login(email, password)
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      navigate('/dashboard')
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? '로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="rounded-xl bg-blue-600 px-4 py-2 text-2xl font-bold text-white">
            PCA
          </span>
          <p className="text-sm text-gray-500">Process Capability Analyzer</p>
        </div>

        {/* 로그인 카드 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-6 text-lg font-semibold text-gray-900">로그인</h1>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="engineer@pca.local"
              autoComplete="email"
              required
            />
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
              로그인
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
