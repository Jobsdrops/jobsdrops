
import os
from datetime import datetime, timedelta
from bs4 import BeautifulSoup

GRACE_PERIOD_DAYS = 21
TODAY = datetime.today()

HTML_FILES = [
    "weekly.html",
    "students.html",
    "graduates.html",
    "scholarships.html"
]

def prune_file(path):
    with open(path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    removed = 0
    cards = soup.find_all("article", class_="card")

    for card in cards:
        closing = card.get("data-closing")
        if not closing:
            continue

        try:
            closing_dt = datetime.strptime(closing.strip(), "%Y-%m-%d")
        except ValueError:
            continue

        days_since_expiry = (TODAY - closing_dt).days

        if days_since_expiry > GRACE_PERIOD_DAYS:
            card.decompose()
            removed += 1

    if removed:
        with open(path, "w", encoding="utf-8") as f:
            f.write(str(soup))

    return removed

def main():
    total_removed = 0

    for file in HTML_FILES:
        if os.path.exists(file):
            removed = prune_file(file)
            print(f"{file}: removed {removed}")
            total_removed += removed
        else:
            print(f"{file}: not found")

    print(f"TOTAL REMOVED: {total_removed}")

if __name__ == "__main__":
    main()
