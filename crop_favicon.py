
from PIL import Image, ImageOps, ImageDraw

def process_favicon(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    
    # Get bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    # Make it a perfect square
    width, height = img.size
    size = max(width, height)
    
    # Create a new square transparent image
    new_img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    
    # Calculate position to center the cropped image
    x = (size - width) // 2
    y = (size - height) // 2
    
    new_img.paste(img, (x, y))
    
    # To make it "round", we could optionally add a circular mask or background,
    # but normally just tightly cropping it makes it large and round enough if the logo is circular.
    # The user screenshot shows the logo itself is oval/round. 
    # Let us just resize it to standard favicon sizes like 192x192 just in case.
    new_img = new_img.resize((192, 192), Image.Resampling.LANCZOS)
    
    new_img.save(output_path, format="PNG")
    print("Favicon processed and saved.")

process_favicon("public/brand-emblem.png", "public/brand-emblem.png")

