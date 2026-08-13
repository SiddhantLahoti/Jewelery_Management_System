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
            
            # Extract tight coordinates
            tx1, ty1, tx2, ty2 = tight_box
            
            # --- 10% PADDING LOGIC ---
            box_w = tx2 - tx1
            box_h = ty2 - ty1
            pad_x = int(box_w * 0.10)
            pad_y = int(box_h * 0.10)
            
            # Apply padding while keeping it strictly inside image boundaries
            img_h, img_w = img_np.shape[:2]
            px1 = max(0, tx1 - pad_x)
            py1 = max(0, ty1 - pad_y)
            px2 = min(img_w, tx2 + pad_x)
            py2 = min(img_h, ty2 + pad_y)
            
            # Extract padded crop to validate
            crop_bgr = img_np[py1:py2, px1:px2]
            
            # Run validation logic before accepting (passing the padded coordinates)
            if is_valid_jewellery_sketch(crop_bgr, [px1, py1, px2, py2], pil_image.height):
                # We return standard Python integers for JSON compatibility
                valid_boxes.append({"x1": int(px1), "y1": int(py1), "x2": int(px2), "y2": int(py2)})
    # Sort detected boxes top-to-bottom[cite: 6]
    return sorted(valid_boxes, key=lambda b: b["y1"]) #[cite: 6]