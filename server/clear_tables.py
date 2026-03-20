import sqlite3
import os

db_path = 'db.sqlite3'

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Tables to clear
    tables = ['trend_creatorearning', 'trend_usersubscription']
    
    for table in tables:
        # Check if table exists
        cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
        table_exists = cursor.fetchone()
        
        if table_exists:
            print(f"Table {table} exists.")
            # Get count before deletion
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"Current Row Count in {table}: {count}")
            
            # Perform deletion
            cursor.execute(f"DELETE FROM {table}")
            conn.commit()
            print(f"Executed: DELETE FROM {table}")
            
            # Verify deletion
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            new_count = cursor.fetchone()[0]
            print(f"New Row Count in {table}: {new_count}")
        else:
            print(f"Table {table} does not exist.")
            
    conn.close()
    print("Done.")
except Exception as e:
    print(f"Error: {e}")
