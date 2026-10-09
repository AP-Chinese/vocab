"""Convert Knowt flashcard PDF exports in data/source/ into data/vocab.csv.

Each PDF is one topic. Files are processed in filename order (e.g. 01-school.pdf),
and the topic name comes from the PDF title (e.g. "School 学校").

Usage: python3 scripts/pdf_to_csv.py
Requires poppler-utils (pdftotext, pdfinfo).
"""
import csv
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "data" / "source"
OUT_FILE = ROOT / "data" / "vocab.csv"

# A card row: Chinese term, a wide gap, then the English definition.
ROW = re.compile(r"^\s*(\S.*?)\s{2,}(\S.*?)\s*$")
HAS_CJK = re.compile(r"[一-鿿]")


def pdf_title(path):
    info = subprocess.run(["pdfinfo", str(path)], capture_output=True, text=True, check=True).stdout
    for line in info.splitlines():
        if line.startswith("Title:"):
            return line.split(":", 1)[1].strip()
    return path.stem


def normalize_english(text):
    # "grade;score" and "grade; score" should display the same way.
    return re.sub(r"\s*;\s*", "; ", text)


def parse_pdf(path, topic):
    text = subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True, check=True).stdout
    rows = []
    for line in text.splitlines():
        if not line.strip() or "knowt.com" in line or line.strip() == topic:
            continue
        match = ROW.match(line)
        if not match:
            continue
        chinese, english = match.groups()
        # Skip the page header ("10/9/26, 6:50 PM   School 学校"): its left side has no Chinese.
        if not HAS_CJK.search(chinese):
            continue
        rows.append((chinese, normalize_english(english)))
    return rows


def main():
    pdfs = sorted(SOURCE_DIR.glob("*.pdf"))
    if not pdfs:
        sys.exit(f"No PDFs found in {SOURCE_DIR}")
    with OUT_FILE.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["topic", "chinese", "english"])
        for pdf in pdfs:
            topic = pdf_title(pdf)
            rows = parse_pdf(pdf, topic)
            for chinese, english in rows:
                writer.writerow([topic, chinese, english])
            print(f"{pdf.name}: {topic!r} -> {len(rows)} words")
    print(f"Wrote {OUT_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
