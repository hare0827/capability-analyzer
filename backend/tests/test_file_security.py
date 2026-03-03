"""
파일 보안 레이어 단위 테스트 (사양서 §10, §13.2)
"""
import pytest
from app.services.file_security import check_file, _detect_format

# .xlsx 매직 바이트 (PK zip)
XLSX_MAGIC = b"PK\x03\x04" + b"\x00" * 100
# .xls 매직 바이트 (CFBF)
XLS_MAGIC = b"\xd0\xcf\x11\xe0" + b"\x00" * 100
# CSV
CSV_CONTENT = b"measurement,date\n23.1,2026-01-01\n22.9,2026-01-02\n"
# 실행 파일 위장 (.exe 시그니처)
EXE_MAGIC = b"MZ" + b"\x00" * 100


class TestDetectFormat:
    def test_xlsx_magic(self):
        assert _detect_format(XLSX_MAGIC, "data.xlsx") == "xlsx"

    def test_xls_magic(self):
        assert _detect_format(XLS_MAGIC, "data.xls") == "xls"

    def test_csv_by_extension_and_text(self):
        assert _detect_format(CSV_CONTENT, "data.csv") == "csv"

    def test_txt_extension_csv(self):
        assert _detect_format(CSV_CONTENT, "data.txt") == "csv"

    def test_exe_magic_unknown(self):
        assert _detect_format(EXE_MAGIC, "evil.xlsx") == "unknown"

    def test_unknown_binary(self):
        assert _detect_format(b"\x00\x01\x02\x03" * 10, "data.bin") == "unknown"


class TestCheckFile:
    def test_valid_csv_passes(self):
        result = check_file(CSV_CONTENT, "data.csv", "text/csv")
        assert result.ok is True
        assert result.detected_format == "csv"
        assert len(result.sha256) == 64   # SHA-256 hex

    def test_valid_xlsx_passes(self):
        result = check_file(XLSX_MAGIC, "data.xlsx",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        assert result.ok is True
        assert result.detected_format == "xlsx"

    def test_exe_disguised_as_xlsx_rejected(self):
        """실행 파일을 xlsx로 위장한 경우 거부 (§13.3)"""
        result = check_file(EXE_MAGIC, "evil.xlsx",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        assert result.ok is False
        assert any("형식" in e for e in result.errors)

    def test_file_too_large_rejected(self):
        """10 MB 초과 파일 거부"""
        big = b"a" * (10 * 1024 * 1024 + 1)
        result = check_file(big, "big.csv", "text/csv")
        assert result.ok is False
        assert any("크기" in e for e in result.errors)

    def test_invalid_mime_adds_error(self):
        """허용되지 않는 MIME 타입"""
        result = check_file(CSV_CONTENT, "data.csv", "application/pdf")
        # MIME 오류가 있어야 함 (매직 바이트로 csv 인식은 되지만 MIME 오류)
        assert any("MIME" in e for e in result.errors)

    def test_sha256_consistent(self):
        """같은 내용 → 같은 SHA-256"""
        r1 = check_file(CSV_CONTENT, "a.csv", "text/csv")
        r2 = check_file(CSV_CONTENT, "b.csv", "text/csv")
        assert r1.sha256 == r2.sha256

    def test_clamav_unavailable_does_not_fail(self):
        """ClamAV 미기동 시에도 ok=True (경고만)"""
        result = check_file(CSV_CONTENT, "data.csv", "text/csv",
                            clamav_host="127.0.0.1", clamav_port=19999)
        assert result.ok is True
        assert result.clamav_scanned is False
