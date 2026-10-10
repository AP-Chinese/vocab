"""Convert Knowt flashcard PDF exports in data/source/ into site/js/vocab.js, the word list the app loads.

Each PDF is one topic. Files are processed in filename order (e.g. 01-school.pdf).
The topic's ID for links comes from the file name ("school"), and its display name
from the PDF title (e.g. "School 学校").

The PDFs have no pinyin, so it's generated with pypinyin, which uses a word dictionary to pick
the right reading for characters with several (乐队 yuè duì, 数学 shù xué). Review new topics'
pinyin anyway, and put corrections in PINYIN_OVERRIDES.

Usage: python3 scripts/import_vocab.py
Requires poppler-utils (pdftotext, pdfinfo) and pypinyin (pip install -r scripts/requirements.txt).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

from pypinyin import Style, lazy_pinyin

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "data" / "source"
JS_FILE = ROOT / "site" / "js" / "vocab.js"

# Teacher-approved corrections to the source sets: (topic ID, chinese) -> english.
OVERRIDES = {
    ("school", "电脑"): "computer",
}

# Display names, by topic ID, when the PDF title isn't what the app should show.
TOPIC_NAMES = {
    "travel": "Travel 旅游",  # PDF title: "ap chinese: travel"
    "transportation": "Transportation 交通",  # "交通Transportation"
    "family": "Family 家庭",  # "Family"
    "food": "Food 饮食",  # "AP Chinese: Food"
}

# Teacher-approved removals from the source sets: (topic ID, chinese).
EXCLUDE = {
    ("school", "数学分析"),  # math analysis
}

# Corrections to generated pinyin: chinese -> pinyin (tone marks, one space between syllables).
# pypinyin gives full tones where standard pinyin uses the neutral tone (哥哥 gēge), so those are listed here.
PINYIN_OVERRIDES = {
    "汉堡包": "hàn bǎo bāo",  # generated as hàn pù bāo
    # Neutral tones
    "哥哥": "gē ge",
    "姐姐": "jiě jie",
    "弟弟": "dì di",
    "妹妹": "mèi mei",
    "叔叔": "shū shu",
    "舅舅": "jiù jiu",
    "亲戚": "qīn qi",
    "行李": "xíng li",
    "码头": "mǎ tou",
    "家常豆腐": "jiā cháng dòu fu",
    "味道": "wèi dao",
    "葡萄酒": "pú tao jiǔ",
}

# A wrapped line of a long English meaning: only text, indented far past the Chinese column.
CONTINUATION = re.compile(r"^\s{20,}\S")

# A card row: Chinese term, a wide gap, then the English definition.
ROW = re.compile(r"^\s*(\S.*?)\s{2,}(\S.*?)\s*$")
HAS_CJK = re.compile(r"[一-鿿]")


def pdf_title(path):
    info = subprocess.run(["pdfinfo", str(path)], capture_output=True, text=True, check=True).stdout
    for line in info.splitlines():
        if line.startswith("Title:"):
            return line.split(":", 1)[1].strip()
    return path.stem


def topic_id(path):
    # The stable ID used in links: "01-school.pdf" -> "school". The number prefix only sets the order.
    topic = re.sub(r"^\d+[-_ ]*", "", path.stem).lower()
    topic = re.sub(r"[^a-z0-9]+", "-", topic).strip("-")
    if not topic:
        sys.exit(f"{path.name}: file name needs a topic after the number, e.g. 02-family.pdf")
    return topic


def to_pinyin(chinese):
    if chinese in PINYIN_OVERRIDES:
        return PINYIN_OVERRIDES[chinese]
    # Tone marks, one syllable per character, e.g. 课程 -> "kè chéng".
    return " ".join(lazy_pinyin(chinese, style=Style.TONE))


def normalize_english(text):
    # "grade;score" and "grade; score" should display the same way; full-width commas become ", ".
    text = re.sub(r"\s*，\s*", ", ", text)
    return re.sub(r"\s*;\s*", "; ", text)


def parse_pdf(path, title):
    """Returns the PDF's (chinese, english) cards, exactly as written in the set."""
    text = subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True, check=True).stdout
    rows = []
    last_was_card = False
    for line in text.splitlines():
        if not line.strip() or "knowt.com" in line or line.strip() == title:
            last_was_card = False
            continue
        # A long English meaning wraps onto the next line, indented under the English column.
        if last_was_card and CONTINUATION.match(line) and not HAS_CJK.search(line):
            chinese, english = rows[-1]
            rows[-1] = (chinese, f"{english} {line.strip()}")
            continue
        last_was_card = False
        match = ROW.match(line)
        if not match:
            continue
        chinese, english = match.groups()
        # Skip the page header ("10/9/26, 6:50 PM   School 学校"): its left side has no Chinese.
        if not HAS_CJK.search(chinese):
            continue
        rows.append((chinese, english))
        last_was_card = True
    return rows


def apply_changes(topic, rows):
    """Applies the teacher-approved removals and corrections for this topic ID."""
    return [
        (chinese, OVERRIDES.get((topic, chinese), normalize_english(english)))
        for chinese, english in rows
        if (topic, chinese) not in EXCLUDE
    ]


def report(words):
    """Prints things worth a human look; they don't stop the import."""
    by_english = {}
    for w in words:
        by_english.setdefault(w["english"].lower(), []).append(w["chinese"])
    for english, chinese in by_english.items():
        if len(chinese) > 1:
            print(f"  same English meaning ({english}): {', '.join(chinese)}")
    seen = set()
    for w in words:
        if w["chinese"] in seen:
            print(f"  duplicate word: {w['chinese']}")
        seen.add(w["chinese"])


def main():
    pdfs = sorted(SOURCE_DIR.glob("*.pdf"))
    if not pdfs:
        sys.exit(f"No PDFs found in {SOURCE_DIR}")
    topics = []
    for pdf in pdfs:
        title = pdf_title(pdf)
        tid = topic_id(pdf)
        rows = apply_changes(tid, parse_pdf(pdf, title))
        words = [{"chinese": c, "pinyin": to_pinyin(c), "english": e} for c, e in rows]
        name = TOPIC_NAMES.get(tid, title)
        topics.append({"id": tid, "name": name, "words": words})
        print(f"{pdf.name}: {name!r} -> {len(words)} words")
        report(words)
    JS_FILE.parent.mkdir(parents=True, exist_ok=True)
    JS_FILE.write_text(
        "// Generated by scripts/import_vocab.py from data/source/*.pdf. Do not edit by hand.\n"
        f"export const TOPICS = {json.dumps(topics, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"Wrote {JS_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
