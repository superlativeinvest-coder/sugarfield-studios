from pathlib import Path
from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED
from copy import copy

from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4, letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = Path(r"C:\Users\uBunt\Downloads\Sugar_Field_Studio_Automation\PRODUCTS\POKOPIA")
P05 = SOURCE_ROOT / "P05_Guide_Cards_Bundle" / "assets" / "Pokopia_Guide_Cards_Bundle" / "FieldGuide_PC_Sugarfield_Studio" / "FieldGuide_PC_Sugarfield_Studio" / "pokopia_field_guide.pdf"
P04_ZIP = SOURCE_ROOT / "P04_26_Card_Collection" / "assets" / "FieldGuide_Card_Set_Sugarfield_Studio.zip"
OUT = ROOT / "assets" / "fulfillment" / "pokopia" / "completionist-kit"
OUT.mkdir(parents=True, exist_ok=True)


def export_scaled(source: Path, destination: Path, size: tuple[float, float]) -> None:
    reader = PdfReader(str(source))
    writer = PdfWriter()
    target_w, target_h = size
    margin = 18
    first = reader.pages[0]
    source_w = float(first.mediabox.width)
    source_h = float(first.mediabox.height)
    scale = min((target_w - 2 * margin) / source_w, (target_h - 2 * margin) / source_h)
    for original in reader.pages:
        page = writer.add_blank_page(width=target_w, height=target_h)
        page_copy = copy(original)
        page_copy.scale_by(scale)
        x = (target_w - float(page_copy.mediabox.width)) / 2
        y = (target_h - float(page_copy.mediabox.height)) / 2
        page.merge_translated_page(page_copy, x, y)
    with destination.open("wb") as stream:
        writer.write(stream)


def build_card_zip(destination: Path) -> None:
    if not P04_ZIP.exists():
        raise FileNotFoundError(P04_ZIP)
    found: dict[int, tuple[str, bytes]] = {}
    with ZipFile(P04_ZIP) as source:
        for name in source.namelist():
            if not name.lower().endswith(".png"):
                continue
            stem = Path(name).stem
            parts = stem.split()
            if len(parts) != 2 or parts[0].lower() != "card":
                continue
            try:
                number = int(parts[1])
            except ValueError:
                continue
            if 1 <= number <= 26:
                if number in found:
                    raise ValueError(f"Duplicate P04 card number: {number}")
                data = source.read(name)
                with Image.open(BytesIO(data)) as image:
                    image.verify()
                found[number] = (name, data)
    missing = sorted(set(range(1, 27)) - set(found))
    if missing:
        raise ValueError(f"Missing P04 card numbers: {missing}")
    with ZipFile(destination, "w", ZIP_DEFLATED) as target:
        for number in range(1, 27):
            target.writestr(f"Pokopia-Completionist-Kit/cards/Card-{number:02d}.png", found[number][1])


def build_start_here(destination: Path, page_size: tuple[float, float]) -> None:
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="KitTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=24, leading=29, textColor=colors.HexColor("#4f2491"), spaceAfter=14))
    styles.add(ParagraphStyle(name="KitBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=11, leading=16, textColor=colors.HexColor("#302d3d"), spaceAfter=9))
    styles.add(ParagraphStyle(name="KitHead", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=colors.HexColor("#4f2491"), spaceBefore=8, spaceAfter=5))
    doc = SimpleDocTemplate(str(destination), pagesize=page_size, rightMargin=0.65 * inch, leftMargin=0.65 * inch, topMargin=0.65 * inch, bottomMargin=0.65 * inch)
    story = [Paragraph("Pokopia Completionist Kit", styles["KitTitle"]), Paragraph("Start Here", styles["KitHead"]), Paragraph("This digital kit gives you a quick reference guide and a 26-card collection for organizing your Pokopia completion journey.", styles["KitBody"]), Spacer(1, 6)]
    rows = [[Paragraph("Use this", styles["KitHead"]), Paragraph("Open", styles["KitHead"])], [Paragraph("Field Guide", styles["KitBody"]), Paragraph("Use the Letter or A4 PDF for quick game reference while you play.", styles["KitBody"])], [Paragraph("26-Card Collection", styles["KitBody"]), Paragraph("Use the card images for visual reference and collection organization.", styles["KitBody"])], [Paragraph("Print formats", styles["KitBody"]), Paragraph("Choose Letter or A4 based on your printer and writing preference.", styles["KitBody"])]]
    table = Table(rows, colWidths=[1.8 * inch, 4.7 * inch])
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eadfff")), ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#b58ae8")), ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d9c6f2")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    story += [table, Spacer(1, 18), Paragraph("Included at launch", styles["KitHead"]), Paragraph("1 field-guide PDF in US Letter, 1 field-guide PDF in A4, and 1 ZIP containing cards 01 through 26. Card 27 is not included.", styles["KitBody"]), Paragraph("Digital download only. Fan-made by Sugarfield Studio. Not affiliated with Nintendo or The Pokemon Company.", styles["KitBody"])]
    doc.build(story)


if not P05.exists():
    raise FileNotFoundError(P05)
export_scaled(P05, OUT / "pokopia-completionist-kit-field-guide-letter.pdf", landscape(letter))
export_scaled(P05, OUT / "pokopia-completionist-kit-field-guide-a4.pdf", landscape(A4))
build_card_zip(OUT / "pokopia-completionist-kit-26-card-collection.zip")
build_start_here(OUT / "pokopia-completionist-kit-start-here-letter.pdf", landscape(letter))
build_start_here(OUT / "pokopia-completionist-kit-start-here-a4.pdf", landscape(A4))
print(f"Built P17 assets in {OUT}")
