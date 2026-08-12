# backend/app/services/vision.py
import cv2
import numpy as np
from PIL import Image

def refine_box_to_ink_otsu(gray_img, box):
    """Snaps bounding box tightly around ink strokes using dynamic thresholding.""" #[cite: 6]
    x1, y1, x2, y2 = box
    crop_gray = gray_img[y1:y2, x1:x2]

    # Otsu's Automatic Thresholding to find ink pixels[cite: 6]
    _, ink_mask = cv2.threshold(
        crop_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU #[cite: 6]
    )

    pts = cv2.findNonZero(ink_mask) #[cite: 6]
    if pts is None:
        return box

    rx, ry, rw, rh = cv2.boundingRect(pts) #[cite: 6]
    return [x1 + rx, y1 + ry, x1 + rx + rw, y1 + ry + rh] #[cite: 6]


def is_valid_jewellery_sketch(crop_cv2_bgr, box, page_height):
    """Validates crops and filters out noise and signature blocks.""" #[cite: 4]
    gray = cv2.cvtColor(crop_cv2_bgr, cv2.COLOR_BGR2GRAY) #[cite: 4]
    h, w = gray.shape

    # 1. Discard tiny dust specks[cite: 4]
    if w < 35 or h < 35: #[cite: 4]
        return False

    # 2. Discard extreme aspect ratios (divider lines, page rules)[cite: 4]
    aspect_ratio = float(w) / max(h, 1) #[cite: 4]
    if aspect_ratio > 7.0 or aspect_ratio < 0.14: #[cite: 4]
        return False

    # 3. Discard blank or near-blank crops[cite: 4]
    _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY_INV) #[cite: 4]
    ink_pixels = cv2.countNonZero(thresh) #[cite: 4]
    if ink_pixels < 120: #[cite: 4]
        return False

    # 4. Signature Block Filter[cite: 4]
    x1, y1, x2, y2 = box #[cite: 4]
    is_bottom_zone = (y2 > page_height * 0.85) #[cite: 4]
    if is_bottom_zone and aspect_ratio > 2.0 and h < (page_height * 0.12): #[cite: 4]
        return False

    return True #[cite: 4]


def detect_sketches(pil_image, min_area_pct=0.0006, dilation_kernel_size=(25, 75)):
    """Detects sketches and returns a list of valid bounding boxes."""
    img_np = cv2.cvtColor(np.array(pil_image.convert("RGB")), cv2.COLOR_RGB2BGR) #[cite: 6]
    gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY) #[cite: 6]

    # Dynamic thresholding and Vertical Dilation[cite: 6]
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU) #[cite: 6]
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, dilation_kernel_size) #[cite: 6]
    dilated = cv2.dilate(thresh, kernel, iterations=2) #[cite: 6]

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE) #[cite: 6]

    page_area = pil_image.width * pil_image.height #[cite: 6]
    min_area = page_area * min_area_pct #[cite: 6]

    valid_boxes = []
    
    for cnt in contours: #[cite: 6]
        area = cv2.contourArea(cnt) #[cite: 6]
        if area > min_area: #[cite: 6]
            x, y, w, h = cv2.boundingRect(cnt) #[cite: 6]
            tight_box = refine_box_to_ink_otsu(gray, [x, y, x + w, y + h]) #[cite: 6]
            
            # Extract crop to validate
            tx1, ty1, tx2, ty2 = tight_box
            crop_bgr = img_np[ty1:ty2, tx1:tx2]
            
            # Run validation logic before accepting
            if is_valid_jewellery_sketch(crop_bgr, tight_box, pil_image.height):
                # We return standard Python integers for JSON compatibility
                valid_boxes.append({"x1": int(tx1), "y1": int(ty1), "x2": int(tx2), "y2": int(ty2)})

    # Sort detected boxes top-to-bottom[cite: 6]
    return sorted(valid_boxes, key=lambda b: b["y1"]) #[cite: 6]