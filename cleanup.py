import re
from datetime import datetime, timedelta
from pathlib import Path

GRACE_DAYS = 14
DATE_FMT = "%Y-%m-%d"

# Skip bursaries page (user wants to manage bursaries manually)
SKIP_FILES = {"bursaries.html"}

ARTICLE_RE = re.compile(
    r'(<article\b[^>]*\bclass\s*=\s*["\'][^"\']*\bcard\b[^"\']*["\'][^>]*>)(.*?)(</article>)',
    re.IGNORECASE | re.DOTALL
)
CLOSING_RE = re.compile(r'\bdata-closing\s*=\s*["\'](\d{4}-\d{2}-\d{2})["\']', re.IGNORECASE)
TYPE_RE = re.compile(r'\bdata-type\s*=\s*["\'](\w+)["\']', re.IGNORECASE)
KEEP_RE = re.compile(r'\bdata-keep\s*=\s*["\']true["\']', re.IGNORECASE)

def parse_date(s: str):
    try:
        return datetime.strptime(s, DATE_FMT).date()
    except ValueError:
        return None

def should_remove(open_tag: str, today):
    # Never remove listings explicitly marked to keep (e.g., recurring NSFAS)

    # Never remove bursaries (evergreen archive)
    tm = TYPE_RE.search(open_tag)
    if tm and tm.group(1).lower() == "bursary":
        return False

    if KEEP_RE.search(open_tag):
        return False

    m = CLOSING_RE.search(open_tag)
    if not m:
        return False

    closing = parse_date(m.group(1))
    if not closing:
        return False

    return today > (closing + timedelta(days=GRACE_DAYS))

def process_html(html: str, today):
    removed = 0

    def repl(match):
        nonlocal removed
        open_tag = match.group(1)
        if should_remove(open_tag, today):
            removed += 1
            return ""
        return match.group(0)

    new_html = ARTICLE_RE.sub(repl, html)
    return new_html, removed

def main():
    today = datetime.utcnow().date()
    total_removed = 0
    changed_files = 0

    for path in Path(".").rglob("*.html"):
        if path.name in SKIP_FILES:
            continue
        # avoid hidden folders like .git/.github previews
        if any(part.startswith(".") for part in path.parts):
            continue

        original = path.read_text(encoding="utf-8", errors="ignore")
        updated, removed = process_html(original, today)

        if removed and updated != original:
            path.write_text(updated, encoding="utf-8")
            total_removed += removed
            changed_files += 1

    print(f"Removed {total_removed} expired listing(s) across {changed_files} file(s).")

if __name__ == "__main__":
    main()
