import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

with open('reset_seq_all.sql', 'r') as f:
    sql = f.read()

if sql.strip():
    with connection.cursor() as cursor:
        cursor.execute(sql)
    print("Sequences reset successfully.")
else:
    print("No sequences to reset.")
