import sqlite3
import os

db_path = 'db.sqlite3'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='trend_saveditem';")
    print(f"Table exists: {cursor.fetchone() is not None}")
    conn.close()
else:
    print("Database not found")
