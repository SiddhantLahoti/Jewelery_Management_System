# backend/app/routers/ingestion.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
import uuid
from PIL import Image
from pdf2image import convert_from_path

from ..database import database, models
from ..services.vision import detect_sketches

router = APIRouter(prefix="/api/ingestion", tags=["PDF Ingestion & Cropping"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

os.makedirs("storage/raw_pdfs", exist_ok=True)
os.makedirs("storage/temp_pages", exist_ok=True)
os.makedirs("storage/cropped_products", exist_ok=True)


# --- Pydantic Schemas ---
class BoundingBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int

class ConfirmCropsRequest(BaseModel):
    pdf_id: Optional[int] = None
    page_number: int
    page_image_path: str
    boxes: List[BoundingBox]


# --- Endpoints ---

@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), db: Session = Depends(get_db)):
    pdf_path = f"storage/raw_pdfs/{file.filename}"
    with open(pdf_path, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Save PDF record to DB
    new_pdf = models.UploadedPDF(file_name=file.filename, file_path=pdf_path)
    db.add(new_pdf)
    db.commit()
    db.refresh(new_pdf)
    
    # Convert PDF pages to PNG
    pages = convert_from_path(pdf_path, dpi=200) 
    page_results = []
    
    for page_num, page_image in enumerate(pages, start=1):
        page_image_path = f"storage/temp_pages/{new_pdf.id}_page_{page_num}.png"
        page_image.save(page_image_path, "PNG")
        
        detected_boxes = detect_sketches(page_image)
        
        page_results.append({
            "pdf_id": new_pdf.id,
            "page_number": page_num,
            "page_image_path": page_image_path, 
            "boxes": detected_boxes
        })
        
    return {
        "pdf_id": new_pdf.id,
        "message": "PDF processed successfully",
        "pages": page_results
    }


@router.post("/confirm-crops")
async def confirm_crops(payload: ConfirmCropsRequest, db: Session = Depends(get_db)):
    if not os.path.exists(payload.page_image_path):
        raise HTTPException(status_code=404, detail="Page image not found")

    full_page_img = Image.open(payload.page_image_path)
    created_crops = []

    for box in payload.boxes:
        # Crop the image using coordinates
        cropped_img = full_page_img.crop((box.x1, box.y1, box.x2, box.y2))
        
        crop_filename = f"crop_{uuid.uuid4().hex[:8]}.png"
        crop_save_path = f"storage/cropped_products/{crop_filename}"
        cropped_img.save(crop_save_path, "PNG")

        # Create record in DB as PENDING draft
        new_crop = models.CroppedProduct(
            pdf_id=payload.pdf_id,
            page_number=payload.page_number,
            cropped_image_path=crop_save_path,
            status="PENDING"
        )
        db.add(new_crop)
        created_crops.append(new_crop)

    db.commit()
    return {
        "message": f"Successfully created {len(created_crops)} cropped draft items.",
        "created_count": len(created_crops)
    }