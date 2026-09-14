"""Build lossless, versioned P17 proof graphics from approved PDFs and exact copy.

The screenshot crops are visual references only. This script renders source-PDF art
at 300 DPI, draws the approved informational panels deterministically, and writes
1920px masters plus lossless responsive derivatives.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/products/pokopia/completionist-kit"
TMP = ROOT / "tmp/p17-proof-render"
FIELD_GUIDE = ROOT / "PRODUCTS/POKOPIA/P17_Completionist_Kit_Final/customer-files/Pokopia-Field-Guide-US-Letter.pdf"
CARD_COLLECTION = ROOT / "PRODUCTS/POKOPIA/P17_Completionist_Kit_Final/customer-files/Pokopia-26-Card-Reference-Collection.pdf"
POPLER = shutil.which("pdftoppm") or "pdftoppm"
FONT_REGULAR = Path("C:/Windows/Fonts/arial.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")
FONT_DISPLAY = Path("C:/Windows/Fonts/comicbd.ttf")
WIDTH = 1920


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def render_pdf_page(pdf: Path, page: int, output_name: str) -> Image.Image:
    TMP.mkdir(parents=True, exist_ok=True)
    prefix = TMP / output_name
    subprocess.run([POPLER, "-f", str(page), "-l", str(page), "-r", "300", "-png", str(pdf), str(prefix)], check=True)
    output = next(TMP.glob(f"{output_name}-*.png"))
    return Image.open(output).convert("RGBA")


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill: str, outline: str | None = None, width: int = 1) -> None:
    draw.rounded_rectangle(box, radius, fill=fill, outline=outline, width=width)


def gradient(size: tuple[int, int], start: tuple[int, int, int], end: tuple[int, int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(round(start[i] + (end[i] - start[i]) * ratio) for i in range(3))
        for x in range(width):
            pixels[x, y] = color
    return image


def fit(image: Image.Image, box: tuple[int, int], padding: int = 0) -> Image.Image:
    available_width, available_height = box[0] - padding * 2, box[1] - padding * 2
    ratio = min(available_width / image.width, available_height / image.height)
    return image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)


def paste_center(canvas: Image.Image, image: Image.Image, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = box
    resized = fit(image, (x2 - x1, y2 - y1), 20)
    x = x1 + ((x2 - x1) - resized.width) // 2
    y = y1 + ((y2 - y1) - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))


def draw_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, face: ImageFont.FreeTypeFont, fill: str, spacing: int = 8) -> None:
    draw.multiline_text(xy, text, font=face, fill=fill, spacing=spacing)


def panel_base(title: str, number: str, start: tuple[int, int, int], end: tuple[int, int, int], height: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    canvas = Image.new("RGBA", (WIDTH, height), "#fbfaff")
    draw = ImageDraw.Draw(canvas)
    rounded(draw, (4, 4, WIDTH - 4, height - 4), 42, "#fdfcff", "#ded5f1", 6)
    header = gradient((WIDTH - 12, 168), start, end).convert("RGBA")
    mask = Image.new("L", header.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, header.width, header.height + 38), 35, fill=255)
    canvas.paste(header, (6, 6), mask)
    rounded(draw, (38, 26, 146, 134), 54, "#ffffff", "#f6f4ff", 8)
    draw.text((69, 39), number, font=font(FONT_DISPLAY, 66), fill="#ffffff", stroke_width=5, stroke_fill="#6e43bb")
    draw.text((183, 48), title, font=font(FONT_DISPLAY, 59), fill="#ffffff", stroke_width=3, stroke_fill="#7252a4")
    return canvas, draw


def check(draw: ImageDraw.ImageDraw, x: int, y: int, color: str = "#8750c8") -> None:
    draw.ellipse((x, y, x + 34, y + 34), fill=color)
    draw.line((x + 9, y + 18, x + 15, y + 25, x + 27, y + 10), fill="white", width=5)


def build_field_guide(source: Image.Image) -> Image.Image:
    canvas, draw = panel_base("FIELD GUIDE QUICK REFERENCE", "1", (205, 169, 242), (166, 106, 202), 875)
    rounded(draw, (35, 195, 1230, 825), 30, "#fffefd", "#eee8f8", 4)
    # Page 1 is the approved quick-reference source; crop its table-heavy middle.
    crop = source.crop((70, 350, source.width - 70, source.height - 260))
    paste_center(canvas, crop, (52, 215, 1198, 804))
    draw_text(draw, (1285, 243), "Quickly look up\nPokémon flavors,\nreference data, and\nuseful information\nat a glance.", font(FONT_BOLD, 44), "#3d3a58", 12)
    draw_text(draw, (1285, 535), "Find what you need\nfast, so you can plan\nyour next steps.", font(FONT_REGULAR, 39), "#69617f", 12)
    return canvas


def build_card_example(source: Image.Image) -> Image.Image:
    canvas, draw = panel_base("REFERENCE CARD EXAMPLE", "2", (143, 194, 248), (104, 159, 222), 863)
    rounded(draw, (35, 195, 1175, 813), 30, "#fffefd", "#e4edf9", 4)
    # Direct PDF render, cropped to the dense data regions of the approved Cave Mushroom card.
    crop = source.crop((80, int(source.height * 0.38), source.width - 80, source.height - 85))
    paste_center(canvas, crop, (53, 214, 1155, 792))
    draw_text(draw, (1224, 210), "Each card shows\neverything you need\nto know about an\ningredient or item.", font(FONT_BOLD, 39), "#34334e", 10)
    labels = ["Best uses & locations", "Cooking information", "Creature preferences", "Best pairings", "Effects & bonuses", "Rarity & difficulty"]
    for index, label in enumerate(labels):
        y = 430 + index * 55
        check(draw, 1224, y)
        draw.text((1272, y - 2), label, font=font(FONT_BOLD, 33), fill="#55406e")
    return canvas


def draw_leaf(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    draw.ellipse((x + 14, y, x + 102, y + 150), outline="#4e9d3c", width=12)
    draw.line((x + 7, y + 153, x + 88, y + 25), fill="#4e9d3c", width=12)


def draw_pot(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    rounded(draw, (x + 25, y + 50, x + 120, y + 130), 20, "#f2e5ff", "#7542bd", 10)
    draw.arc((x + 45, y + 5, x + 103, y + 77), 180, 360, fill="#7542bd", width=9)
    draw.line((x + 18, y + 58, x + 4, y + 90), fill="#7542bd", width=9)
    draw.line((x + 127, y + 58, x + 142, y + 90), fill="#7542bd", width=9)


def draw_star(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    points = [(x + 65, y), (x + 81, y + 45), (x + 130, y + 48), (x + 90, y + 77), (x + 105, y + 126), (x + 65, y + 98), (x + 25, y + 126), (x + 40, y + 77), (x, y + 48), (x + 49, y + 45)]
    draw.polygon(points, fill="#ffd84f", outline="#d88700", width=9)


def draw_clipboard(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    rounded(draw, (x + 16, y + 20, x + 128, y + 142), 14, "#f4efff", "#7242b7", 10)
    rounded(draw, (x + 45, y, x + 99, y + 36), 10, "#f4efff", "#7242b7", 9)
    for index in range(3):
        check(draw, x + 35, y + 54 + index * 27, "#8252ca")
        draw.line((x + 75, y + 72 + index * 27, x + 111, y + 72 + index * 27), fill="#8252ca", width=6)


def build_how_cards_help() -> Image.Image:
    canvas, draw = panel_base("HOW THE CARDS HELP", "3", (159, 225, 151), (120, 191, 111), 881)
    cards = [
        (55, 205, "Easier ingredient\ndecisions", "Know what to keep,\ncook, and use.", draw_leaf),
        (980, 205, "Faster recipe\nplanning", "See best pairings\nand meal types.", draw_pot),
        (55, 505, "Better buff\ntargeting", "Find the right items\nfor your goals.", draw_star),
        (980, 505, "Simpler completion\ntracking", "Check things off and\nsee what's next.", draw_clipboard),
    ]
    for x, y, heading, body, icon in cards:
        rounded(draw, (x, y, x + 875, y + 245), 30, "#fffefa", "#e5efdc", 4)
        icon(draw, x + 40, y + 45)
        draw_text(draw, (x + 245, y + 38), heading, font(FONT_BOLD, 42), "#3d3562", 6)
        draw_text(draw, (x + 245, y + 139), body, font(FONT_REGULAR, 32), "#656078", 6)
    return canvas


def document_icon(draw: ImageDraw.ImageDraw, x: int, y: int, label: str, color: str) -> None:
    rounded(draw, (x, y, x + 260, y + 350), 24, "#faf8ff", color, 10)
    draw.polygon([(x + 182, y), (x + 260, y + 76), (x + 182, y + 76)], fill="#ede8ff", outline=color)
    draw.multiline_text((x + 47, y + 125), label, font=font(FONT_BOLD, 52), fill=color, align="center", spacing=3)


def build_download_formats() -> Image.Image:
    canvas, draw = panel_base("DIGITAL DOWNLOAD FORMATS", "4", (255, 210, 108), (248, 178, 63), 896)
    rounded(draw, (35, 195, WIDTH - 35, 845), 30, "#fffefd", "#f3ebdc", 4)
    document_icon(draw, 145, 340, "US\nLETTER", "#6b32ba")
    document_icon(draw, 470, 340, "A4", "#1b73cf")
    labels = ["High-quality, printable PDFs", "Includes US Letter and A4 sizes", "Instant digital access", "One PDF with 26 reference cards", "No physical item ships"]
    for index, label in enumerate(labels):
        y = 290 + index * 94
        check(draw, 900, y, "#f6b43a")
        draw.text((958, y - 4), label, font=font(FONT_BOLD, 37), fill="#55476b")
    return canvas


def save_versions(image: Image.Image, filename: str) -> list[dict[str, int | str]]:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    saved: list[dict[str, int | str]] = []
    stem = filename.removesuffix(".png")
    for width, suffix in ((960, "-960"), (1440, "-1440"), (1920, "")):
        height = round(image.height * width / image.width)
        rendered = image if width == WIDTH else image.resize((width, height), Image.Resampling.LANCZOS)
        destination = OUTPUT / f"{stem}{suffix}.png"
        rendered.convert("RGB").save(destination, "PNG", optimize=True)
        saved.append({"file": destination.name, "width": width, "height": height, "bytes": destination.stat().st_size})
    return saved


def main() -> None:
    field_guide = render_pdf_page(FIELD_GUIDE, 1, "field-guide")
    cave_mushroom = render_pdf_page(CARD_COLLECTION, 1, "cave-mushroom")
    assets = [
        ("p17-proof-field-guide-quick-reference-v2.png", build_field_guide(field_guide), "PDF-rendered Field Guide page 1"),
        ("p17-proof-reference-card-example-v2.png", build_card_example(cave_mushroom), "PDF-rendered Cave Mushroom card page"),
        ("p17-proof-how-cards-help-v2.png", build_how_cards_help(), "deterministic scripted composition"),
        ("p17-proof-digital-download-formats-v2.png", build_download_formats(), "deterministic scripted composition"),
    ]
    manifest = []
    for filename, image, source in assets:
        manifest.extend({**record, "source": source} for record in save_versions(image, filename))
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
