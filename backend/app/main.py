# backend/app/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .database import database, models
from .routers import ingestion, metadata, management  # Added management

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Jewelry Management System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Your Next.js port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# Include All Routers
app.include_router(ingestion.router)
app.include_router(metadata.router)
app.include_router(management.router)  # Registered!

@app.get("/")
def read_root():
    return {"message": "Jewelry System API is fully operational"}