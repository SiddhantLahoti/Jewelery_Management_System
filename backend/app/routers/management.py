# backend/app/routers/management.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..database import database, models

router = APIRouter(prefix="/api/management", tags=["Page 4 - Master Data Management"])

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic Schemas ---

class AddSimpleOptionRequest(BaseModel):
    target_table: str  # e.g., "designer", "metal_type", "colour_stone", "shape", "cut", "market", "diamond_type", "main_category"
    name: str

class AddCascadingCategoryRequest(BaseModel):
    name: str
    parent_id: int  # main_category_id for Category, or category_id for Subcategories

class DeleteOptionRequest(BaseModel):
    target_table: str
    item_id: int


# --- 1. Add Simple Master Options ---

@router.post("/add-simple-option")
def add_simple_option(payload: AddSimpleOptionRequest, db: Session = Depends(get_db)):
    """Adds a new item to single-level master dropdowns."""
    table_map = {
        "designer": models.Designer,
        "metal_type": models.MetalType,
        "colour_stone": models.ColourStone,
        "shape": models.Shape,
        "cut": models.Cut,
        "market": models.Market,
        "diamond_type": models.DiamondType,
        "main_category": models.MainCategory
    }

    target_model = table_map.get(payload.target_table.lower())
    if not target_model:
        raise HTTPException(status_code=400, detail="Invalid target table specified.")

    # Check if option already exists
    existing = db.query(target_model).filter(target_model.name.ilike(payload.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Option '{payload.name}' already exists.")

    new_item = target_model(name=payload.name)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return {"message": f"Successfully added '{payload.name}'", "item": new_item}


# --- 2. Add Cascading Categories & Subcategories ---

@router.post("/add-category")
def add_category(payload: AddCascadingCategoryRequest, db: Session = Depends(get_db)):
    """Adds a new Category linked to a Main Category."""
    main_cat = db.query(models.MainCategory).filter(models.MainCategory.id == payload.parent_id).first()
    if not main_cat:
        raise HTTPException(status_code=404, detail="Parent Main Category not found.")

    new_cat = models.Category(name=payload.name, main_category_id=payload.parent_id)
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)

    return {"message": f"Category '{payload.name}' added under '{main_cat.name}'", "item": new_cat}


@router.post("/add-subcategory1")
def add_subcategory1(payload: AddCascadingCategoryRequest, db: Session = Depends(get_db)):
    """Adds a new Subcategory 1 linked to a Category."""
    cat = db.query(models.Category).filter(models.Category.id == payload.parent_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Parent Category not found.")

    new_sub1 = models.Subcategory1(name=payload.name, category_id=payload.parent_id)
    db.add(new_sub1)
    db.commit()
    db.refresh(new_sub1)

    return {"message": f"Subcategory 1 '{payload.name}' added under '{cat.name}'", "item": new_sub1}


@router.post("/add-subcategory2")
def add_subcategory2(payload: AddCascadingCategoryRequest, db: Session = Depends(get_db)):
    """Adds a new Subcategory 2 linked to a Category."""
    cat = db.query(models.Category).filter(models.Category.id == payload.parent_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Parent Category not found.")

    new_sub2 = models.Subcategory2(name=payload.name, category_id=payload.parent_id)
    db.add(new_sub2)
    db.commit()
    db.refresh(new_sub2)

    return {"message": f"Subcategory 2 '{payload.name}' added under '{cat.name}'", "item": new_sub2}


# --- 3. Delete Master Options ---

@router.delete("/delete-option")
def delete_option(payload: DeleteOptionRequest, db: Session = Depends(get_db)):
    """Deletes an item from any specified master table by ID."""
    table_map = {
        "designer": models.Designer,
        "metal_type": models.MetalType,
        "colour_stone": models.ColourStone,
        "shape": models.Shape,
        "cut": models.Cut,
        "market": models.Market,
        "diamond_type": models.DiamondType,
        "main_category": models.MainCategory,
        "category": models.Category,
        "subcategory1": models.Subcategory1,
        "subcategory2": models.Subcategory2
    }

    target_model = table_map.get(payload.target_table.lower())
    if not target_model:
        raise HTTPException(status_code=400, detail="Invalid target table specified.")

    item = db.query(target_model).filter(target_model.id == payload.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    db.delete(item)
    db.commit()

    return {"message": f"Successfully deleted item ID {payload.item_id} from {payload.target_table}"}