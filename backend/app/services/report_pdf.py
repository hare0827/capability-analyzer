"""
PDF 보고서 생성 서비스 (사양서 §11)
weasyprint: HTML + CSS → PDF

차트 이미지는 포함하지 않는다 (브라우저 렌더링 결과를 캡처하는 것은
서버 사이드에서 불가). 대신 수치 테이블로 완성된 단독 보고서를 생성한다.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.schemas.report import ReportRequest


# ── CSS ──────────────────────────────────────────────────────────────────────
_CSS = """
@page {
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
    @bottom-center {
        content: "PCA Report  ·  Page " counter(page) " / " counter(pages);
        font-size: 9pt;
        color: #888;
    }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", Arial, sans-serif;
       font-size: 10pt; color: #1a1a1a; }
h1 { font-size: 18pt; color: #1F4E79; margin-bottom: 4pt; }
h2 { font-size: 12pt; color: #2E75B6; margin: 14pt 0 4pt; border-bottom: 1.5pt solid #2E75B6;
     padding-bottom: 2pt; }
h3 { font-size: 10pt; color: #404040; margin: 10pt 0 3pt; }
.meta { font-size: 9pt; color: #555; margin-bottom: 8pt; }
table { border-collapse: collapse; width: 100%; margin-bottom: 10pt; }
th { background: #1F4E79; color: #fff; font-weight: bold; padding: 5pt 8pt;
     text-align: left; font-size: 9pt; }
td { padding: 4pt 8pt; font-size: 9pt; border-bottom: 0.5pt solid #ddd; }
tr:nth-child(even) td { background: #F2F7FB; }
.grade { font-weight: bold; padding: 3pt 10pt; border-radius: 4pt; display: inline-block; }
.grade-good  { background: #70AD47; color: #fff; }
.grade-ok    { background: #FFD966; color: #333; }
.grade-poor  { background: #FF0000; color: #fff; }
.warn { background: #FFF2CC; border-left: 3pt solid #F4B400; padding: 4pt 8pt;
        font-size: 9pt; margin: 3pt 0; }
.right { text-align: right; }
"""


# ── 헬퍼 ─────────────────────────────────────────────────────────────────────

def _fmt(v: float, decimals: int = 4) -> str:
    return f"{v:,.{decimals}f}"


def _grade_html(v: float) -> str:
    if v >= 1.67:
        return '<span class="grade grade-good">A+ / A++ (≥1.67)</span>'
    if v >= 1.33:
        return '<span class="grade grade-ok">B / A (1.33 ~ 1.66)</span>'
    return '<span class="grade grade-poor">C / D (< 1.33)</span>'


def _row(label: str, value: str) -> str:
    return f"<tr><td>{label}</td><td class='right'>{value}</td></tr>"


# ── HTML 빌더 ────────────────────────────────────────────────────────────────

def _build_html(req: "ReportRequest") -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    s = req.stats

    # 기술통계 테이블
    stats_rows = "".join([
        _row("데이터 수 (n)",        str(s.n)),
        _row("평균 (Mean)",          _fmt(s.mean)),
        _row("전체 표준편차 (σ)",     _fmt(s.std_overall)),
        _row("최솟값 (Min)",          _fmt(s.min)),
        _row("최댓값 (Max)",          _fmt(s.max)),
        _row("중위값 (Median)",        _fmt(s.median)),
    ])

    # Cpk 테이블
    cpk_section = ""
    if req.cpk:
        c = req.cpk
        cpk_rows = "".join([
            _row("Cpk",                        _fmt(c.cpk, 4)),
            _row("Cp",                         _fmt(c.cp, 4)),
            _row("Cpu (상측)",                  _fmt(c.cpu, 4)),
            _row("Cpl (하측)",                  _fmt(c.cpl, 4)),
            _row("σ̂ 추정 (σ_within)",           _fmt(c.sigma_within, 6)),
            _row("σ 추정 방식",                  c.sigma_method_used.upper()),
            _row("치우침 K",                     _fmt(c.k, 4)),
            _row("불량률 — USL 초과",             f"{c.defect_usl_pct * 100:.4f} %"),
            _row("불량률 — LSL 미달",             f"{c.defect_lsl_pct * 100:.4f} %"),
            _row("불량률 합계",                   f"{c.defect_total_pct * 100:.4f} %"),
            _row("DPMO",                        f"{c.dpmo:,.2f}"),
            _row("Sigma Level",                 _fmt(c.sigma_level, 3)),
        ])
        cpk_section = f"""
        <h2>Cpk 공정능력 지수</h2>
        <table>
          <tbody>{cpk_rows}</tbody>
        </table>
        <p>등급: {_grade_html(c.cpk)}</p>
        """

    # Ppk 테이블
    ppk_section = ""
    if req.ppk:
        p = req.ppk
        ppk_rows = "".join([
            _row("Ppk",                        _fmt(p.ppk, 4)),
            _row("Pp",                         _fmt(p.pp, 4)),
            _row("Ppu (상측)",                  _fmt(p.ppu, 4)),
            _row("Ppl (하측)",                  _fmt(p.ppl, 4)),
            _row("σ 전체 (σ_overall)",          _fmt(p.sigma_overall, 6)),
            _row("불량률 — USL 초과",             f"{p.defect_usl_pct * 100:.4f} %"),
            _row("불량률 — LSL 미달",             f"{p.defect_lsl_pct * 100:.4f} %"),
            _row("불량률 합계",                   f"{p.defect_total_pct * 100:.4f} %"),
            _row("DPMO",                        f"{p.dpmo:,.2f}"),
            _row("Sigma Level",                 _fmt(p.sigma_level, 3)),
        ])
        ppk_section = f"""
        <h2>Ppk 공정성능 지수</h2>
        <table>
          <tbody>{ppk_rows}</tbody>
        </table>
        <p>등급: {_grade_html(p.ppk)}</p>
        """

    # 경고
    warn_html = ""
    if req.warnings:
        warn_items = "".join(f'<div class="warn">⚠ {w}</div>' for w in req.warnings)
        warn_html = f"<h2>경고</h2>{warn_items}"

    nominal_str = _fmt(req.nominal) if req.nominal is not None else "—"
    mode_label = {"cpk": "Cpk (공정능력)", "ppk": "Ppk (공정성능)", "dual": "Dual (Cpk + Ppk)"}.get(req.mode, req.mode)

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>{_CSS}</style>
</head>
<body>
  <h1>PCA 공정능력 분석 보고서</h1>
  <p class="meta">
    분석 ID: <strong>{req.analysis_id}</strong> &nbsp;|&nbsp;
    모드: <strong>{mode_label}</strong> &nbsp;|&nbsp;
    생성: {now}
  </p>

  <h2>규격 (Specification)</h2>
  <table>
    <tbody>
      {_row("USL (상한 규격)", _fmt(req.usl))}
      {_row("LSL (하한 규격)", _fmt(req.lsl))}
      {_row("공차 (USL - LSL)", _fmt(req.usl - req.lsl))}
      {_row("Nominal (목표값)", nominal_str)}
    </tbody>
  </table>

  <h2>기술통계 (Descriptive Statistics)</h2>
  <table>
    <tbody>{stats_rows}</tbody>
  </table>

  {cpk_section}
  {ppk_section}
  {warn_html}
</body>
</html>"""


# ── 공개 API ─────────────────────────────────────────────────────────────────

def generate_pdf(req: "ReportRequest") -> bytes:
    """
    ReportRequest → PDF bytes (weasyprint).
    """
    from weasyprint import HTML, CSS  # 로컬 임포트 — 시작 오버헤드 격리

    html_str = _build_html(req)
    pdf = HTML(string=html_str).write_pdf(
        stylesheets=[CSS(string=_CSS)],
    )
    return pdf
