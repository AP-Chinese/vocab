"""Tests for the PDF import (run with `npm run test:import`; needs poppler-utils and pypinyin)."""
import unittest

import import_vocab as iv

TRAVEL_PDF = iv.SOURCE_DIR / "02-travel.pdf"


class ParsePdfTest(unittest.TestCase):
    def test_joins_english_that_wraps_onto_a_second_line(self):
        cards = dict(iv.parse_pdf(TRAVEL_PDF, iv.pdf_title(TRAVEL_PDF)))
        # Both wrap in the PDF; they're removed later by EXCLUDE, but the parser must still read them whole.
        self.assertEqual(cards["独具匠心"], "exquisite workmanship with an ingenious design")
        self.assertEqual(cards["依山傍水"], "surrounded by hills on one side and water on the other")

    def test_reads_every_card(self):
        self.assertEqual(len(iv.parse_pdf(TRAVEL_PDF, iv.pdf_title(TRAVEL_PDF))), 36)


class CorrectionsTest(unittest.TestCase):
    def test_every_correction_matches_a_word(self):
        topics = [
            {"id": iv.topic_id(pdf), "words": [{"chinese": c} for c, _ in iv.apply_changes(iv.topic_id(pdf), iv.parse_pdf(pdf, iv.pdf_title(pdf)))]}
            for pdf in sorted(iv.SOURCE_DIR.glob("*.pdf"))
        ]
        iv.check_keys(topics)  # exits with a list of problems if any key is stale


if __name__ == "__main__":
    unittest.main()
