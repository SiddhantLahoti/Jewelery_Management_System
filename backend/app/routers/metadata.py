# backend/app/routers/metadata.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from ..database import database, models

router = APIRouter(prefix="/api/metadata", tags=["Metadata & Options"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Pydantic Schema for Metadata Submission ---
class SubmitMetadataRequest(BaseModel):
    cropped_product_id: int
    style_number: str
    main_category_id: int
    category_ids: List[int] = []        # Max 3 (enforced in frontend/backend)
    subcategory_1_ids: List[int] = []   # Max 3
    subcategory_2_ids: List[int] = []   # Max 3
    diamond_type_id: Optional[int] = None
    shape_ids: List[int] = []
    cut_ids: List[int] = []
    colour_stone_ids: List[int] = []
    market_id: Optional[int] = None
    metal_type_id: Optional[int] = None
    designer_id: Optional[int] = None
    collection_name: Optional[str] = None
    description: Optional[str] = None
    launch_date: Optional[str] = None
    tag_name: Optional[str] = None
    tag_description: Optional[str] = None
    customer_number: Optional[str] = None
    customer_name: Optional[str] = None
    total_weight: Optional[float] = None
    metal_weight: Optional[float] = None


# --- 1. Pending Products Queue ---

@router.get("/pending-products")
def get_pending_products(db: Session = Depends(get_db)):
    """Fetch all cropped products that are waiting for metadata filling."""
    pending = db.query(models.CroppedProduct).filter(models.CroppedProduct.status == "PENDING").all()
    return pending


# --- 2. Cascading & Master Dropdown Options ---

@router.get("/dropdowns/master")
def get_master_dropdowns(db: Session = Depends(get_db)):
    """Fetch single-level master dropdown options."""
    return {
        "main_categories": db.query(models.MainCategory).all(),
        "markets": db.query(models.Market).all(),
        "shapes": db.query(models.Shape).all(),
        "cuts": db.query(models.Cut).all(),
        "diamond_types": db.query(models.DiamondType).all(),
        "metal_types": db.query(models.MetalType).all(),
        "designers": db.query(models.Designer).all(),
        "colour_stones": db.query(models.ColourStone).all(),
    }

@router.get("/dropdowns/categories")
def get_categories(main_category_id: int, db: Session = Depends(get_db)):
    """Fetch categories filtered by chosen Main Category."""
    return db.query(models.Category).filter(models.Category.main_category_id == main_category_id).all()

@router.get("/dropdowns/subcategories1")
def get_subcategories1(category_ids: List[int] = Query(...), db: Session = Depends(get_db)):
    """Fetch Subcategory 1 options filtered by selected Category IDs."""
    return db.query(models.Subcategory1).filter(models.Subcategory1.category_id.in_(category_ids)).all()

@router.get("/dropdowns/subcategories2")
def get_subcategories2(category_ids: List[int] = Query(...), db: Session = Depends(get_db)):
    """Fetch Subcategory 2 options filtered by selected Category IDs."""
    return db.query(models.Subcategory2).filter(models.Subcategory2.category_id.in_(category_ids)).all()


# --- 3. Submit Metadata & Activate Item ---

@router.post("/submit")
def submit_product_metadata(payload: SubmitMetadataRequest, db: Session = Depends(get_db)):
    
    # Check if Style Number already exists
    existing_style = db.query(models.ProductMetadata).filter(
        models.ProductMetadata.style_number.ilike(payload.style_number)
    ).first()

    if existing_style:
        raise HTTPException(
            status_code=400, 
            detail=f"Warning: Style Number '{payload.style_number}' already exists in the system!"
        )
    # Verify cropped product exists and is pending
    cropped_prod = db.query(models.CroppedProduct).filter(models.CroppedProduct.id == payload.cropped_product_id).first()
    if not cropped_prod:
        raise HTTPException(status_code=404, detail="Cropped product not found")

    # Enforce Max 3 rule on server side
    if len(payload.category_ids) > 3 or len(payload.subcategory_1_ids) > 3 or len(payload.subcategory_2_ids) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 options allowed for Categories and Subcategories.")

    # Create Metadata record
    new_metadata = models.ProductMetadata(
        cropped_product_id=payload.cropped_product_id,
        style_number=payload.style_number,
        main_category_id=payload.main_category_id,
        diamond_type_id=payload.diamond_type_id,
        market_id=payload.market_id,
        metal_type_id=payload.metal_type_id,
        designer_id=payload.designer_id,
        collection_name=payload.collection_name,
        description=payload.description,
        launch_date=payload.launch_date,
        tag_name=payload.tag_name,
        tag_description=payload.tag_description,
        customer_number=payload.customer_number,
        customer_name=payload.customer_name,
        total_weight=payload.total_weight,
        metal_weight=payload.metal_weight
    )

    # Link Multi-Select Bridge Relationships
    if payload.category_ids:
        new_metadata.categories = db.query(models.Category).filter(models.Category.id.in_(payload.category_ids)).all()
    if payload.subcategory_1_ids:
        new_metadata.subcategories_1 = db.query(models.Subcategory1).filter(models.Subcategory1.id.in_(payload.subcategory_1_ids)).all()
    if payload.subcategory_2_ids:
        new_metadata.subcategories_2 = db.query(models.Subcategory2).filter(models.Subcategory2.id.in_(payload.subcategory_2_ids)).all()
    if payload.shape_ids:
        new_metadata.shapes = db.query(models.Shape).filter(models.Shape.id.in_(payload.shape_ids)).all()
    if payload.cut_ids:
        new_metadata.cuts = db.query(models.Cut).filter(models.Cut.id.in_(payload.cut_ids)).all()
    if payload.colour_stone_ids:
        new_metadata.colour_stones = db.query(models.ColourStone).filter(models.ColourStone.id.in_(payload.colour_stone_ids)).all()

    db.add(new_metadata)

    # Change Cropped Product Status from PENDING to ACTIVE
    cropped_prod.status = "ACTIVE"
    
    db.commit()
    db.refresh(new_metadata)

    return {
        "message": "Metadata saved and product activated successfully!",
        "product_id": new_metadata.id
    }

# --- Add these to backend/app/routers/metadata.py ---

import os

# --- Replace get_active_products in backend/app/routers/metadata.py ---

@router.get("/active-products")
def get_active_products(
    search: Optional[str] = None,
    main_category_id: Optional[int] = None,
    metal_type_id: Optional[int] = None,
    designer_id: Optional[int] = None,
    diamond_type_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Fetch active products with optional multi-filters and search."""
    # Start query joining CroppedProduct and ProductMetadata
    query = db.query(models.CroppedProduct).join(
        models.ProductMetadata, 
        models.CroppedProduct.id == models.ProductMetadata.cropped_product_id
    ).filter(models.CroppedProduct.status == "ACTIVE")

    # Apply search filter
    if search:
        query = query.filter(models.ProductMetadata.style_number.ilike(f"%{search}%"))
    
    # Apply dropdown filters if provided
    if main_category_id:
        query = query.filter(models.ProductMetadata.main_category_id == main_category_id)
    if metal_type_id:
        query = query.filter(models.ProductMetadata.metal_type_id == metal_type_id)
    if designer_id:
        query = query.filter(models.ProductMetadata.designer_id == designer_id)
    if diamond_type_id:
        query = query.filter(models.ProductMetadata.diamond_type_id == diamond_type_id)

    active_prods = query.all()
    
    result = []
    for prod in active_prods:
        meta = db.query(models.ProductMetadata).filter(models.ProductMetadata.cropped_product_id == prod.id).first()
        result.append({
            "cropped_product_id": prod.id,
            "image_path": prod.cropped_image_path,
            "metadata": meta
        })
        
    return result

@router.delete("/products/{cropped_product_id}")
def delete_product(cropped_product_id: int, db: Session = Depends(get_db)):
    """Deletes a product, its metadata, and removes the image file from storage."""
    prod = db.query(models.CroppedProduct).filter(models.CroppedProduct.id == cropped_product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    # Delete physical image file if it exists
    if prod.cropped_image_path and os.path.exists(prod.cropped_image_path):
        try:
            os.remove(prod.cropped_image_path)
        except Exception as e:
            print(f"Could not delete file: {e}")

    # Delete metadata record if exists
    meta = db.query(models.ProductMetadata).filter(models.ProductMetadata.cropped_product_id == cropped_product_id).first()
    if meta:
        db.delete(meta)

    db.delete(prod)
    db.commit()

    return {"message": "Product and its metadata deleted successfully."}