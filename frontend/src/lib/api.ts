import axios, { type AxiosRequestConfig } from 'axios'
import type { AnalyzeRequest, AnalyzeResponse } from './types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// ── 요청 인터셉터: JWT 자동 첨부 ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── 응답 인터셉터: 401 시 refresh → 1회 재시도 ──────────────────────────────
let _refreshing = false
let _waitQueue: Array<(token: string | null) => void> = []

function _drainQueue(token: string | null) {
  _waitQueue.forEach((cb) => cb(token))
  _waitQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as AxiosRequestConfig & { _retry?: boolean }

    // 401이고 아직 재시도 전이고 refresh_token이 있을 때만 refresh 시도
    if (
      err.response?.status === 401 &&
      !original._retry &&
      localStorage.getItem('refresh_token')
    ) {
      if (_refreshing) {
        // 이미 refresh 중이면 완료를 기다린 뒤 재시도
        return new Promise((resolve, reject) => {
          _waitQueue.push((token) => {
            if (!token) return reject(err)
            original.headers = original.headers ?? {}
            original.headers['Authorization'] = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      original._retry = true
      _refreshing = true

      try {
        const { data } = await axios.post('/api/v1/auth/refresh', {
          refresh_token: localStorage.getItem('refresh_token'),
        })
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        _drainQueue(data.access_token)
        original.headers = original.headers ?? {}
        original.headers['Authorization'] = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        _drainQueue(null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        _refreshing = false
      }
    }

    // refresh endpoint 자체가 401이거나 그 외 401
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }

    return Promise.reject(err)
  },
)

// ── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    axios
      .post<{ access_token: string; refresh_token: string; expires_in: number }>(
        '/api/v1/auth/login',
        { email, password },
      )
      .then((r) => r.data),

  refresh: (refreshToken: string) =>
    axios
      .post<{ access_token: string; refresh_token: string; expires_in: number }>(
        '/api/v1/auth/refresh',
        { refresh_token: refreshToken },
      )
      .then((r) => r.data),

  me: () => api.get('/auth/me').then((r) => r.data),
}

// ── Analyze API ───────────────────────────────────────────────────────────────
export const analyzeApi = {
  run: (req: AnalyzeRequest) =>
    api.post<AnalyzeResponse>('/analyze', req).then((r) => r.data),
}

// ── Upload API ────────────────────────────────────────────────────────────────
export const uploadApi = {
  preview: (formData: FormData) =>
    api.post('/upload/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  extract: (body: { file_id: string; column_index: number; sheet_name?: string; has_header: boolean }) =>
    api.post('/upload/extract', body).then((r) => r.data),
}

// ── Report API ────────────────────────────────────────────────────────────────
export const reportApi = {
  excel: (payload: object) =>
    api.post('/reports/excel', payload, { responseType: 'blob' }),
  pdf: (payload: object) =>
    api.post('/reports/pdf', payload, { responseType: 'blob' }),
}

// ── History API ───────────────────────────────────────────────────────────────
export const historyApi = {
  list: (page = 1, pageSize = 20) =>
    api.get('/history', { params: { page, page_size: pageSize } }).then((r) => r.data),
  get: (id: string) =>
    api.get(`/history/${id}`).then((r) => r.data),
  delete: (id: string) =>
    api.delete(`/history/${id}`).then((r) => r.data),
}

export default api
