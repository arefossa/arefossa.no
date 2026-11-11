"""Lager nettversjoner av et bilde til /photos/.

Bruk:
    python tools/prepare_photos.py <original.jpeg> <navn>

Lager tre filer i photos/img/: <navn>-960.jpg og <navn>-1920.jpg til det store bildet, og
<navn>-thumb.jpg til miniatyren. Originalene ligger i Drive-mappa arefossa.no/photos, ikke her.

All metadata fjernes (EXIF og XMP: kamera, tidspunkt, eventuelt GPS), fordi repoet og siden er
offentlige. Bare fargeprofilen (ICC) beholdes, så fargene blir riktige. Skriptet skriver ut
målene og opptakstidspunktet, som brukes i photos/index.html.

Krever Pillow: pip install pillow
"""

import sys
from pathlib import Path

from PIL import ExifTags, Image, ImageOps

OUT = Path(__file__).resolve().parent.parent / "photos" / "img"
SIZES = {"960": 960, "1920": 1920, "thumb": 400}


def main(src: str, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as original:
        taken = original.getexif().get_ifd(ExifTags.IFD.Exif).get(ExifTags.Base.DateTimeOriginal)
        icc = original.info.get("icc_profile")
        # Snu bildet etter EXIF-retningen før metadataen forsvinner.
        image = ImageOps.exif_transpose(original).convert("RGB")
    print(f"{name}: {image.width}x{image.height}, tatt {taken or 'ukjent'}")
    for suffix, width in SIZES.items():
        copy = image.copy()
        if copy.width > width:
            copy = copy.resize((width, round(copy.height * width / copy.width)), Image.LANCZOS)
        path = OUT / f"{name}-{suffix}.jpg"
        # Bare ICC-profilen følger med. Ingen exif= eller xmp=, så resten av metadataen er borte.
        copy.save(path, "JPEG", quality=84, progressive=True, optimize=True, icc_profile=icc)
        print(f"  {path.name}: {copy.width}x{copy.height}, {path.stat().st_size // 1024} kB")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
