"""Row-aware page reading + question parsing (v4, final)."""
import re
import layout

RE_Q = re.compile(r'^\s*(\d{1,3})\s*[\.\)]\s*')
TH = ['ก', 'ข', 'ค', 'ง', 'จ']
EN_U = ['A', 'B', 'C', 'D']
EN_L = ['a', 'b', 'c', 'd']


def page_rows(pno):
    """Return [(y, [(x, text, bold, size)])] with header/footer rows removed."""
    r = layout.doc[pno].get_text('dict')
    items = []
    for b in r['blocks']:
        if b['type'] != 0:
            continue
        for l in b['lines']:
            txt = ''.join(s['text'] for s in l['spans'])
            if not txt.strip():
                continue
            bold = all('Bold' in s['font'] for s in l['spans'] if s['text'].strip())
            items.append((round(l['bbox'][1], 1), round(l['bbox'][0], 1),
                          txt.rstrip(), bold,
                          max(s['size'] for s in l['spans'])))
    items.sort(key=lambda i: (i[0], i[1]))
    rows = []
    for y, x, t, bold, size in items:
        if rows and abs(rows[-1][0] - y) <= 4:
            rows[-1][1].append((x, t, bold, size))
        else:
            rows.append([y, [(x, t, bold, size)]])
    out = []
    for y, pcs in rows:
        pcs.sort(key=lambda p: p[0])
        # merge single punctuation pieces into neighbour label
        merged = []
        for x, t, bold, size in pcs:
            if merged and t.strip() in ('.', ')', '．') and len(merged[-1][1].strip()) <= 2:
                px, pt, pb, ps = merged[-1]
                merged[-1] = (px, (pt + t).strip(), pb, ps)
            else:
                merged.append((x, t.strip(), bold, size))
        joined = layout.clean(' '.join(m[1] for m in merged))
        if joined == 'แนวข้อสอบพนักงานการเงินระดับ 4 ธกส.' or joined == 'By พี่กุ๊กไก่ ติวสอบบัญชี':
            continue
        if re.fullmatch(r'\d{1,3}', joined) and (y < 55 or y > 755):
            continue
        out.append((y, merged))
    return out


def label_rx(lab, mode):
    body = re.escape(lab) + r'\s*[\.\)](?!\.\d)'
    if mode == 'loose':
        return re.compile(body)
    if mode == 'medium':
        return re.compile(r'(?<![.])' + body)
    return re.compile(r'(?:^|(?<=[\s]))' + body)


def find_label(text, lab, start, mode):
    rx = label_rx(lab, mode)
    for m in rx.finditer(text, start):
        if lab in 'ABCDabcd' and m.start() > 0:
            prev = text[m.start() - 1]
            if prev.isascii() and prev.isalpha():
                continue
        return m
    return None


def split_opts(text, labels, start_i, mode):
    out, pos, i = [], 0, start_i
    while i < len(labels):
        m = find_label(text, labels[i], pos, mode)
        if not m:
            break
        pre = text[pos:m.start()].strip()
        if pre:
            out.append(('cont', pre))
        start = m.end()
        nxt = len(text)
        for j in range(i + 1, len(labels)):
            m2 = find_label(text, labels[j], start, mode)
            if m2:
                nxt = m2.start()
                break
        out.append(('opt', text[start:nxt].strip()))
        pos = nxt
        i += 1
    rest = text[pos:].strip()
    if rest:
        out.append(('cont', rest))
    return out


def assemble(rows, labels, mode):
    """rows: [(y, [(x, text, ...)])] → {stem, opts:[4], post, label_order}"""
    stem, opts, post = [], [], []
    order = []
    for y, pcs in rows:
        for x, t, bold, size in pcs:
            if len(opts) >= 4:
                post.append(t)
                continue
            segs = split_opts(t, labels, len(opts), mode)
            if segs:
                for kind, txt in segs:
                    if kind == 'opt':
                        if len(opts) < 4:
                            opts.append(txt)
                            order.append(labels[len(opts) - 1])
                        elif txt:
                            post.append(txt)
                    elif opts:
                        opts[-1] = (opts[-1] + ' ' + txt).strip()
                    else:
                        stem.append(txt)
            else:
                if opts:
                    opts[-1] = (opts[-1] + ' ' + t).strip()
                else:
                    stem.append(t)
    return {'stem': ' '.join(s for s in stem if s).strip(),
            'opts': opts, 'post': ' '.join(post).strip()}


RE_ANY_LABEL = re.compile(r'(?:^|(?<=[\s(]))([กขคงจA-D])[\s]*[\.\)](?!\d)')


def assemble_any(rows):
    """Fallback: split by whichever labels actually appear, in reading order.

    Some source questions print their choices with a mislabelled or mixed set
    (ก ง ค ง), so a strict ก→ข→ค→ง scan stops early.
    """
    stem, opts = [], []
    for y, pcs in rows:
        for x, t, bold, size in pcs:
            if len(opts) >= 4:
                continue
            pos = 0
            for m in RE_ANY_LABEL.finditer(t):
                if len(opts) >= 4:
                    break
                pre = t[pos:m.start()].strip()
                if pre:
                    if opts and m.start() > pos and not pre.startswith(('ก.', 'ข.')):
                        opts[-1] = (opts[-1] + ' ' + pre).strip()
                    elif not opts:
                        stem.append(pre)
                nxt = RE_ANY_LABEL.search(t, m.end())
                end = nxt.start() if nxt else len(t)
                opts.append(t[m.end():end].strip())
                pos = end
                if nxt is None:
                    break
            if pos < len(t):
                rest = t[pos:].strip()
                if rest:
                    if opts:
                        opts[-1] = (opts[-1] + ' ' + rest).strip()
                    else:
                        stem.append(rest)
    return {'stem': ' '.join(x for x in stem if x).strip(), 'opts': opts, 'post': ''}


def best_assembly(rows):
    best, best_n = None, -1
    for labels, mode in ((TH, 'strict'), (TH, 'medium'), (TH, 'loose'),
                         (EN_U, 'strict'), (EN_U, 'medium'),
                         (EN_L, 'strict'), (EN_L, 'medium')):
        cand = assemble(rows, labels, mode)
        n = len(cand['opts'])
        if n == 4:
            return cand
        if n > best_n:
            best, best_n = cand, n
    if best_n != 4:
        cand = assemble_any(rows)
        if len(cand['opts']) > best_n:
            best = cand
    return best


def parse_exam(pages, qstart=1):
    blocks = []
    cur = None
    carry = []
    cur_head = None
    for pno in pages:
        for y, pcs in page_rows(pno):
            first = layout.clean(' '.join(p[1] for p in pcs))
            x0 = pcs[0][0]
            bold0 = pcs[0][2]
            m = RE_Q.match(pcs[0][1])
            expect = blocks[-1]['num'] + 1 if blocks else qstart
            if m and int(m.group(1)) == expect and x0 < 115 and not bold0:
                rest = pcs[0][1][m.end():].strip()
                newpcs = ([(pcs[0][0], rest, bold0, pcs[0][3])] if rest else []) + pcs[1:]
                cur = {'num': expect, 'page': pno, 'y': y, 'rows': [(y, newpcs)],
                       'preamble': carry, 'head': cur_head}
                blocks.append(cur)
                carry = []
                continue
            if bold0 and pcs[0][3] >= 13.5 and x0 < 260 and not m and len(pcs) == 1:
                cur_head = first
                if cur is not None:
                    cur['end_head'] = first
                continue
            if cur is None:
                carry.extend(p[1] for p in pcs)
            else:
                cur['rows'].append((y, pcs))
    for b in blocks:
        b.update(best_assembly(b['rows']))
        b.pop('rows')
    for i, b in enumerate(blocks[:-1]):
        if b.get('post'):
            blocks[i + 1]['preamble'] = [b['post']] + blocks[i + 1]['preamble']
    return blocks


def anchor_rows(pages):
    """Anchors for figures: (page, y, x, kind, payload)."""
    anchors = []
    for pno in pages:
        for y, pcs in page_rows(pno):
            for x, t, bold, size in pcs:
                m = RE_Q.match(t)
                if m and x < 115 and not bold:
                    anchors.append((pno, y, x, 'q', int(m.group(1))))
                    continue
                m2 = re.match(r'^([กขคงจ])\s*[\.\)]?\s*$', t)
                if m2:
                    anchors.append((pno, y, x, 'o', m2.group(1)))
                    continue
                m3 = re.match(r'^([A-D])\s*[\.\)]?\s*$', t)
                if m3:
                    anchors.append((pno, y, x, 'o', m3.group(1)))
    anchors.sort(key=lambda a: (a[0], a[1], a[2]))
    return anchors
