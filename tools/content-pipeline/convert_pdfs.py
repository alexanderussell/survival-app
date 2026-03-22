#!/usr/bin/env python3
"""Convert PDFs to markdown using pymupdf4llm.

Usage:
    python tools/content-pipeline/convert_pdfs.py

Converts PDFs in tools/content-pipeline/raw/pdfs/ to markdown files
in tools/content-pipeline/sources/<pack-name>/.
Then run build_packs.py to generate JSONL content packs.
"""
import re
from pathlib import Path

import pymupdf4llm

RAW_DIR = Path(__file__).parent / "raw" / "pdfs"
SOURCES_DIR = Path(__file__).parent / "sources"

# Map PDF filenames to pack names and source titles
PDF_MAPPINGS = {
    "GUIDE01_HomeCan_rev0715.pdf": {
        "pack": "usda-canning",
        "title": "USDA Complete Guide to Home Canning",
        "output": "01-principles.md",
    },
    "GUIDE02_HomeCan_rev0715.pdf": {
        "pack": "usda-canning",
        "title": "USDA Complete Guide to Home Canning",
        "output": "02-fruit.md",
    },
    "GUIDE03_HomeCan_rev0715.pdf": {
        "pack": "usda-canning",
        "title": "USDA Complete Guide to Home Canning",
        "output": "03-tomatoes.md",
    },
    "GUIDE04_HomeCan_rev0715.pdf": {
        "pack": "usda-canning",
        "title": "USDA Complete Guide to Home Canning",
        "output": "04-vegetables.md",
    },
    "GUIDE05_HomeCan_rev0715.pdf": {
        "pack": "usda-canning",
        "title": "USDA Complete Guide to Home Canning",
        "output": "05-meat-poultry.md",
    },
    "GUIDE06_HomeCan_rev0715.pdf": {
        "pack": "usda-canning",
        "title": "USDA Complete Guide to Home Canning",
        "output": "06-fermented-pickles.md",
    },
    "GUIDE07_HomeCan_rev0715.pdf": {
        "pack": "usda-canning",
        "title": "USDA Complete Guide to Home Canning",
        "output": "07-jams-jellies.md",
    },
    "are-you-ready-guide.pdf": {
        "pack": "fema-preparedness",
        "title": "FEMA Are You Ready Guide",
        "output": "01-are-you-ready.md",
    },
}


def clean_markdown(text: str) -> str:
    """Clean up pymupdf4llm output for better chunking."""
    # Remove excessive blank lines
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    # Remove page headers/footers (common patterns)
    text = re.sub(r"\n\d+\s*\n", "\n", text)  # Standalone page numbers
    text = re.sub(r"Guide \d+ •.*?\n", "\n", text)  # USDA guide headers
    # Clean up weird spacing from PDF extraction
    text = re.sub(r"  +", " ", text)
    # Remove image references (we can't use them in text RAG)
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)
    return text.strip()


def convert_pdf(pdf_path: Path, mapping: dict) -> Path:
    """Convert a single PDF to cleaned markdown."""
    pack_dir = SOURCES_DIR / mapping["pack"]
    pack_dir.mkdir(parents=True, exist_ok=True)
    output_path = pack_dir / mapping["output"]

    print(f"  Converting {pdf_path.name}...")
    md_text = pymupdf4llm.to_markdown(str(pdf_path))
    cleaned = clean_markdown(md_text)

    # Prepend source info as a heading if not already there
    if not cleaned.startswith("#"):
        cleaned = f"# {mapping['title']}\n\n{cleaned}"

    output_path.write_text(cleaned)
    word_count = len(cleaned.split())
    print(f"  -> {output_path.name} ({word_count:,} words)")
    return output_path


def main():
    if not RAW_DIR.exists():
        print(f"PDF directory not found: {RAW_DIR}")
        return

    pdfs = list(RAW_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs found in {RAW_DIR}")
        return

    print(f"Found {len(pdfs)} PDFs\n")

    converted = 0
    for pdf_path in sorted(pdfs):
        mapping = PDF_MAPPINGS.get(pdf_path.name)
        if not mapping:
            print(f"  Skipping {pdf_path.name} (no mapping defined)")
            continue
        try:
            convert_pdf(pdf_path, mapping)
            converted += 1
        except Exception as e:
            print(f"  ERROR converting {pdf_path.name}: {e}")

    print(f"\n=== Converted {converted} PDFs to markdown ===")
    print("Now run: python tools/content-pipeline/build_packs.py")


if __name__ == "__main__":
    main()
