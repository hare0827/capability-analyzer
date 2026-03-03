/**
 * 보고서 내보내기 드롭다운 메뉴 (사양서 §11)
 * - Excel: POST /api/v1/reports/excel → blob download
 * - PDF:   POST /api/v1/reports/pdf   → blob download
 */
import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { AnalyzeResponse, AnalysisMode, SigmaMethod } from '@/lib/types'

interface ExportMenuProps {
  result: AnalyzeResponse
  mode: AnalysisMode
  usl: number
  lsl: number
  nominal?: number
  subgroupSize: number
  sigmaMethod: SigmaMethod
  data: number[]
}

type ExportFormat = 'excel' | 'pdf'

async function downloadReport(
  format: ExportFormat,
  payload: object,
): Promise<void> {
  const res = await api.post(`/reports/${format}`, payload, {
    responseType: 'blob',
  })

  const mimeMap = {
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf:   'application/pdf',
  }
  const extMap = { excel: 'xlsx', pdf: 'pdf' }

  const blob = new Blob([res.data as BlobPart], { type: mimeMap[format] })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `pca_report.${extMap[format]}`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportMenu({
  result,
  mode,
  usl,
  lsl,
  nominal,
  subgroupSize,
  sigmaMethod,
  data,
}: ExportMenuProps) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState<ExportFormat | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const payload = {
    analysis_id:  result.analysis_id,
    mode,
    usl,
    lsl,
    nominal,
    subgroup_size: subgroupSize,
    sigma_method:  sigmaMethod,
    data,
    cpk:           result.cpk ?? null,
    ppk:           result.ppk ?? null,
    stats:         result.stats,
    warnings:      result.warnings,
  }

  const handleExport = async (format: ExportFormat) => {
    setOpen(false)
    setLoading(format)
    try {
      await downloadReport(format, payload)
      toast.success(`${format.toUpperCase()} 보고서를 다운로드했습니다.`)
    } catch {
      toast.error('보고서 생성에 실패했습니다. 잠시 후 다시 시도하세요.')
    } finally {
      setLoading(null)
    }
  }

  const isLoading = loading !== null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white
                   px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm
                   hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {isLoading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-blue-600" />
            생성 중…
          </>
        ) : (
          <>
            <DownloadIcon />
            내보내기
            <ChevronIcon open={open} />
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200
                     bg-white py-1 shadow-lg"
        >
          <MenuItem
            icon={<ExcelIcon />}
            label="Excel (.xlsx)"
            description="데이터 + 결과 시트"
            onClick={() => handleExport('excel')}
          />
          <MenuItem
            icon={<PdfIcon />}
            label="PDF"
            description="인쇄용 요약 보고서"
            onClick={() => handleExport('pdf')}
          />
        </div>
      )}
    </div>
  )
}

// ── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left
                 hover:bg-blue-50 active:bg-blue-100"
    >
      <span className="shrink-0 text-gray-500">{icon}</span>
      <span>
        <div className="text-sm font-medium text-gray-800">{label}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </span>
    </button>
  )
}

// ── 아이콘 ────────────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 12l-5-5h3V2h4v5h3L8 12z"/>
      <rect x="2" y="13" width="12" height="1.5" rx="0.75"/>
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 16 16" fill="currentColor"
      className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M2 5l6 6 6-6H2z"/>
    </svg>
  )
}

function ExcelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="#217346" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M8 8l4 8m0-8l-4 8M16 8v8"/>
    </svg>
  )
}

function PdfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="#c00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="16" y2="17"/>
    </svg>
  )
}
