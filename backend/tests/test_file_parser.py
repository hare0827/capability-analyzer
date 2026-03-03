"""
파일 파서 단위 테스트 (사양서 §4.2, §13.2)
"""
import io
import csv
import pytest
from app.services.file_parser import (
    parse_file, extract_column, _decode_csv, _parse_csv
)

# ── CSV 픽스처 ────────────────────────────────────────────────────────────────

CSV_BASIC = (
    "measurement,date,operator\n"
    "23.1,2026-01-01,Kim\n"
    "22.9,2026-01-02,Lee\n"
    "23.5,2026-01-03,Kim\n"
    "N/A,2026-01-04,Lee\n"       # 변환 실패 행
    "23.2,2026-01-05,Kim\n"
    ",2026-01-06,Lee\n"           # 빈 셀
    "22.8,2026-01-07,Kim\n"
).encode("utf-8")

CSV_NO_HEADER = (
    "23.1\n22.9\n23.5\n23.2\n22.8\n"
).encode("utf-8")

CSV_CP949 = "측정값\n23.1\n22.9\n".encode("cp949")


class TestDecodeCSV:
    def test_utf8(self):
        text = _decode_csv(b"hello")
        assert text == "hello"

    def test_cp949(self):
        text = _decode_csv("측정".encode("cp949"))
        assert "측정" in text

    def test_utf8_bom(self):
        bom = b"\xef\xbb\xbf" + b"col\n1.0\n"
        text = _decode_csv(bom)
        assert text.startswith("col")


class TestParseCSV:
    def test_columns_from_header(self):
        result = parse_file(CSV_BASIC, "data.csv", "csv", has_header=True)
        assert result.columns == ["measurement", "date", "operator"]

    def test_preview_max_10_rows(self):
        result = parse_file(CSV_BASIC, "data.csv", "csv", has_header=True)
        assert len(result.preview) <= 10

    def test_total_rows_excludes_header(self):
        result = parse_file(CSV_BASIC, "data.csv", "csv", has_header=True)
        assert result.total_rows == 7   # 헤더 제외 7행

    def test_no_header_auto_column_names(self):
        result = parse_file(CSV_NO_HEADER, "data.csv", "csv", has_header=False)
        assert result.columns == ["Column1"]

    def test_sheets_is_sheet1(self):
        result = parse_file(CSV_BASIC, "data.csv", "csv", has_header=True)
        assert result.sheets == ["Sheet1"]


class TestExtractColumn:
    def test_valid_numbers_extracted(self):
        result = extract_column(CSV_BASIC, "csv", column_index=0, has_header=True)
        # N/A 1개 오류, 빈셀 1개 스킵 → 5개 성공
        assert len(result.data) == 5
        assert 23.1 in result.data

    def test_parse_error_for_na(self):
        result = extract_column(CSV_BASIC, "csv", column_index=0, has_header=True)
        assert len(result.parse_errors) == 1
        assert result.parse_errors[0].content == "N/A"

    def test_empty_cell_skipped(self):
        result = extract_column(CSV_BASIC, "csv", column_index=0, has_header=True)
        assert result.skipped_count == 1

    def test_column_index_out_of_range_skipped(self):
        result = extract_column(CSV_BASIC, "csv", column_index=99, has_header=True)
        assert result.data == []
        assert result.skipped_count == 7

    def test_no_header_mode(self):
        result = extract_column(CSV_NO_HEADER, "csv", column_index=0, has_header=False)
        assert len(result.data) == 5

    def test_cp949_csv(self):
        result = extract_column(CSV_CP949, "csv", column_index=0, has_header=True)
        # 헤더 "측정값" 제외, 데이터 2행
        assert len(result.data) == 2
        assert 23.1 in result.data


class TestUnsupportedFormat:
    def test_unknown_format_raises(self):
        with pytest.raises(ValueError, match="지원하지 않는"):
            parse_file(b"data", "data.bin", "unknown")
