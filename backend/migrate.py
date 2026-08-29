"""Database migration script - adds user_id to conversations table"""

import sqlite3
import os

DB_PATH = "data/chatbot_memory.db"


def migrate():
    if not os.path.exists(DB_PATH):
        print("No database exists - will be created with correct schema on startup")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check current schema
    cursor.execute("PRAGMA table_info(conversations)")
    columns = {col[1]: col for col in cursor.fetchall()}

    if "user_id" not in columns:
        # Add user_id column (nullable for existing records)
        cursor.execute("ALTER TABLE conversations ADD COLUMN user_id INTEGER")
        conn.commit()
        print("✓ Added user_id column to conversations table")
    else:
        print("✓ user_id column already exists")

    # Verify
    cursor.execute("PRAGMA table_info(conversations)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"  Current columns: {columns}")

    conn.close()


if __name__ == "__main__":
    migrate()
