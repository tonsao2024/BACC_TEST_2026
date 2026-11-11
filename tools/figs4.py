"""Figure cropping v4 — grid cells defined by option label rows/columns."""
import os
import re
import pymupdf
import layout
import reader

RE_Q = re.compile(r'^\s*(\d{1,3})\s*[\.\)]')
PAGE_W = 595.32
GENERATED_KEYS = set()  # pages whose A-D letters are generated keys, not options


_DRAW_CACHE = {}


def page_drawings(pno):
    """Bounding boxes of vector paths (alternatives may be drawn, not embedded)."""
    if pno not in _DRAW_CACHE:
        boxes = []
        for d in layout.doc[pno].get_drawings():
            r = d.get('rect')
            if r is not None and r.width >= 3 and r.height >= 3:
                boxes.append((r.x0, r.y0, r.x1, r.y1))
        _DRAW_CACHE[pno] = boxes
    return _DRAW_CACHE[pno]


def x_clusters(boxes, gap=14):
    """Group art boxes that sit side by side on the same line."""
    out = []
    for b in sorted(boxes, key=lambda r: r[0]):
        if out and b[0] - out[-1][2] <= gap:
            out[-1] = (out[-1][0], min(out[-1][1], b[1]),
                       max(out[-1][2], b[2]), max(out[-1][3], b[3]))
        else:
            out.append(tuple(b))
    return out


def photo_box(pno, qy, band_hi, min_area=9000):
    """Bounding box of a large embedded picture inside a label-less band."""
    arts = [b for b in layout.page_images(pno)
            if b[1] > qy - 6 and b[1] < band_hi
            and (b[2] - b[0]) * (b[3] - b[1]) >= min_area]
    if not arts:
        return None
    x0 = min(b[0] for b in arts) - 4
    y0 = min(b[1] for b in arts) - 4
    x1 = max(b[2] for b in arts) + 4
    y1 = min(max(b[3] for b in arts) + 4, band_hi - 4)
    return (x0, y0, x1, y1)


def art_top(pno, x0, x1, y_lo, y_hi, max_w=300):
    """y of the topmost vector path inside the given x range and band.

    Long horizontal rules (panel borders, separators) are ignored so a cell crop
    is not pulled up to a frame that belongs to the question's figure.
    """
    tops = [b[1] for b in page_drawings(pno)
            if b[2] > x0 and b[0] < x1 and y_lo <= b[1] <= y_hi
            and (b[2] - b[0]) < max_w]
    return min(tops) if tops else None


def art_in(pno, rect, need=3):
    x0, y0, x1, y1 = rect
    n = 0
    for b in page_drawings(pno):
        if b[0] < x1 and b[2] > x0 and b[1] < y1 and b[3] > y0:
            n += 1
            if n >= need:
                return True
    return False


FOOTER = re.compile(r'^(แนวข้อสอบ|By |โดย |หน้า |เฉลย|\d{1,3}$)')


def content_bottom(pno, default=760):
    """y of the last real content row, ignoring page footer/page numbers."""
    ys = []
    for y, pcs in reader.page_rows(pno):
        txt = ' '.join(p[1] for p in pcs).strip()
        if not txt or FOOTER.match(txt):
            continue
        ys.append(y)
    return max(ys) if ys else default


def answer_start(pno):
    """y where the printed answer key (เฉลย…) begins on this page, else None."""
    for y, pcs in reader.page_rows(pno):
        txt = ' '.join(p[1] for p in pcs).strip()
        if txt.startswith('เฉลย'):
            return y
    return None


def page_geom(pno):
    qs, labs = [], []
    for y, pcs in reader.page_rows(pno):
        for x, t, bold, size in pcs:
            m = RE_Q.match(t)
            if m and x < 115 and not bold:
                qs.append((y, x, int(m.group(1))))
                continue
            if re.fullmatch(r'[กขคงจ]\s*[\.\)]?', t):
                labs.append((y, x, t.strip()[0]))
            elif re.fullmatch(r'[A-D]\s*[\.\)]?', t):
                labs.append((y, x, t.strip()[0]))
    qs.sort()
    labs.sort()
    imgs = [bb for bb in layout.page_images(pno) if bb[2] - bb[0] >= 8 and bb[3] - bb[1] >= 8]
    imgs.sort(key=lambda b: (b[1], b[0]))
    return qs, labs, imgs


def label_rows(labs, tol=9):
    rows = []
    for y, x, lab in sorted(labs):
        if rows and abs(rows[-1][0] - y) <= tol:
            rows[-1][1].append((x, lab))
        else:
            rows.append([y, [(x, lab)]])
    return [(y, sorted(p)) for y, p in rows]


def emit_cells(num, pno, band_rows, band_imgs, band_hi, tasks, boxes=True, y_floor=0):
    """Translate one question band (label rows + images) into crop tasks.

    Cells are anchored by the image *top*: an image belongs to the last label
    row that starts at or above it, so tall images bleeding into the next row
    are not lost.
    """
    rows = sorted(band_rows)
    cells = {ri: [] for ri in range(len(rows))}
    for b in band_imgs:
        ri = None
        for i, (ry, _p) in enumerate(rows):
            if ry <= b[1] + 40:
                ri = i
        if ri is None:
            continue
        cells[ri].append(b)
    for ri, (ry, p) in enumerate(rows):
        next_y = rows[ri + 1][0] - 6 if ri + 1 < len(rows) else min(band_hi, ry + 175)
        if len(p) < 4 and cells[ri]:
            # the source printed fewer than four labels on this line: recover the
            # four options by splitting the artwork line at its horizontal gaps
            cl = x_clusters([b for b in cells[ri] if b[2] - b[0] >= 10])
            if len(cl) == 4:
                for ci, cb in enumerate(cl):
                    tasks.append({'num': num, 'page': pno, 'kind': 'opt',
                                  'label': 'กขคง'[ci],
                                  'rect': (min(cb[0], p[ci][0]) - 4 if ci < len(p) else cb[0] - 4,
                                           ry - 4, cb[2] + 4, next_y + 2)})
                continue
        for ci, (lx, lab) in enumerate(p):
            x_hi = p[ci + 1][0] - 4 if ci + 1 < len(p) else PAGE_W
            cell = [b for b in cells[ri] if lx - 8 <= (b[0] + b[2]) / 2 < x_hi + 4]
            if not cell:
                # no embedded raster: the alternatives may be vector art —
                # crop the cell box, but only when it actually holds drawings
                has_sep = lab in 'ABCD'
                if boxes and not has_sep:
                    # extend to the right up to the next printed label so tall
                    # drawings that spill sideways are kept whole
                    right = x_hi - 6
                    for (lx2, _l2) in p[ci + 1:ci + 2]:
                        right = lx2 - 6
                    if right - lx < 60:
                        right = x_hi - 6
                    # start a little above the label: the artwork often sits
                    # higher than its printed ก–ง marker
                    # start just above the label, but never inside the stem figure
                    y_lo = max(y_floor - 5, 0)
                    top = art_top(pno, lx - 4, right, y_lo, ry + 60)
                    y0 = max((top - 6) if top else ry - 9, y_lo)
                    box = (lx - 2, y0, right, min(next_y + 4, ry + 118))
                    # a printed option cell always holds artwork; keep it even if
                    # the vector scanner sees nothing (clipped or rasterised bits)
                    if y0 < box[3] - 8:
                        tasks.append({'num': num, 'page': pno, 'kind': 'box',
                                      'label': lab, 'rect': box})
                continue
            x0 = min([lx - 4] + [b[0] for b in cell])
            x1 = max([lx + 46] + [b[2] for b in cell])
            x0 = max(x0, lx - 30)
            y0 = min([ry - 2] + [b[1] - 2 for b in cell])
            y1 = max([ry + 14] + [b[3] for b in cell])
            y1 = min(y1, max(ry + 175, max(b[3] for b in cell)))
            tasks.append({'num': num, 'page': pno, 'kind': 'opt', 'label': lab,
                          'rect': (x0, min(y0, ry + 40), x1, y1)})


def plan(pages):
    """Return list of figure tasks per question.

    Each task: {'num','page','kind':'stem'|'opt','label','rect'}

    Option labels printed at the very top of a page belong to the last question
    of the previous page, so they are carried over.
    """
    tasks = []
    bands = {}
    carry_num = None
    for pno in pages:
        qs, labs, imgs = page_geom(pno)
        rows = label_rows(labs)
        if qs:
            lead = [(y, p) for y, p in rows if y < qs[0][0] - 4]
            body = [(y, p) for y, p in rows if y >= qs[0][0] - 4]
        else:
            lead, body = rows, []
        if lead and carry_num is not None:
            band_hi = qs[0][0] - 4 if qs else 1e9
            lead_imgs = [b for b in imgs if (b[1] + b[3]) / 2 < band_hi]
            emit_cells(carry_num, pno, lead, lead_imgs, band_hi, tasks)
        if not qs:
            continue
        for qi, (qy, qx, num) in enumerate(qs):
            band_lo = qy - 4
            band_hi = qs[qi + 1][0] - 4 if qi + 1 < len(qs) else 1e9
            bands[num] = (pno, qy, band_hi)
            band_imgs = [b for b in imgs if band_lo <= (b[1] + b[3]) / 2 < band_hi]
            band_rows = [(y, p) for y, p in body if band_lo <= y < band_hi]
            carry_num = num
            if not band_rows:
                for b in band_imgs:
                    tasks.append({'num': num, 'page': pno, 'kind': 'stem', 'label': None,
                                  'rect': b})
                if not band_imgs:
                    box = (62, qy - 2, PAGE_W - 32, min(band_hi - 6, qy + 200))
                    if art_in(pno, box, need=1):
                        tasks.append({'num': num, 'page': pno, 'kind': 'stem',
                                      'label': None, 'rect': box, 'box': True})
                continue
            first_row_y = band_rows[0][0]
            has_stem_img = False
            for b in band_imgs:
                if (b[1] + b[3]) / 2 < first_row_y - 12:
                    tasks.append({'num': num, 'page': pno, 'kind': 'stem', 'label': None,
                                  'rect': b})
                    has_stem_img = True
            y_floor = 0
            if not has_stem_img and first_row_y - qy > 46:
                box = (62, qy + 2, PAGE_W - 32, first_row_y - 12)
                if art_in(pno, box):
                    tasks.append({'num': num, 'page': pno, 'kind': 'stem',
                                  'label': None, 'rect': box, 'box': True})
                    y_floor = box[3] + 6   # keep the stem picture's border out of the cells
            emit_cells(num, pno, band_rows, band_imgs, band_hi, tasks, y_floor=y_floor)
    # A question whose four alternatives could only be approximated by cell
    # boxes (hand-drawn vectors, labels printed apart) is delivered as one
    # faithful strip — exactly as printed in the source — instead of four
    # half-guessed slices.
    by_q = {}
    for t in tasks:
        by_q.setdefault(t['num'], []).append(t)
    out = []
    for num, ts in by_q.items():
        if any(t['kind'] == 'box' for t in ts) and num in bands:
            page, qy, band_hi = bands[num]
            y_end = band_hi - 4
            if y_end > 1e8:
                y_end = max([t['rect'][3] for t in ts] + [qy + 60]) + 6
            else:
                y_end = max(y_end, max([t['rect'][3] for t in ts] + [qy + 60]) + 4)
            y_end = min(y_end, content_bottom(page) + 8)
            ans = answer_start(page)
            if ans is not None:
                y_end = min(y_end, ans - 8)
            art_bottom = max([b[3] for b in layout.page_images(page)
                              if b[1] > qy - 2 and b[1] < y_end]
                             + [b[3] for b in page_drawings(page)
                                if b[1] > qy - 2 and b[1] < y_end] + [qy + 40])
            y_end = max(min(y_end, art_bottom + 3), qy + 40)
            # start just above the first artwork of the band, not at the
            # question number, so a neighbouring instruction line stays out
            # the previous question's artwork may bleed below the number line
            above = [b[3] for b in layout.page_images(page)
                     if b[1] < qy and b[3] > qy - 40]
            above += [b[3] for b in page_drawings(page)
                      if b[1] < qy and b[3] > qy - 40]
            y_start = max(qy + 1, (max(above) + 3) if above else qy + 1)
            y_start = min(y_start, qy + 40)
            out.append({'num': num, 'page': page, 'kind': 'stem', 'label': None,
                        'rect': (62, y_start, PAGE_W - 30, y_end),
                        'box': True, 'pict': True, 'qy': qy})
            continue
        out.extend(ts)
    return out


def trim_edges(im, thresh=235, run_frac=0.35, top_zone=0.4):
    """Trim blank margins and any rule line bleeding in from the panel above.

    A row counts as a rule when one unbroken horizontal ink run covers at least
    `run_frac` of the width; only the top `top_zone` is inspected so the option
    artwork itself is never clipped.
    """
    w, h = im.size
    px = im.load()

    def row_ink(y):
        return sum(1 for x in range(w) if px[x, y] < thresh)

    def row_rule(y):
        best = cur = 0
        for x in range(w):
            if px[x, y] < thresh:
                cur += 1
                best = max(best, cur)
            else:
                cur = 0
        return best >= w * run_frac

    limit = max(1, int(h * top_zone))
    sparse = max(2, int(w * 0.02))   # a lone vertical border line
    top = 0
    while top < h:
        n = row_ink(top)
        if n == 0 or (top < limit and (row_rule(top) or n <= sparse)):
            top += 1
            continue
        break
    bottom = h - 1
    while bottom > top:
        if row_ink(bottom) == 0 or row_rule(bottom):
            bottom -= 1
            continue
        break
    left, right = 0, w - 1
    while left < right:
        if not any(px[left, y] < thresh for y in range(top, bottom + 1)):
            left += 1
        else:
            break
    while right > left:
        if not any(px[right, y] < thresh for y in range(top, bottom + 1)):
            right -= 1
        else:
            break
    m = 4
    box = (max(0, left - m), max(0, top - m), min(w, right + 1 + m), min(h, bottom + 1 + m))
    return im.crop(box) if box[2] > box[0] and box[3] > box[1] else im


def crop(pno, rect, path, dpi=150, pad=3, max_w=680, trim=False, keep_top=False):
    """Render the region, downscale if wider than max_w, save as optimised PNG."""
    from PIL import Image
    page = layout.doc[pno]
    r = pymupdf.Rect(rect[0] - pad, rect[1] - pad, rect[2] + pad, rect[3] + pad) & page.rect
    pix = page.get_pixmap(clip=r, dpi=dpi)
    tmp = path + '.tmp.png'
    pix.save(tmp)
    im = Image.open(tmp).convert('L')
    if trim:
        im = trim_edges(im, top_zone=0.12 if keep_top else 0.4)
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    im.save(path, format='PNG', optimize=True)
    os.remove(tmp)
    return path


if __name__ == '__main__':
    for key, pages in (('general', range(2, 16)), ('precision1', range(20, 35)),
                       ('precision2', range(35, 46))):
        t = plan(list(pages))
        print(key, len(t), 'stem', sum(1 for x in t if x['kind'] == 'stem'))
        for x in t[:14]:
            print('  ', x['num'], x['kind'], x['label'],
                  [round(v) for v in x['rect']], 'p', x['page'] + 1)
