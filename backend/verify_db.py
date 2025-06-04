import sqlite3

# Check instance/app.db
conn = sqlite3.connect('instance/app.db')
cursor = conn.cursor()

print("Task table columns in instance/app.db:")
cursor.execute("PRAGMA table_info(task)")
columns = [row[1] for row in cursor.fetchall()]
for col in columns:
    print(f"  - {col}")

conn.close()

# Check if all required columns exist
required_columns = ['priority_score', 'parent_task_id', 'estimated_effort', 'percent_complete', 'last_progress_update']
missing_columns = [col for col in required_columns if col not in columns]

if missing_columns:
    print(f"\nMissing columns: {missing_columns}")
else:
    print("\nAll required columns exist!") 