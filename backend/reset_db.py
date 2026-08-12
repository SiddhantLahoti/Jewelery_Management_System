# backend/reset_db.py
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import engine
from app.database.models import Base

print("Dropping old tables...")
Base.metadata.drop_all(bind=engine)

print("Creating new tables with the updated schema...")
Base.metadata.create_all(bind=engine)

print("Database reset complete!")