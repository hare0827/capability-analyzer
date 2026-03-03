/**
 * SCR-04: 파일 업로드 드롭존
 * 사양서 §4.2
 * - 드래그 앤 드롭 + 클릭 선택
 * - 업로드 즉시 10행 미리보기 + 열 선택
 * - 경고 / 오류 표시
 */
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAnalysisStore } from '@/stores/analysisStore'
import { uploadApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface UploadPreview {
  file_id: string
  filename: string
  detected_format: string
  sheets: string[]
  columns: string[]
  preview: string[][]
  total_rows: number
  clamav_scanned: boolean
  parse_errors: { row: number; content: string; reason: string }[]
  warnings: string[]
}

export default function FileUpload() {
  const { setData, outlierRemoval, setOutlierRemoval } = useAnalysisStore()

  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [preview, setPreview] = useState<UploadPreview | null>(null)
  const [selectedCol, setSelectedCol] = useState(0)
  const [selectedSheet, setSelectedSheet] = useState<string | undefined>()
  const [hasHeader, setHasHeader] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<number | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setError(null)
    setPreview(null)
    setExtracted(null)
    setUploading(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('has_header', String(hasHeader))

      const data: UploadPreview = await uploadApi.preview(fd)
      setPreview(data)
      setSelectedCol(0)
      setSelectedSheet(data.sheets[0])
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(typeof msg === 'string' ? msg : '파일 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }, [hasHeader])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: () => setError('파일을 확인하세요. xlsx, xls, csv / 최대 10 MB'),
  })

  const handleExtract = async () => {
    if (!preview) return
    setExtracting(true)
    setError(null)
    try {
      const result = await uploadApi.extract({
        file_id: preview.file_id,
        column_index: selectedCol,
        sheet_name: selectedSheet,
        has_header: hasHeader,
      })
      setData(result.data)
      setExtracted(result.total_extracted)
    } catch {
      setError('데이터 추출에 실패했습니다.')
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 드롭존 */}
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors',
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/30',
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium text-gray-700">
            {isDragActive ? '파일을 놓으세요' : '파일을 드래그하거나 클릭하여 선택'}
          </p>
          <p className="text-xs text-gray-400">.xlsx / .xls / .csv · 최대 10 MB</p>
        </div>
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            업로드 중...
          </div>
        )}
      </div>

      {/* 오류 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 업로드 완료 후 미리보기 */}
      {preview && (
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4">
          {/* 파일 정보 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge color="blue">{preview.detected_format.toUpperCase()}</Badge>
              <span className="text-sm font-medium">{preview.filename}</span>
              <span className="text-xs text-gray-400">{preview.total_rows}행</span>
            </div>
            {preview.clamav_scanned && <Badge color="green">보안 스캔 완료</Badge>}
          </div>

          {/* 경고 */}
          {preview.warnings.map((w, i) => (
            <div key={i} className="rounded border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs text-yellow-700">
              {w}
            </div>
          ))}

          {/* 파싱 오류 */}
          {preview.parse_errors.length > 0 && (
            <div className="rounded border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              파싱 오류 {preview.parse_errors.length}행 — 분석 진행 시 해당 행은 제외됩니다.
            </div>
          )}

          {/* 시트 선택 */}
          {preview.sheets.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">시트 선택</label>
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm"
              >
                {preview.sheets.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* 열 선택 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">측정값 열 선택</label>
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(Number(e.target.value))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              {preview.columns.map((col, i) => (
                <option key={i} value={i}>{col || `Column${i + 1}`}</option>
              ))}
            </select>
          </div>

          {/* 헤더 옵션 */}
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => setHasHeader(e.target.checked)}
              className="accent-blue-600"
            />
            첫 행을 헤더로 처리
          </label>

          {/* 이상치 제거 */}
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={outlierRemoval}
              onChange={(e) => setOutlierRemoval(e.target.checked)}
              className="accent-blue-600"
            />
            이상치 자동 제거 (IQR × 1.5)
          </label>

          {/* 미리보기 테이블 */}
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {preview.columns.map((col, i) => (
                    <th
                      key={i}
                      className={cn(
                        'px-3 py-2 text-left font-medium text-gray-600',
                        i === selectedCol && 'bg-blue-50 text-blue-700',
                      )}
                    >
                      {col || `Column${i + 1}`}
                      {i === selectedCol && ' ✓'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, ri) => (
                  <tr key={ri} className="border-t border-gray-100">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          'px-3 py-1.5 font-mono text-gray-700',
                          ci === selectedCol && 'bg-blue-50/50',
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 추출 버튼 */}
          <div className="flex items-center gap-3">
            <Button onClick={handleExtract} loading={extracting} size="md">
              데이터 불러오기
            </Button>
            {extracted !== null && (
              <span className="text-sm text-green-600">
                {extracted}개 수치 로드 완료
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
