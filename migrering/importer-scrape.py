"""Importerer bildepakken fra scraperen (HANDOFF-anitarufuspamer.md) til repoet.

Kjør:  python3 migrering/importer-scrape.py <sti til anitarufuspamer-utstillinger>

- Konverterer bildene til WebP (kvalitet 80, maks 2400 px) i images/utstillinger/<slug>/.
  Filnavnene beholdes fra pakken (bare filendelsen endres), så de kan spores i oversikt.csv.
- Coveret blir heroImage. Nummererte bilder som er identiske med coveret, og
  WebP-kopier av samme bilde (De 5 elementer), tas ikke med som verk.
- Verkstittel, teknikk og mål hentes fra originalfilnavnet der det følger mønsteret
  «Tittel, Teknikk, Mål». Ellers står tittelen tom og "todo" er satt.
- Eksisterende tekster fra den gamle siden legges inn ordrett.
Felt som allerede er fylt ut i content/exhibitions.json, overskrives ikke (unntatt bilder og verk).
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1])

# Mappe i pakken -> slug i dette prosjektet (slugene i _redirects).
FOLDERS = {
    "1-til-1 Gyldenpris Kunsthall": "1-til-1-gyldenpris-kunsthall",
    "Alt mellom himmel og jord": "alt-mellom-himmel-og-jord",
    "Vårslipp": "varslipp",
    "Alt jeg ikke ser - Alt jeg ikke føler": "alt-jeg-ikke-ser-alt-jeg-ikke-vet-alt-jeg-ikke-foler",
    "De 5 elementer": "de-5-element",
    "Vandreutstilling": "vandreutstillinger",
    "Get it for cheap": "get-it-for-cheap",
    "Min vei til master": "min-vei-til-master",
    "Masterutstilling 2018": "masterutstilling-2018",
    "Dyreriket": "khib-og-uib",
    "Midt i jungelen": "bachelorutstilling-2016",
    "Høstfarger": "luftskipet",
}

# Tekster fra den gamle siden, ordrett (se HANDOFF, «Eksisterende tekster»).
TEXTS = {
    "khib-og-uib": "Igjennom mine fem år på KhiB og UiB har jeg laget flere arbeid som er inspirert av naturen og naturens forandringer.",
    "luftskipet": "Igjennom mine studier hadde jeg og galleri Luftskipet en avtale om å vise min framgang igjennom kunststudiene.",
    "masterutstilling-2018": "Våren 2018 var mine arbeid en del av masterutstillingen \"F_r_i_d_a_y the 13th\". Jeg stilte ut 4 forskjellige arbeid med titlene \"berørt\"- \"Urørt\"- \"Lille Lungegård vann\"-\"Vågen\".",
    "bachelorutstilling-2016": "Våren 2016 var mitt arbeid en del av bachelorustillingen \"m.o.n.o.n.o.a.w.a.r.e\" i Lille lungegårdsvann.",
}

# Bilder der tittelen står i filnavnet uten mønsteret over (stavemåte fra utstillingsteksten).
TITLES = {
    "masterutstilling-2018-10": "Vågen",
    "masterutstilling-2018-13": "Lille Lungegård vann",
}

# Bilder som er kopier av et annet bilde i samme utstilling (funnet med bildesammenligning).
SKIP = {
    "de-5-elementer-05", "de-5-elementer-08", "de-5-elementer-09",  # samme som coveret
    "de-5-elementer-07", "de-5-elementer-11", "de-5-elementer-13", "de-5-elementer-15",
    "de-5-elementer-17", "de-5-elementer-19", "de-5-elementer-21",  # WebP-kopi av forrige JPG
}


def size_text(s):
    """«100-90cm» -> «100 × 90 cm», «50-60» -> «50 × 60», «A3» -> «A3»."""
    s = s.strip().rstrip(".")
    m = re.fullmatch(r"(\d+)\s*-\s*(\d+)\s*(cm)?", s, re.I)
    if m:
        return f"{m[1]} × {m[2]}" + (" cm" if m[3] else "")
    return s if re.fullmatch(r"A\d", s, re.I) else ""


def parse(name):
    """«Onsdag, Olje, 100-100cm-2.JPG» -> (tittel, teknikk, mål). Tomt hvis ingen mønster.
    Webnode legger noen ganger «-N» bak filnavnet; prøv med løpenummeret fjernet først."""
    base = re.sub(r"\.(jpe?g|png|webp)$", "", name, flags=re.I)
    for stem in (re.sub(r"-\d+$", "", base), base):
        result = _parse(stem)
        if result[2]:
            return result
    return "", "", ""


def _parse(stem):
    if re.fullmatch(r"(IMG|DSC)[_ ].*|[0-9A-F-]{20,}|\d+|anita\d+stor|.*stor", stem, re.I):
        return "", "", ""
    parts = [p.strip() for p in stem.split(",")]
    if len(parts) < 2:
        return "", "", ""
    size = size_text(parts[-1])
    if not size:
        # «Pakten, Kullstift A3» / «Kyanitt, Olje og gull. 100-90cm»
        m = re.fullmatch(r"(.*?)[\s.]+(A\d|\d+\s*-\s*\d+\s*(?:cm)?)", parts[-1], re.I)
        if not m:
            return "", "", ""
        parts[-1:] = [m[1], m[2]]
        size = size_text(parts[-1])
    head = parts[:-1]
    if len(head) == 1:  # «H2O Kullstift, A3»
        m = re.fullmatch(r"(\S+)\s+(.+)", head[0])
        title, tech = (m[1], m[2]) if m else (head[0], "")
    elif len(head) == 2 and "." in head[1]:  # «Apkolypse, midletidig. Kritt og Kull»
        rest, tech = head[1].split(".", 1)
        title = f"{head[0]}, {rest.strip()}"
    elif re.search(r"\b(olje|akryl|kritt|kull|kullstift)\b", head[1], re.I) and len(head) == 2:
        title, tech = head
    else:
        # «Apkolypse, midletidig. Kritt og Kull» / «Mandag, Olje, gull, kobber og sølv»
        first_tech = next((i for i, p in enumerate(head) if re.search(r"\b(olje|akryl|kritt|kull)", p, re.I)), 1)
        title = ", ".join(head[:first_tech])
        tech = ", ".join(head[first_tech:])
        m = re.fullmatch(r"(.*?)\.\s*(.+)", title)
        if m and not tech:
            title, tech = m[1], m[2]
        elif m and re.search(r"\b(kritt|kull)", m[2], re.I):
            title, tech = m[1], m[2] + (", " + tech if tech else "")
    tech = re.sub(r"\s*,\s*", ", ", tech.strip(" -.")).strip()
    if tech in {"--", "-"}:
        tech = ""
    tech = tech[:1].upper() + tech[1:]
    return title.strip(), tech, size


def convert(src, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im.thumbnail((2400, 2400))
    im.save(dest, "WEBP", quality=80, method=6)


def main():
    manifest = json.loads((SRC / "manifest.json").read_text("utf-8"))
    ex_path = ROOT / "content/exhibitions.json"
    exhibitions = json.loads(ex_path.read_text("utf-8"))
    by_slug = {e["slug"]: e for e in exhibitions}

    for entry in manifest:
        folder = entry["mappe"]
        if folder == "_Om meg":
            b = entry["bilder"][0]
            convert(SRC / b["fil"], ROOT / "images/om-meg/anita-rufus-pamer.webp")
            site_path = ROOT / "content/site.json"
            site = json.loads(site_path.read_text("utf-8"))
            site["about"]["portrait"] = "om-meg/anita-rufus-pamer.webp"
            site["about"]["portraitAlt"] = "Anita Rufus Pamer står foran et stort svart-hvitt maleri"
            site_path.write_text(json.dumps(site, ensure_ascii=False, indent=2) + "\n", "utf-8")
            continue
        if folder not in FOLDERS:
            continue  # _Forside: avklares
        slug = FOLDERS[folder]
        ex = by_slug[slug]
        out_dir = Path("utstillinger") / slug
        for old in (ROOT / "images" / out_dir).glob("*.webp"):
            old.unlink()

        cover = entry.get("cover")
        cover_stem = ""
        if cover:
            stem = Path(cover["fil"]).stem
            convert(SRC / cover["fil"], ROOT / "images" / out_dir / f"{stem}.webp")
            ex["heroImage"] = str(out_dir / f"{stem}.webp")
            t, tech, _ = parse(cover["originalnavn"])
            ex["heroAlt"] = (f"{t}" + (f", {tech.lower()}" if tech else "") + ". " if t else "") + f"Fra utstillingen {ex['title']}"
            cover_bytes = (SRC / cover["fil"]).read_bytes()
        works = []
        for b in sorted(entry["bilder"], key=lambda x: x["rekkefolge"]):
            stem = Path(b["fil"]).stem
            if stem in SKIP or (cover and (SRC / b["fil"]).read_bytes() == cover_bytes):
                continue
            convert(SRC / b["fil"], ROOT / "images" / out_dir / f"{stem}.webp")
            title, tech, size = parse(b["originalnavn"])
            title = TITLES.get(stem, title)
            work = {"title": title, "technique": tech, "size": size, "year": "",
                    "image": str(out_dir / f"{stem}.webp"), "status": ""}
            if title:
                work["alt"] = f"{title}" + (f", {tech.lower()}" if tech else "") + f". Fra utstillingen {ex['title']}"
            else:
                work["alt"] = f"Fra utstillingen {ex['title']}, bilde {len(works) + 1}"
                work["todo"] = "Verkstittel, teknikk, mål og alt-tekst mangler"
            work["kilde"] = b["originalnavn"]
            works.append(work)
        ex["works"] = works
        if slug in TEXTS and not ex.get("text"):
            ex["text"] = TEXTS[slug]
        print(f"{slug:55} hovedbilde: {'ja' if cover else 'nei'}  verk: {len(works):2}  med tittel: {sum(1 for w in works if w['title'])}")

    ex_path.write_text(json.dumps(exhibitions, ensure_ascii=False, indent=2) + "\n", "utf-8")


if __name__ == "__main__":
    main()
