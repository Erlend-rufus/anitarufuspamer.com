#!/usr/bin/env python3
"""Renser bilder som Anita har lastet opp via siden «Bildevask».

Bruk:
  python3 verktoy/bildevask.py <mappe med originaler> <bilder.json> <ut-mappe> [--innhold content/rengjort.json] [--alle]

  <mappe med originaler>  filene heter <id>.<endelse> (id fra bilder-dokumentet)
  <bilder.json>           liste med bilder-dokumentene fra siden (id, type, corners, exhibition, title, filename, status)
  <ut-mappe>              ferdige bilder, forhåndsvisninger og kontrollark. Bruk images/rengjort/ for publisering.

Hva som skjer, per type:
  maleri  Bildet rettes opp og beskjæres til de fire hjørnene Anita har markert. Ingenting inni verket endres,
          og det brukes aldri automatisk bakgrunnsfjerning (den sletter malt bakgrunn, se CLAUDE.md).
  objekt  Verket frilegges med bakgrunnsfjerning (rembg) og beskjæres tett. Gjennomsiktig WebP.
  behold  Bare skalert ned og konvertert.

Alle resultater er WebP, lang side maks 2400 px. Les kontrollarket (kontrollark.jpg) før noe godkjennes.
Verktøyet trenger: pillow, numpy, opencv-python-headless, og rembg[cpu] for «objekt» (laster ned modellen første gang).
"""
import argparse
import base64
import io
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

MAKS = 2400
FORHANDSVIS = 1000
MAKS_TEGN = 190_000  # data-URL i databasen må holde seg under 256 KiB per dokument


def slug(tekst: str) -> str:
    tekst = (tekst or "").lower().replace("æ", "ae").replace("ø", "o").replace("å", "a")
    tekst = unicodedata.normalize("NFKD", tekst).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", tekst)).strip("-")


def last(sti: Path) -> Image.Image:
    # Mobilbilder har orientering i EXIF. Hjørnene på siden er markert på det riktig vendte bildet.
    return ImageOps.exif_transpose(Image.open(sti)).convert("RGB")


def skaler(im: Image.Image, maks: int = MAKS) -> Image.Image:
    k = maks / max(im.size)
    return im if k >= 1 else im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)


def maleri(im: Image.Image, hjorner) -> Image.Image:
    import cv2

    w0, h0 = im.size
    src = np.array([[x * w0, y * h0] for x, y in hjorner], dtype=np.float32)  # TL, TR, BR, BL
    d = lambda a, b: float(np.linalg.norm(src[a] - src[b]))
    w, h = max(d(0, 1), d(3, 2)), max(d(0, 3), d(1, 2))
    k = min(1.0, MAKS / max(w, h))
    w, h = max(2, round(w * k)), max(2, round(h * k))
    dst = np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype=np.float32)
    m = cv2.getPerspectiveTransform(src, dst)
    ut = cv2.warpPerspective(np.array(im), m, (w, h), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    return Image.fromarray(ut)


_sesjon = None


def objekt(im: Image.Image, modell: str) -> Image.Image:
    import cv2
    from rembg import new_session, remove

    global _sesjon
    if _sesjon is None:
        _sesjon = new_session(modell)
    rgba = remove(im, session=_sesjon).convert("RGBA")
    a = np.array(rgba.split()[3])
    # fjern små flekker: behold bare sammenhengende deler som er store nok sammenlignet med den største
    n, merk, stat, _ = cv2.connectedComponentsWithStats((a > 24).astype(np.uint8), connectivity=8)
    if n > 1:
        areal = stat[1:, cv2.CC_STAT_AREA]
        behold = [i + 1 for i, v in enumerate(areal) if v >= 0.02 * areal.max()]
        a = np.where(np.isin(merk, behold), a, 0).astype(np.uint8)
    rgba.putalpha(Image.fromarray(a))
    ys, xs = np.where(a > 10)
    if not len(xs):
        return rgba
    marg = round(0.03 * max(xs.max() - xs.min(), ys.max() - ys.min()))
    box = (max(0, xs.min() - marg), max(0, ys.min() - marg), min(rgba.width, xs.max() + marg + 1), min(rgba.height, ys.max() + marg + 1))
    return rgba.crop(box)


def lagre(im: Image.Image, sti: Path):
    if im.mode == "RGBA":
        im.save(sti, "WEBP", quality=85, alpha_quality=100, method=6)
    else:
        im.save(sti, "WEBP", quality=82, method=6)


def forhandsvisning(im: Image.Image) -> str:
    liten = skaler(im, FORHANDSVIS)
    for q in (80, 70, 60, 50, 40):
        buf = io.BytesIO()
        liten.save(buf, "WEBP", quality=q, method=6, **({"alpha_quality": 80} if liten.mode == "RGBA" else {}))
        url = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
        if len(url) <= MAKS_TEGN:
            return url
    return url


def kontrollark(par, sti: Path):
    h = 360
    rader = []
    for før, etter, navn in par:
        a = skaler(før, h * 3).resize((round(før.width * h / før.height), h))
        e = etter.resize((round(etter.width * h / etter.height), h))
        bakgrunn = Image.new("RGB", e.size, (200, 200, 200))
        for yy in range(0, e.height, 20):
            for xx in range(0, e.width, 20):
                if (xx // 20 + yy // 20) % 2:
                    bakgrunn.paste((235, 235, 235), (xx, yy, xx + 20, yy + 20))
        if e.mode == "RGBA":
            bakgrunn.paste(e, mask=e.split()[3])
        else:
            bakgrunn.paste(e)
        rad = Image.new("RGB", (a.width + bakgrunn.width + 30, h + 24), "white")
        rad.paste(a, (0, 0)); rad.paste(bakgrunn, (a.width + 10, 0))
        from PIL import ImageDraw
        ImageDraw.Draw(rad).text((2, h + 6), navn, fill="black")
        rader.append(rad)
    bredde = max(r.width for r in rader)
    ark = Image.new("RGB", (bredde, sum(r.height + 8 for r in rader)), "white")
    y = 0
    for r in rader:
        ark.paste(r, (0, y)); y += r.height + 8
    ark.save(sti, quality=80)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("originaler"); p.add_argument("bilder"); p.add_argument("ut")
    p.add_argument("--innhold", help="JSON-fil som oppdateres med de ferdige bildene (content/rengjort.json)")
    p.add_argument("--alle", action="store_true", help="ta med alle bilder, ikke bare de som venter på rens")
    p.add_argument("--modell", default="isnet-general-use")
    a = p.parse_args()

    orig, ut = Path(a.originaler), Path(a.ut)
    ut.mkdir(parents=True, exist_ok=True)
    docs = json.loads(Path(a.bilder).read_text("utf-8"))
    rapport, ark, innhold, brukt = [], [], [], set()
    for d in docs:
        if not a.alle and d.get("status") not in ("klar", "omgjoring"):
            continue
        filer = list(orig.glob(d["id"] + ".*"))
        if not filer:
            print("MANGLER original:", d["id"], d.get("filename")); continue
        im = last(filer[0])
        typ = d.get("type")
        if typ == "maleri":
            if not (d.get("corners") and len(d["corners"]) == 4):
                print("MANGLER hjørner:", d["id"]); continue
            res = maleri(im, d["corners"])
        elif typ == "objekt":
            res = objekt(im, a.modell)
        elif typ == "behold":
            res = im
        else:
            print("MANGLER type:", d["id"]); continue
        res = skaler(res)
        navn = "-".join(x for x in (slug(d.get("exhibition") if d.get("exhibition") not in ("", "ingen", None) else "uten-utstilling"), slug(d.get("title")) or d["id"][:6]) if x)
        fil = ut / f"{navn}.webp"
        i = 1
        while fil.name in brukt:
            i += 1
            fil = ut / f"{navn}-{i}.webp"
        brukt.add(fil.name)
        lagre(res, fil)
        (ut / f"{d['id']}.forhandsvisning.txt").write_text(forhandsvisning(res))
        rapport.append({"id": d["id"], "fil": fil.name, "type": typ, "bredde": res.width, "hoyde": res.height, "kb": round(fil.stat().st_size / 1024)})
        ark.append((im, res, f"{d.get('filename')} -> {fil.name} ({typ}, {res.width}x{res.height})"))
        innhold.append({"image": f"rengjort/{fil.name}", "title": d.get("title") or "", "exhibition": d.get("exhibition") or "", "type": typ, "kilde": d.get("filename"), "id": d["id"]})
        print("ok", d["id"], fil.name, f"{res.width}x{res.height}")
    (ut / "rapport.json").write_text(json.dumps(rapport, ensure_ascii=False, indent=2))
    if ark:
        kontrollark(ark, ut / "kontrollark.jpg")
    if a.innhold and innhold:
        sti = Path(a.innhold)
        eksisterende = json.loads(sti.read_text("utf-8")) if sti.exists() else []
        ider = {x["id"] for x in innhold}
        sti.write_text(json.dumps([x for x in eksisterende if x.get("id") not in ider] + innhold, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"{len(rapport)} bilder ferdig.", file=sys.stderr)


if __name__ == "__main__":
    main()
