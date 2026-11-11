"""Answer extraction (tables + 'N.ตอบ X.' detail blocks)."""
import re
import reader

TH = ['ก', 'ข', 'ค', 'ง']
LETTER = {'ก': 'ก', 'ข': 'ข', 'ค': 'ค', 'ง': 'ง',
          'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D',
          'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D'}


def table(pno):
    groups = []
    for y, pcs in reader.page_rows(pno):
        if groups and abs(groups[-1][0] - y) <= 6:
            groups[-1][1].extend(pcs)
        else:
            groups.append([y, list(pcs)])
    ans = {}
    for y, pcs in groups:
        pcs.sort(key=lambda p: p[0])
        toks = [p[1] for p in pcs]
        i = 0
        while i < len(toks):
            if re.fullmatch(r'\d{1,3}', toks[i]) and i + 1 < len(toks) and re.fullmatch(r'[กขคงจ]', toks[i + 1]):
                ans[int(toks[i])] = toks[i + 1]
                i += 2
            else:
                i += 1
    return ans


def detail(pages):
    """Return {num: {'letter': 'ก'|'A'|..., 'text': answer text, 'explain': str, 'raw': str}}"""
    out = {}
    cur = None
    order = []
    for pno in pages:
        for y, pcs in reader.page_rows(pno):
            t = ' '.join(p[1] for p in pcs).strip()
            if t.startswith('เฉลย'):
                continue
            m = re.match(r'^\s*(\d{1,3})\s*[\.\)]?\s*ตอบ\s*([กขคงจA-Da-d])?\s*[\.\)\,]?\s*(.*)$', t)
            if not m:
                m = re.match(r'^\s*(\d{1,3})\s+ตอบ\s*([กขคงจA-Da-d])?\s*[\.\)\,]?\s*(.*)$', t)
            if m and (m.group(2) or m.group(3)):
                num = int(m.group(1))
                if num in out:
                    cur = out[num]
                else:
                    cur = {'num': num, 'letter': m.group(2) or '',
                           'text': m.group(3).strip(), 'explain': []}
                    out[num] = cur
                    order.append(num)
                # sibling columns of the same row (answers printed side by side)
                for x, tt, b, s in pcs[1:]:
                    m2 = re.match(r'^\s*(\d{1,3})\s*[\.\s]*ตอบ\s*([กขคงจA-Da-d])?\s*[\.\)\,]?\s*(.*)$', tt)
                    if m2:
                        o = {'num': int(m2.group(1)), 'letter': m2.group(2) or '',
                             'text': m2.group(3).strip(), 'explain': []}
                        out[o['num']] = o
                        order.append(o['num'])
                continue
            if cur is None:
                continue
            s = t.strip()
            if not s or s == 'วิธีคิด':
                continue
            if re.fullmatch(r'[\*=]{4,}', s):
                continue
            cur['explain'].append(s)
    for v in out.values():
        lines = [x for x in v['explain'] if x.strip()]
        v['explain'] = '\n'.join(lines).strip()
        # The printed key line itself carries the option text, so the block must
        # always open with it: that is what makes an answer readable on its own.
        letter = v.get('letter') or ''
        text = (v.get('text') or '').strip()
        head = ('เฉลยข้อ %s. %s' % (letter, text)).strip() if text else ''
        if head and not v['explain'].startswith(head):
            v['explain'] = (head + ('\n' + v['explain'] if v['explain'] else '')).strip()
    return out


if __name__ == '__main__':
    a = table(34)
    print('table1', len(a), a[1], a[50])
    b = table(46)
    print('table2', len(b), b[1], b[50])
    d = detail(range(16, 20))
    print('detail general', len(d))
    print(d[6])
