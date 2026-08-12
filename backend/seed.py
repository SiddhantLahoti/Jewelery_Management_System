# backend/seed.py
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.database.models import (
    MainCategory, Category, Subcategory1, Subcategory2, 
    Market, Shape, Cut, DiamondType, MetalType, Designer, ColourStone
)

def seed_database():
    db = SessionLocal()
    
    # Check if data already exists to prevent accidental duplicates
    if db.query(MainCategory).first():
        print("Database is already seeded! Exiting...")
        db.close()
        return

    print("Seeding Master Tables (Markets, Shapes, etc.)...")
    
    # 1. Simple Single-Level Dropdowns
    simple_data = {
        Market: ["AU", "UK", "EU", "FR", "USO", "USM", "ROW"],
        Shape: ["Round", "Pear", "Princess", "Baguette", "Oval", "Marquise"],
        Cut: ["Full - Brilliant", "Single", "Modified"],
        DiamondType: ["LGD", "Mining", "Both"],
        MetalType: ["White gold", "Yellow gold", "Rose gold", "Silver", "Platinum"],
        Designer: ["Anurag", "Sandip", "Raju", "Snehal", "Imanur", "Asmita", "Farooq", "Jijai", "Khushbu", "Poonam", "Harshita", "Prachi", "Mangesh"],
        ColourStone: ["Ruby", "Sapphire", "Emerald", "amethyst", "citrine", "quartz"]
    }

    for model, items in simple_data.items():
        for item_name in items:
            db.add(model(name=item_name))
    db.commit()

    print("Seeding Cascading Categories...")

    # 2. Cascading Dropdown Dictionary
    cascade_data = {
        "Ring": {
            "Wedding Band": {
                "sub1": ["1/2 eternity", "full eternity"],
                "sub2": ["Classic", "Baguette", "Vintage", "TM", "Colour Diamond", "Colour Stone"]
            },
            "Anniversary Band": {
                "sub1": ["1/2 eternity", "full eternity"],
                "sub2": ["Classic", "Baguette", "Vintage", "Fancy shape diamond", "TM", "Colour Diamond", "Colour Stone"]
            },
            "Bands": {
                "sub1": ["5 stone", "7 stone", "9 stone"],
                "sub2": ["fancy shape diamond", "TM"]
            },
            "Fashion Bands": {
                "sub1": ["Full Eternity", "Half Eternity", "Stackable", "broad", "Basic"],
                "sub2": ["Basic", "Baguette", "Fancy Shape of Diamond", "TM", "Colour Diamond", "Colour Stone", "Chevron", "bold gold", "rope / texture", "cross over / over under / twist", "cross", "heart", "infinity", "alphabet", "zodiac", "hamsa", "butterfly"]
            },
            "Bridal Set": {
                "sub1": ["Sol", "Sol+", "Single Stone", "3 stone", "Cluster", "Composite", "Multistone", "Quad", "Fancy"],
                "sub2": ["Classic", "Vintage", "Single Halo", "Double Halo", "Semimount", "Baguette", "Hidden Halo", "fancy shape diamond", "fancy", "Texture", "TM", "Colour Diamond", "Colour Stone", "Color Stone"]
            },
            "Trio Bridal Set": {
                "sub1": ["Sol", "Sol+", "Single Stone", "3 stone", "Cluster", "Composite", "Multistone", "Quad", "Fancy"],
                "sub2": ["Classic", "Vintage", "Single Halo", "Double Halo", "Semimount", "Baguette", "Hidden Halo", "fancy shape diamond", "fancy", "Texture", "TM", "Colour Diamond", "Colour Stone", "Color Stone"]
            },
            "Quin Bridal Set": {
                "sub1": ["Sol", "Sol+", "Single Stone", "3 stone", "Cluster", "Composite", "Multistone", "Quad", "Fancy"],
                "sub2": ["Classic", "Vintage", "Single Halo", "Double Halo", "Semimount", "Baguette", "Hidden Halo", "fancy shape diamond", "fancy", "Texture", "TM", "Colour Diamond", "Colour Stone", "Color Stone"]
            },
            "Fashion Rings": {
                "sub1": ["Multistone", "Cluster", "Composite", "Fancy Shape of Diamond", "Heart"],
                "sub2": ["Classic", "Vintage", "Baguette", "Fancy shape diamond", "TM", "Colour Diamond", "Color Stone"]
            },
            "Promise Ring": {
                "sub1": ["Cluster", "Single stone", "3 stone"],
                "sub2": ["Classic", "Vintage", "Single Halo", "Double Halo", "Baguette", "TM", "Colour Diamond", "Colour Stone"]
            },
            "Engagement Ring": {
                "sub1": ["Sol", "Sol+", "Cluster", "Composite", "Multistone", "3 stone", "Quad", "Fancy Shape of Diamond"],
                "sub2": ["Classic", "Vintage", "Single Halo", "Double Halo", "Semimount", "Baguette", "fancy shape diamond", "TM", "Colour Diamond", "Colour Stone"]
            },
            "Enhancer": {
                "sub1": [],
                "sub2": ["Vintage", "Color Stone", "Colour Diamond", "Baguette", "TM", "Fancy Shape of Diamond"]
            },
            "Stand Alone": {
                "sub1": ["RHR/ Cocktail", "Cross", "couple Band", "Mens"],
                "sub2": ["Fancy Shape of Diamond", "Chevron", "cross over / over under / twist", "Multistone", "bold gold", "rope / texture", "cross", "heart", "infinity", "alphabet", "zodiac", "hamsa", "butterfly", "Baguette", "Color Diamond", "Color Stone", "Classic", "TM"]
            }
        },
        "Earring": {
            "Studs": {
                "sub1": ["Sol", "Sol+", "Cluster", "Composite", "Multistone", "Fashion"],
                "sub2": ["Classic", "Baguette", "Fancy Shape of Diamond", "Bold Gold", "texture", "TM", "Color diamond", "Color stone", "3 stone", "Single Halo", "Double Halo", "Micro pave", "Heart", "Cross", "Charms (unicorn / wine glass / crown / turtle / snow flakes / pets)", "Geometric", "Flat Back"]
            },
            "Hoops": {
                "sub1": ["Basic", "Fashion", "J-Hoop", "Cluster", "Composite", "Multistone", "Two Row", "3 stone"],
                "sub2": ["Classic", "Bold gold", "Baguette", "Front Back / Inside out", "Color stone", "Color diamond", "TM", "Fancy Shape of Diamond", "Criss Cross", "Cross", "Heart", "Quad", "Inside Out", "texture", "Geometric"]
            },
            "Huggies": {
                "sub1": ["Basic", "Fashion", "J-Huggie", "Cluster", "Composite", "Multistone", "3 stone"],
                "sub2": ["Classic", "Micro pave", "Bold gold", "Baguette", "Color diamond", "Color Stone", "TM", "Fancy Shape of Diamond", "Geometric", "texture", "Cross", "Heart"]
            },
            "Danglers": {
                "sub1": ["Basic", "Fashion", "Cluster", "Composite", "Multistone", "3 Stone"],
                "sub2": ["Classic", "Bold gold", "Baguette", "Color stone", "Color diamond", "TM", "Fancy Shape of Diamond", "Cross", "Heart", "Geometric", "Quads", "Composite", "Texture", "with Chain"]
            },
            "Ear crawlers": {
                "sub1": ["Basic"],
                "sub2": ["Sol"]
            },
            "Ear Party": {
                "sub1": ["Fashion"],
                "sub2": ["Cuff"]
            },
            "Multi wearable": {
                "sub1": ["Cluster", "Composite", "Multistone", "Classic", "Jacket"],
                "sub2": ["Helix", "Bold Gold", "Baguette", "Color Stone", "Color Diamond", "Fancy Shape Diamond", "Classic"]
            }
        },
        "Bangle": {
            "Basic": {
                "sub1": ["Classic", "Cluster", "Composite", "Mutlistone", "Fancy Shape of Diamond"],
                "sub2": ["Classic", "TM", "Single Halo", "Color Diamond", "Color Stone"]
            },
            "Fashion": {
                "sub1": ["Classic", "Cluster", "Composite", "Fancy shape diamond", "Heart", "Infinity", "Cross"],
                "sub2": ["Pave", "Cuff", "TM", "Bold Gold", "Classic", "Flexible", "Colour Diamond", "Colour Stone", "with halo"]
            }
        },
        "Bracelet": {
            "Tennis Bracelet": {
                "sub1": ["Single Line", "Cluster", "Composite", "Multistone"],
                "sub2": ["Classic", "Single halo", "Double Halo", "Bold Gold", "Fancy Shape of Diamond", "TM", "Color diamond", "Color stone"]
            },
            "Fashion Bracelet": {
                "sub1": ["Classic", "Cluster", "Composite", "Multistone", "Heart", "Infinity"],
                "sub2": ["Classic", "TM", "Color Stone", "Colour Diamond", "Fancy Shape of Diamond"]
            },
            "Bolo Bracelets": {
                "sub1": ["Classic", "Cluster", "Composite", "Multistone", "Bar", "Heart", "Infinity"],
                "sub2": ["Classic", "Bold Gold", "Geometric", "Stackable", "Color Diamond", "Color Stone", "Baguette", "TM", "Color stone", "Color diamond"]
            },
            "Chain Bracelet": {
                "sub1": ["Classic"],
                "sub2": ["Classic"]
            },
            "Thread Bracelet": {
                "sub1": ["Cluster"],
                "sub2": ["Charm"]
            },
            "Charm Bracelets": {
                "sub1": ["Multistone"],
                "sub2": ["Fancy"]
            },
            "Mens Bracelet": {
                "sub1": ["Heart", "Infinity", "Circle", "Bar"],
                "sub2": ["Baguette", "TM", "Color Diamond", "Color Stone", "Cross", "Butterfly / Pets / Angel / wings / alphabets / Star, moon, sun / zodiac / Evil eye / hamsa", "Lock and Key"]
            }
        },
        "Pendant": {
            "Basic": {
                "sub1": ["Sol", "Sol+", "Cluster", "Composite", "Multistone", "Basic"],
                "sub2": ["Classic", "Single Halo", "Double Halo", "Fancy Shape of Diamond", "Quad", "TM", "Colour Diamond", "Color Stone"]
            },
            "3Stone": {
                "sub1": ["Sol", "Sol+", "Cluster", "Composite", "Multistone", "Basic"],
                "sub2": ["Classic", "Single Halo", "Double Halo", "Fancy Shape of Diamond", "Quad", "TM", "Colour Diamond", "Color Stone"]
            },
            "Fashion1": {
                "sub1": ["Cluster", "Composite", "Multistone", "Circle", "Heart", "Cross"],
                "sub2": ["Classic", "Single Halo", "Fancy Shape Diamond", "Baguette", "Micro Pave", "Bold Gold", "Texture", "TM", "Color Diamond", "Color Stone"]
            },
            "Fashion2": {
                "sub1": ["Infinity", "Keys", "Lock and Keys", "Lockets", "Medallion", "Zodiac / Alphabet", "Butterfly / dragon fly / beetel / honey bee / crab / elephant / owl", "Charms (sandals / wine glass / cup cake / guitar / horse shoe / crown / Snow flakes / star / moon / sun)"],
                "sub2": ["Classic", "Baguette", "Bold gold", "TM", "Color diamond", "Color stone", "Micro pave", "Texture"]
            }
        },
        "Necklace": {
            "Basic": {
                "sub1": ["Tennis", "Sol", "Sol+", "Cluster", "Composite", "Multistone", "Choker", "3-Stone/5-stone"],
                "sub2": ["Classic", "Single Halo", "Double Halo", "Composite", "Multistone", "Cluster", "Fancy Shape of Diamond", "TM", "Colour Diamond", "Color Stone"]
            },
            "Fashion": {
                "sub1": ["Y Necklace", "Bar necklace", "Diamond by yard", "Circle", "Heart", "Cross", "Cluster", "Composite", "Multistone", "Fancy", "Choker", "Cuban", "Paper Clip", "Alphabets / Zodiac", "Butterfly / dragon fly / beetel / honey bee / crab / elephant / owl / star / moon / sun", "Charm (evil eye / lock n key)", "Infinity", "Geometric"],
                "sub2": ["Classic", "Layering", "Color Stone", "Colour Diamond", "Cluster", "Baguette", "Chevron", "Fancy Shape of Diamond", "TM", "Bold gold", "Texture", "Color diamond"]
            }
        }
    }

    # Iterate through the dictionary to build the parent-child links
    for main_name, categories in cascade_data.items():
        main_cat = MainCategory(name=main_name)
        db.add(main_cat)
        db.commit() # Commit so we get the main_cat.id
        db.refresh(main_cat)

        for cat_name, subcategories in categories.items():
            cat = Category(name=cat_name, main_category_id=main_cat.id)
            db.add(cat)
            db.commit() # Commit so we get the cat.id
            db.refresh(cat)

            for sub1_name in subcategories["sub1"]:
                db.add(Subcategory1(name=sub1_name, category_id=cat.id))
            
            for sub2_name in subcategories["sub2"]:
                db.add(Subcategory2(name=sub2_name, category_id=cat.id))
            
            db.commit() # Final commit for the subcategories

    print("Success! Database has been fully populated.")
    db.close()

if __name__ == "__main__":
    seed_database()