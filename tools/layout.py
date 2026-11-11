import pymupdf, re, json

import os
PDF = os.environ.get('SPECIAL_PDF') or '/tmp/arena-coding-uploads/Baac69 พนักงานการเงินระดับ4 By พี่กุ๊กไก่ติวสอบบัญชี-compressed.pdf'
doc = pymupdf.open(PDF)

HEAD = re.compile(r'^(แนวข้อสอบพนักงานการเงินระดับ 4 ธกส\.|By พี่กุ๊กไก่ ติวสอบบัญชี|\d{1,3})\s*$')


def page_rows(pno):
    """Return list of rows: each row = list of (x, text) pieces, sorted by x."""
    r = doc[pno].get_text('dict')
    items = []
    for b in r['blocks']:
        if b['type'] != 0:
            continue
        for l in b['lines']:
            t = ''.join(s['text'] for s in l['spans'])
            if not t.strip():
                continue
            items.append((round(l['bbox'][1], 1), round(l['bbox'][0], 1), t.rstrip()))
    items.sort(key=lambda i: (i[0], i[1]))
    rows = []
    for y, x, t in items:
        if rows and abs(rows[-1][0] - y) <= 3.2:
            rows[-1][1].append((x, t))
        else:
            rows.append([y, [(x, t)]])
    out = []
    for y, pieces in rows:
        pieces.sort(key=lambda p: p[0])
        out.append((y, pieces))
    return out


def page_images(pno):
    r = doc[pno].get_text('dict')
    imgs = []
    for b in r['blocks']:
        if b['type'] == 1:
            imgs.append(tuple(round(v, 1) for v in b['bbox']))
    imgs.sort(key=lambda b: (b[1], b[0]))
    return imgs


def clean(t):
    return re.sub(r'[ \t\u00a0]+', ' ', t).strip()


def page_text_rows(pno):
    """Rows filtered of headers/footers, joined into a single string per row (x-sorted)."""
    out = []
    for y, pieces in page_rows(pno):
        joined = []
        prev_x = None
        for x, t in pieces:
            if prev_x is not None and x - prev_x < 60:
                joined.append(clean(t))
            else:
                joined.append(' ¶ ' + clean(t))
            prev_x = x
        s = ' '.join(joined)
        if HEAD.match(s.strip()):
            continue
        out.append(s)
    return out


if __name__ == '__main__':
    import sys
    a, b = int(sys.argv[1]), int(sys.argv[2])
    for p in range(a - 1, b):
        print(f'#### PAGE {p+1} ####')
        for row in page_text_rows(p):
            print(row)
        for bb in page_images(p):
            print('  [IMG]', bb)
