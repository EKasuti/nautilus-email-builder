"""Run once to populate groups and members in Neon DB."""
import os
from dotenv import load_dotenv
from database import init_db, get_conn

load_dotenv()

GROUPS = [
    ("all",    "All members"),
    ("lapsed", "Lapsed members"),
    ("new",    "New signups"),
    ("vip",    "VIP members"),
]

# (email, name, group_slug)
MEMBERS = [
    # All members
    ("alice@example.com",   "Alice Nguyen",     "all"),
    ("bob@example.com",     "Bob Martinez",     "all"),
    ("carol@example.com",   "Carol Smith",      "all"),
    ("david@example.com",   "David Lee",        "all"),
    ("eve@example.com",     "Eve Johnson",      "all"),
    # Lapsed
    ("frank@example.com",   "Frank Brown",      "lapsed"),
    ("grace@example.com",   "Grace Wilson",     "lapsed"),
    ("henry@example.com",   "Henry Davis",      "lapsed"),
    # New signups
    ("ivy@example.com",     "Ivy Taylor",       "new"),
    ("jack@example.com",    "Jack Anderson",    "new"),
    ("kate@example.com",    "Kate Thomas",      "new"),
    # VIP
    ("liam@example.com",    "Liam Jackson",     "vip"),
    ("mia@example.com",     "Mia White",        "vip"),
]


def seed():
    init_db()
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Groups
            for slug, name in GROUPS:
                cur.execute(
                    "INSERT INTO groups (slug, name) VALUES (%s, %s) ON CONFLICT (slug) DO NOTHING",
                    (slug, name),
                )
            # Members
            for email, name, group_slug in MEMBERS:
                cur.execute(
                    """
                    INSERT INTO members (email, name, group_slug)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (email) DO NOTHING
                    """,
                    (email, name, group_slug),
                )

    print(f"Seeded {len(GROUPS)} groups and {len(MEMBERS)} members.")


if __name__ == "__main__":
    seed()
