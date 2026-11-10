#!/usr/bin/env python3
"""ดาวน์โหลดไฟล์ต้นฉบับข้อสอบ ธ.ก.ส. (.docx) จาก Google Drive (public link)
แล้วแตกเป็นข้อความเรียงตามโครงเอกสาร (ย่อหน้า + ตาราง + marker รูปภาพ) พร้อมคัดลอกไฟล์รูป

usage: python tools/bank_extract.py <out_dir>
"""
import os
import re
import sys
import shutil
import zipfile
import urllib.request

from docx import Document
from docx.oxml.ns import qn

MANIFEST = [
    ("bank01", "1ddYQqg0VAWBwekTMJd2DHZiXyO3OmQ_R"),  # 01_คลังข้อสอบ_300ข้อ
    ("p11", "194lJDqKcBiB3XfmhYWDUR0lmedtynSed"),     # 05_พาร์ท1-1
    ("p12", "1zpBII38ZT80Vnn6nhR2aDlxRyTc_gvz8"),     # 06_พาร์ท1-2
    ("p13", "19sdHQlRGeW7nhRYxRVnb-lOKropxmS4E"),     # 07_พาร์ท1-3
    ("p14", "1ehBzC3WYOAmS1q1QAFfcQBG11EJawV-O"),     # 08_พาร์ท1-4
    ("p15", "1y3hI0NrR-Igev4-1ltH6M8g7s7Dt_H_D"),     # 09_พาร์ท1-5
    ("p31", "14PVBgEtWB6R3AwVOMslTOLjC45pI3KLz"),     # 10_พาร์ท3-1
    ("p32", "11kqB_qwe9CL6eqvoFfgENYAbnidHStdN"),     # 11_พาร์ท3-2
    ("p33", "1A3fXRgn5LTFbNrSYnZDNG98uB0twvwyO"),     # 12_พาร์ท3-3
    ("p34", "14JYO15wEElnByMrisPquLR95xhspswlA"),     # 13_พาร์ท3-4
    ("p35", "1VHeGn7XnzAV4jyt6qz3a0fH4jL8qkVcX"),     # 14_พาร์ท3-5
]

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) bank-fetch"}


def download(file_id: str, dst: str) -> None:
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    req = urllib.request.Request(url, headers=UA)
    data = urllib.request.urlopen(req, timeout=120).read()
    if data[:2] != b"PK":  # อาจเจอหน้า confirm สแกนไวรัส
        m = re.search(rb'href="(/uc\?export=download[^"]+)"', data)
        if m:
            link = m.group(1).decode().replace("&amp;", "&")
            req = urllib.request.Request("https://drive.google.com" + link, headers=UA)
            data = urllib.request.urlopen(req, timeout=120).read()
    if data[:2] != b"PK":
        raise RuntimeError(f"download failed for {file_id}: not a docx (got {len(data)} bytes, head={data[:32]!r})")
    with open(dst, "wb") as f:
        f.write(data)


def iter_blocks(doc: Document):
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    body = doc.element.body
    for child in body.iterchildren():
        if child.tag == qn("w:p"):
            yield ("p", Paragraph(child, doc))
        elif child.tag == qn("w:tbl"):
            yield ("tbl", Table(child, doc))


def extract(docx_path: str, out_txt: str, media_dir: str) -> dict:
    doc = Document(docx_path)
    lines = []
    img_count = 0
    for kind, block in iter_blocks(doc):
        if kind == "tbl":
            lines.append("[TABLE]")
            for row in block.rows:
                cells = [c.text.replace("\n", " ").strip() for c in row.cells]
                lines.append("| " + " | ".join(cells))
            lines.append("[/TABLE]")
            continue
        p = block
        imgs = []
        for blip in p._p.findall(".//" + qn("a:blip")):
            rid = blip.get(qn("r:embed"))
            if not rid:
                continue
            try:
                part = doc.part.related_parts[rid]
                imgs.append(str(part.partname))  # e.g. /word/media/image3.png
            except KeyError:
                pass
        text = p.text or ""
        if imgs:
            for name in imgs:
                img_count += 1
                lines.append(f"[IMG {name}]")
        if text.strip():
            lines.append(text.rstrip())
        elif imgs:
            lines.append("")
    with open(out_txt, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    # คัดลอก media ทั้งหมดออกมา
    os.makedirs(media_dir, exist_ok=True)
    n_media = 0
    with zipfile.ZipFile(docx_path) as z:
        for name in z.namelist():
            if name.startswith("word/media/"):
                base = os.path.basename(name)
                with z.open(name) as src, open(os.path.join(media_dir, base), "wb") as dst2:
                    shutil.copyfileobj(src, dst2)
                n_media += 1
    return {"images_referenced": img_count, "media_files": n_media}


def main() -> None:
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "out_bank"
    os.makedirs(out_dir, exist_ok=True)
    report = []
    for key, fid in MANIFEST:
        docx_path = os.path.join(out_dir, f"{key}.docx")
        txt_path = os.path.join(out_dir, f"{key}.txt")
        media_dir = os.path.join(out_dir, "media", key)
        print(f"== {key} : {fid}")
        download(fid, docx_path)
        size = os.path.getsize(docx_path)
        stats = extract(docx_path, txt_path, media_dir)
        os.remove(docx_path)  # ไม่เอา docx ดิบเข้า artifact (ลดขนาด)
        nlines = sum(1 for _ in open(txt_path, encoding="utf-8"))
        report.append((key, size, nlines, stats["images_referenced"], stats["media_files"]))
        print(f"   ok: {size} bytes -> {nlines} lines, {stats['images_referenced']} img refs, {stats['media_files']} media")
    with open(os.path.join(out_dir, "REPORT.txt"), "w", encoding="utf-8") as f:
        for r in report:
            f.write("\t".join(map(str, r)) + "\n")
    print("DONE")


if __name__ == "__main__":
    main()
