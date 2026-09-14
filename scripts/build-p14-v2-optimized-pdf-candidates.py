"""Build non-destructive PDF optimization candidates from approved P14 v2 masters."""

from pathlib import Path

from PIL import Image
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
PRODUCT = ROOT / "PRODUCTS" / "POKOPIA" / "P14_Cloud_Islands_Planner_v2"
OUTPUT = PRODUCT / "package" / "optimization-candidates"
TEMP = ROOT / "tmp" / "pdfs" / "p14-v2-optimization"

SPECS = (
    ("us-letter", "P*_US_Letter.png", "p14-cloud-islands-planner-v2-letter-optimized-candidate.pdf", (612, 792)),
    ("a4", "P*_A4.png", "p14-cloud-islands-planner-v2-a4-optimized-candidate.pdf", (595.275590551, 841.88976378)),
)


def build(format_name: str, pattern: str, filename: str, page_size: tuple[float, float]) -> None:
    sources = sorted((PRODUCT / "assets" / "imagegen" / format_name).glob(pattern))
    if len(sources) != 10:
        raise RuntimeError(f"Expected 10 approved {format_name} PNG masters, found {len(sources)}.")

    jpeg_dir = TEMP / format_name
    jpeg_dir.mkdir(parents=True, exist_ok=True)
    output = OUTPUT / filename
    OUTPUT.mkdir(parents=True, exist_ok=True)
    if output.exists():
        print(f"Keeping existing candidate: {output}")
        return
    pdf = canvas.Canvas(str(output), pagesize=page_size, pageCompression=1)
    pdf.setTitle("P14 Pokopia Cloud Islands Planner v2")
    pdf.setAuthor("Sugarfield Studio")
    pdf.setSubject("Optimized candidate derived from approved P14 v2 artwork")

    for source in sources:
        jpeg = jpeg_dir / f"{source.stem}.jpg"
        with Image.open(source) as image:
            if image.mode != "RGB":
                # Masters are opaque; RGB conversion is a no-op visually and avoids alpha in a JPEG stream.
                image = image.convert("RGB")
            image.save(jpeg, "JPEG", quality=97, subsampling=0, optimize=True, progressive=True, dpi=(300, 300))
            width, height = image.size
        if (format_name == "us-letter" and (width, height) != (2550, 3300)) or (format_name == "a4" and (width, height) != (2481, 3508)):
            raise RuntimeError(f"Unexpected approved-master dimensions for {source.name}: {width}x{height}.")
        pdf.drawImage(ImageReader(str(jpeg)), 0, 0, width=page_size[0], height=page_size[1], mask=None)
        pdf.showPage()
    pdf.save()


for spec in SPECS:
    build(*spec)
