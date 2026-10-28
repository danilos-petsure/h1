"""Generate the Claim Submission flow point-matrix diagrams (SVG) from a swimlane model JSON.

Usage: python generate_flow_diagrams.py <model.json> <out_dir>

Rows    = components, columns = points (a service call and/or the event it raises).
Solid   = service-to-service flow derived from the model (through functions and data).
Dashed  = sequence or hand-off added here because the model has no edge for it (see INFERRED).
PNGs in images/ are the SVGs rendered at 1.5x (headless Chromium screenshot).
"""
import json, sys, os, html
from collections import defaultdict

MODEL, OUT = sys.argv[1], sys.argv[2]
d = json.load(open(MODEL, encoding="utf-8"))
N = {n["id"]: n for n in d["nodes"]}
COMP = {c["id"]: c["title"] for c in d["components"]}

# ---------------------------------------------------------------- points
# (point id, service/anchor node id or None, event node id or None)
POINTS = [
    ("P01", "nd_mu68uxr1_1p", "nd_mvqc3sqw_2z"),  # VPMS Submit Medical Record Claim | Claim Submitted from VPMS
    ("P02", "nd_mu68v811_1q", "nd_mvqc3m8f_2y"),  # VetHub Get Conversation ID | Conversation Initiated
    ("P03", "nd_muayr4fq_1l", None),              # VetHub Submit Claim
    ("P04", "nd_muamj8fs_18", "nd_mvqc4jo1_30"),  # VetHub Submit Attachment | Conversation Completed
    ("P05", "nd_mu6asivb_30", "nd_mvqc5sjf_34"),  # COS Poll | Claim Saved in COS
    ("P06", "nd_muamwem4_53", None),              # Claim Automation predict Treatment Code
    ("P07", "nd_muazqstn_bt", None),              # ML Sophia Junior api
    ("P08", None, "nd_mvqc7h9r_39"),              # COS Claim Enriched with Treatment Code
    ("P09", "nd_mu6gmuf9_7o", None),              # CLAPI Submit Claim
    ("P10", "nd_mu6goysj_86", None),              # DAPI Submit Claim
    ("P11", "nd_clapi_attach", None),             # CLAPI Submit Claim Attachment
    ("P12", "nd_dapi_submitdoc", None),           # DAPI Submit Document
    ("P13", "nd_mu6gu2vo_96", None),              # CLAPI Finish Submit Claim
    ("P14", "nd_mu6guoti_9j", None),              # DAPI Finish Submit Claim
    ("P15", "nd_mu6grkf4_8q", None),              # UPM Data Polling (10 min)
    ("P16", "nd_mu6h0sl9_bn", None),              # Dynamic Clapi Lodge
    ("P17", "nd_mu6h3e0c_c2", None),              # UPM Dynamics API Lodge Claim
    ("P18", None, "nd_mvqc6l53_36"),              # COS Claim Lodged in UPM
    ("P19", "nd_mu6h6op0_d9", "nd_mvqcbcej_3e"),  # Dynamic Clapi Claw Init | Clawdia Initialised
    ("P20", "nd_mu6lxtwk_rv", None),              # Clawdia CLAW-INIT-API
    ("P21", "nd_mukvjamj_12", None),              # ML GP Model Endpoint
    ("P22", "nd_mu6hav2r_f6", "nd_mvqccg24_3g"),  # Dynamic Clapi Write Claim | Medical Assessment Completed
    ("P23", "nd_mu6hdxhi_g2", None),              # UPM Dynamics API Write
    ("P24", "nd_mu6hfedd_gj", None),              # Dynamic Clapi GapOnly Benefit
    ("P25", "nd_mu6jpi8o_gx", "nd_mvqcdrnh_3i"),  # COS Gap Only Benefit | Benefit Calculation Saved in COS
    ("P26", "nd_mu6jwbr6_pk", None),              # VetHub Update Gap Benefit Amount
    ("P27", "nd_mu6k3lnu_st", None),              # VPMS Tyro adjudicateClaim webhook
]
# columns: points sharing a column are drawn vertically (same moment, different component)
COLUMNS = [["P01"], ["P02"], ["P03"], ["P04"], ["P05"], ["P06"], ["P07"], ["P08"],
           ["P09", "P10"], ["P11", "P12"], ["P13", "P14"], ["P15"], ["P16"], ["P17"], ["P18"],
           ["P19"], ["P20"], ["P21"], ["P22"], ["P23"], ["P24"], ["P25"], ["P26"], ["P27"]]

# model edges replaced by the inferred COS saga sequence
DROP = {("P05", "P09"), ("P05", "P11"), ("P05", "P13"), ("P05", "P16")}
INFERRED = [
    ("P02", "P03", "same conversationId"),
    ("P03", "P04", "same conversationId"),
    ("P04", "P05", "COS polls new conversations"),
    ("P06", "P08", "callback ClaimsAutomation/Completed"),
    ("P08", "P09", "COS SubmitClaims"),
    ("P09", "P11", "COS next call"),
    ("P11", "P13", "COS next call"),
    ("P13", "P16", "COS next call"),
    ("P14", "P15", "via DS* tables"),
    ("P17", "P18", "lodge response to COS"),
]

QUESTIONS = [
    ("q1", "How long VetHub takes to complete a conversation", "P02", "P04"),
    ("q2", "How long COS takes to receive a claim from the moment a conversation is completed", "P04", "P05"),
    ("q3", "How long COS takes to lodge a claim in UPM from the initial conversation id", "P02", "P18"),
    ("q4", "How long UPM takes to request the Medical Assessment from the initial conversation id", "P02", "P19"),
    ("q6", "How long from the initiation of Clawdia to VetHub receiving the benefit amount", "P19", "P26"),
    ("q7", "How long from COS claim submission to the claim lodged in UPM by Dynamic Clapi", "P09", "P18"),
]

# ---------------------------------------------------------------- derive edges
PT = {p: (s, e) for p, s, e in POINTS}
anchor_to_point = {s: p for p, s, e in POINTS if s}
out = defaultdict(list)
for c in d["connections"]:
    if c["relTypeId"] in ("flow", "serving"):
        out[c["sourceNodeId"]].append(c["targetNodeId"])

def walk(start):
    found, seen, stack = set(), set(), list(out[start])
    while stack:
        x = stack.pop()
        if x in seen:
            continue
        seen.add(x)
        if x in anchor_to_point:
            found.add(anchor_to_point[x]); continue
        stack += out[x]
    return found

EDGES = []  # (src, tgt, kind, label)
for p, s, e in POINTS:
    if s:
        for t in sorted(walk(s)):
            if (p, t) not in DROP:
                EDGES.append((p, t, "model", ""))
EDGES += [(a, b, "inferred", l) for a, b, l in INFERRED]

def comp_of(p):
    s, e = PT[p]
    return N[s or e]["componentId"]

ROWS = [c["id"] for c in d["components"] if any(comp_of(p) == c["id"] for p, _, _ in POINTS)]

def label(nid):
    return " ".join(N[nid]["label"].split()) if nid else ""

# ---------------------------------------------------------------- layout
COLW, ROWH, HEADW, TOP, R = 132, 132, 190, 96, 13
W = HEADW + COLW * len(COLUMNS) + 30
H = TOP + ROWH * len(ROWS) + 24
col_of = {p: i for i, col in enumerate(COLUMNS) for p in col}
row_of = {p: ROWS.index(comp_of(p)) for p, _, _ in POINTS}

def xy(p):
    return HEADW + COLW * col_of[p] + COLW / 2, TOP + ROWH * row_of[p] + ROWH / 2

def wrap(text, n=19):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + (1 if cur else 0) > n and cur:
            lines.append(cur); cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        lines.append(cur)
    return lines

def esc(s):
    return html.escape(s, quote=True)

def occupied(row, c0, c1):
    return any(row_of[p] == row and c0 < col_of[p] < c1 for p in col_of)

def route(a, b):
    (x1, y1), (x2, y2) = xy(a), xy(b)
    if col_of[a] == col_of[b]:
        gx = x1 + R + 16                          # same column: hop out to the right of the circles
        return f"M{x1+R},{y1} H{gx} V{y2} H{x2+R+1}"
    ca, cb = col_of[a], col_of[b]
    if not occupied(row_of[b], ca, cb):          # drop at source gutter, run along target row
        gx = x1 + COLW * 0.40
        return f"M{x1+R},{y1} H{gx} V{y2} H{x2-R}"
    if not occupied(row_of[a], ca, cb):          # run along source row, drop at target gutter
        gx = x2 - COLW * 0.40
        return f"M{x1+R},{y1} H{gx} V{y2} H{x2-R}"
    # both rows busy: run along the row boundary below the source row
    by = TOP + ROWH * (row_of[a] + 1) - 8
    g1, g2 = x1 + COLW * 0.40, x2 - COLW * 0.40
    return f"M{x1+R},{y1} H{g1} V{by} H{g2} V{y2} H{x2-R}"

# ---------------------------------------------------------------- path for highlights
succ, pred = defaultdict(set), defaultdict(set)
for a, b, _, _ in EDGES:
    succ[a].add(b); pred[b].add(a)

def reach(start, g):
    seen, st = {start}, [start]
    while st:
        x = st.pop()
        for y in g[x]:
            if y not in seen:
                seen.add(y); st.append(y)
    return seen

def on_path(a, b):
    nodes = reach(a, succ) & reach(b, pred)
    edges = {(x, y) for x, y, _, _ in EDGES if x in nodes and y in nodes}
    return nodes, edges

# ---------------------------------------------------------------- render
CSS = """
text{font-family:'Segoe UI',Arial,'DejaVu Sans',sans-serif}
.svc{font-size:11.5px;fill:#0f2f2d;font-weight:600}
.evt{font-size:11.5px;fill:#8a5a00;font-style:italic}
.hdr{font-size:13px;fill:#132322;font-weight:700}
.pid{font-size:9px;fill:#0f2f2d;font-weight:700}
.title{font-size:20px;fill:#132322;font-weight:700}
.sub{font-size:12px;fill:#5a6b6a}
.elab{font-size:9.5px;fill:#6b7b7a}
"""

def svg(title, subtitle, hl=None):
    nodes, edges = (on_path(hl[0], hl[1]) if hl else (None, None))
    dim = (lambda ok: "" if ok else ' opacity="0.22"') if hl else (lambda ok: "")
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         f"<style>{CSS}</style>",
         '<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#5b6b6a"/></marker>'
         '<marker id="arh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#0f766e"/></marker></defs>',
         f'<rect width="{W}" height="{H}" fill="#ffffff"/>',
         f'<text x="16" y="30" class="title">{esc(title)}</text>',
         f'<text x="16" y="50" class="sub">{esc(subtitle)}</text>']
    if hl:
        c0, c1 = sorted((col_of[hl[0]], col_of[hl[1]]))
        x0, x1 = HEADW + COLW * c0 + 6, HEADW + COLW * (c1 + 1) - 6
        o.append(f'<rect x="{x0}" y="{TOP}" width="{x1-x0}" height="{ROWH*len(ROWS)}" fill="#e6f4f2"/>')
        ax0, ax1 = xy(hl[0])[0], xy(hl[1])[0]
        o.append(f'<path d="M{ax0},{TOP-10} V{TOP-22} H{ax1} V{TOP-10}" fill="none" stroke="#0f766e" stroke-width="2.5"/>')
        o.append(f'<text x="{(ax0+ax1)/2}" y="{TOP-28}" text-anchor="middle" class="hdr" fill="#0f766e">Δt  {hl[0]} → {hl[1]}</text>')
    # grid
    for i, cid in enumerate(ROWS):
        y = TOP + ROWH * i
        o.append(f'<rect x="10" y="{y}" width="{HEADW-16}" height="{ROWH}" fill="{"#f2f6f6" if i % 2 else "#ffffff"}" stroke="#132322" stroke-width="2"/>')
        o.append(f'<rect x="{HEADW}" y="{y}" width="{COLW*len(COLUMNS)}" height="{ROWH}" fill="none" stroke="#132322" stroke-width="2"/>')
        lines = wrap(COMP[cid], 20)
        for k, ln in enumerate(lines):
            o.append(f'<text x="22" y="{y + ROWH/2 + 5 + (k - (len(lines)-1)/2)*16}" class="hdr">{esc(ln)}</text>')
    for j in range(len(COLUMNS)):
        x = HEADW + COLW * j
        o.append(f'<line x1="{x}" y1="{TOP}" x2="{x}" y2="{TOP+ROWH*len(ROWS)}" stroke="#e1e9e8" stroke-width="1"/>')
    # edges
    for a, b, kind, lab in EDGES:
        ok = (not hl) or (a, b) in edges
        hot = hl and ok
        stroke = "#0f766e" if hot else "#5b6b6a"
        sw = 2.8 if hot else 1.5
        dash = ' stroke-dasharray="6 4"' if kind == "inferred" else ""
        o.append(f'<path d="{route(a, b)}" fill="none" stroke="{stroke}" stroke-width="{sw}"{dash} marker-end="url(#{"arh" if hot else "ar"})"{dim(ok)}/>')
    # points
    for p, s, e in POINTS:
        x, y = xy(p)
        ok = (not hl) or p in nodes
        fill = "#ffe1a6" if e else "#ffffff"
        stroke = "#b5820c" if not s else ("#5b6470" if N[s]["laneRole"] != "services" else "#2a827d")
        g = [f'<g{dim(ok)}>']
        if hl and p in (hl[0], hl[1]):
            g.append(f'<circle cx="{x}" cy="{y}" r="{R+7}" fill="none" stroke="{"#0f766e" if p == hl[0] else "#c2410c"}" stroke-width="3.5"/>')
        g.append(f'<circle cx="{x}" cy="{y}" r="{R}" fill="{fill}" stroke="{stroke}" stroke-width="3"/>')
        g.append(f'<text x="{x}" y="{y+3.5}" text-anchor="middle" class="pid">{p[1:]}</text>')
        sl = wrap(label(s)) if s else []
        for k, ln in enumerate(sl):
            g.append(f'<text x="{x}" y="{y - R - 8 - (len(sl)-1-k)*13}" text-anchor="middle" class="svc">{esc(ln)}</text>')
        el = wrap(label(e)) if e else []
        for k, ln in enumerate(el):
            g.append(f'<text x="{x}" y="{y + R + 16 + k*13}" text-anchor="middle" class="evt">{esc(ln)}</text>')
        g.append("</g>")
        o += g
    # legend
    ly = H - 8
    o.append(f'<text x="{HEADW}" y="{ly}" class="elab">Top label = service call · italic label under the circle = event · amber circle = point with an event · solid arrow = flow from the model · dashed arrow = sequence / hand-off not modelled as an edge</text>')
    o.append("</svg>")
    return "\n".join(o)

os.makedirs(OUT, exist_ok=True)
ver = ".".join(str(d["version"][k]) for k in ("major", "minor", "patch"))
open(os.path.join(OUT, "claim-submission-flow.svg"), "w", encoding="utf-8").write(
    svg("Claim Submission flow", f"Source: {os.path.basename(MODEL)} (v{ver}) · components as rows, points as columns"))
for qid, q, a, b in QUESTIONS:
    open(os.path.join(OUT, f"{qid}.svg"), "w", encoding="utf-8").write(
        svg(q, f"From {a} ({label(PT[a][1]) or label(PT[a][0])}) to {b} ({label(PT[b][1]) or label(PT[b][0])})", (a, b)))

# dump the point/edge model for the markdown generator
json.dump({"points": [{"id": p, "component": COMP[comp_of(p)], "service": label(s), "event": label(e),
                       "serviceNode": N[s] if s else None, "eventNode": N[e] if e else None} for p, s, e in POINTS],
           "edges": EDGES, "rows": [COMP[r] for r in ROWS],
           "questions": QUESTIONS, "paths": {q[0]: sorted(on_path(q[2], q[3])[0]) for q in QUESTIONS}},
          open(os.path.join(OUT, "_model.json"), "w"), indent=1, default=str)
print("ok", W, H, len(EDGES), "edges")
