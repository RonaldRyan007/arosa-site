"""Gera a fonte ROSA BRAVA (fonts/rosa-brava.woff2 e .otf).

Cada letra é montada com formas geométricas (retângulos arredondados, arcos, espinhos e pétalas)
unidas com skia-pathops. Para mudar uma letra, edite a função dela e rode:
    python tools/fonte/gerar.py
"""
import math
from pathlib import Path as Arquivo

import pathops
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen

H = 720      # altura das maiúsculas
S = 140      # espessura das hastes
SB = 45      # respiro lateral de cada letra
K = 0.5523   # constante de Bézier para cantos redondos

# ── primitivas ──
def P():
    return pathops.Path()

def poly(pts):
    p = P(); p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    p.close(); return p

def rect(x0, y0, x1, y1):
    return poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])

def rrect(x0, y0, x1, y1, tl=0, tr=0, br=0, bl=0):
    p = P()
    p.moveTo(x0 + bl, y0)
    p.lineTo(x1 - br, y0)
    if br: p.cubicTo(x1 - br + br * K, y0, x1, y0 + br - br * K, x1, y0 + br)
    p.lineTo(x1, y1 - tr)
    if tr: p.cubicTo(x1, y1 - tr + tr * K, x1 - tr + tr * K, y1, x1 - tr, y1)
    p.lineTo(x0 + tl, y1)
    if tl: p.cubicTo(x0 + tl - tl * K, y1, x0, y1 - tl + tl * K, x0, y1 - tl)
    p.lineTo(x0, y0 + bl)
    if bl: p.cubicTo(x0, y0 + bl - bl * K, x0 + bl - bl * K, y0, x0 + bl, y0)
    p.close(); return p

def _arco(p, cx, cy, rx, ry, a0, a1, mover=False):
    n = max(1, math.ceil(abs(a1 - a0) / 90))
    d = (a1 - a0) / n
    k = 4 / 3 * math.tan(math.radians(d) / 4)
    pt = lambda a: (cx + rx * math.cos(math.radians(a)), cy + ry * math.sin(math.radians(a)))
    if mover: p.moveTo(*pt(a0))
    for i in range(n):
        s, e = math.radians(a0 + i * d), math.radians(a0 + (i + 1) * d)
        c1 = (cx + rx * (math.cos(s) - k * math.sin(s)), cy + ry * (math.sin(s) + k * math.cos(s)))
        c2 = (cx + rx * (math.cos(e) + k * math.sin(e)), cy + ry * (math.sin(e) - k * math.cos(e)))
        p.cubicTo(*c1, *c2, *pt(math.degrees(e)))

def elipse(cx, cy, rx, ry):
    p = P(); _arco(p, cx, cy, rx, ry, 0, 360, True); p.close(); return p

def faixa(cx, cy, rx, ry, t, a0, a1):
    """Arco grosso (espessura t) de a0 a a1 graus, sentido anti-horário se a1 > a0."""
    p = P(); _arco(p, cx, cy, rx, ry, a0, a1, True)
    a = math.radians(a1)
    p.lineTo(cx + (rx - t) * math.cos(a), cy + (ry - t) * math.sin(a))
    _arco(p, cx, cy, rx - t, ry - t, a1, a0)
    p.close(); return p

def espinho(x, y, ang, comp, base, curva=0.28):
    """Espinho de roseira: base centrada em (x, y), ponta na direção ang, levemente curvada."""
    a = math.radians(ang); ux, uy = math.cos(a), math.sin(a); px, py = -uy, ux
    b1 = (x + px * base / 2, y + py * base / 2)
    b2 = (x - px * base / 2, y - py * base / 2)
    ponta = (x + ux * comp + px * comp * curva, y + uy * comp + py * comp * curva)
    p = P(); p.moveTo(*b1)
    p.cubicTo(b1[0] + ux * comp * 0.35, b1[1] + uy * comp * 0.35,
              ponta[0] - ux * comp * 0.2 + px * comp * 0.05, ponta[1] - uy * comp * 0.2 + py * comp * 0.05, *ponta)
    p.cubicTo(ponta[0] - ux * comp * 0.35 - px * comp * 0.1, ponta[1] - uy * comp * 0.35 - py * comp * 0.1,
              b2[0] + ux * comp * 0.25, b2[1] + uy * comp * 0.25, *b2)
    p.close(); return p

def petala(x, y, ang, comp, larg):
    """Gota: ponta fina em (x, y), lado redondo na direção ang."""
    a = math.radians(ang); ux, uy = math.cos(a), math.sin(a); px, py = -uy, ux
    fim = (x + ux * comp, y + uy * comp)
    p = P(); p.moveTo(x, y)
    p.cubicTo(x + ux * comp * 0.3 + px * larg * 0.75, y + uy * comp * 0.3 + py * larg * 0.75,
              fim[0] + ux * comp * 0.12 + px * larg * 0.55, fim[1] + uy * comp * 0.12 + py * larg * 0.55, *fim)
    p.cubicTo(fim[0] + ux * comp * 0.12 - px * larg * 0.55, fim[1] + uy * comp * 0.12 - py * larg * 0.55,
              x + ux * comp * 0.3 - px * larg * 0.75, y + uy * comp * 0.3 - py * larg * 0.75, x, y)
    p.close(); return p

def U(*ps):
    acc = ps[0]
    for q in ps[1:]:
        acc = pathops.op(acc, q, pathops.PathOp.UNION)
    return acc

def D(a, *bs):
    for b in bs:
        a = pathops.op(a, b, pathops.PathOp.DIFFERENCE)
    return a

def mover(p, dx, dy):
    q = P(); p.draw(TransformPen(q, (1, 0, 0, 1, dx, dy))); return q

# ── letras: cada função devolve (forma, largura) ──
G = {}
def letra(*chars):
    def reg(fn):
        for c in chars:
            G[c] = fn
        return fn
    return reg

@letra("A")
def _A():
    w = 600; r = w / 2; ri = (w - 2 * S) / 2
    f = D(rrect(0, 0, w, H, tl=r, tr=r), rrect(S, -10, w - S, H - S, tl=ri, tr=ri))
    return U(f, rect(S - 2, 230, w - S + 2, 230 + S * 0.8), espinho(w / 2, 232, -90, 115, 72)), w

@letra("B")
def _B():
    w = 590; m = H / 2
    f = U(rrect(0, m - S / 2, w - 40, H, tr=180, br=150), rrect(0, 0, w, m + S / 2, tr=170, br=190))
    return D(f, rrect(S, m + S / 2, w - 40 - S, H - S, tr=55, br=55), rrect(S, S, w - S, m - S / 2, tr=70, br=70)), w

@letra("C")
def _C():
    w = 600
    f = D(rrect(0, 0, w, H, 300, 300, 300, 300), rrect(S, S, w - S, H - S, 160, 160, 160, 160),
          rect(w / 2 + 40, H / 2 - 80, w + 10, H / 2 + 80))
    return U(f, espinho(95, H - 95, 135, 125, 85)), w

@letra("D")
def _D():
    w = 610
    return D(rrect(0, 0, w, H, tr=290, br=290), rrect(S, S, w - S, H - S, tr=150, br=150)), w

@letra("E")
def _E():
    w = 530
    return U(rect(0, 0, S, H), rect(0, H - S, w, H), rect(0, 0, w, S),
             rect(0, H / 2 - S * 0.45, w - 140, H / 2 + S * 0.45), espinho(w - 141, H / 2, 0, 135, S * 0.9, 0.18)), w

@letra("F")
def _F():
    w = 510
    return U(rect(0, 0, S, H), rect(0, H - S, w, H),
             rect(0, H / 2 - S * 0.45, w - 140, H / 2 + S * 0.45), espinho(w - 141, H / 2 - 20, 0, 135, S * 0.9, 0.18)), w

@letra("G")
def _G():
    w = 620
    f = D(rrect(0, 0, w, H, 300, 300, 300, 300), rrect(S, S, w - S, H - S, 170, 170, 170, 170),
          rect(w / 2 + 30, H * 0.47, w + 10, H * 0.70))
    return U(f, rect(w / 2 - 10, H * 0.47 - S * 0.8, w, H * 0.47), espinho(w / 2 - 8, H * 0.47 - S * 0.4, 180, 90, 60, -0.2)), w

@letra("H")
def _H():
    w = 610
    return U(rect(0, 0, S, H), rect(w - S, 0, w, H), rect(0, H / 2 - S * 0.42, w, H / 2 + S * 0.42),
             espinho(w / 2 - 50, H / 2 + S * 0.4, 100, 100, 62), espinho(w / 2 + 50, H / 2 - S * 0.4, -80, 100, 62)), w

@letra("I")
def _I():
    w = 270; x = 65
    return U(rect(x, 0, x + S, H), espinho(x + 2, H * 0.64, 165, 110, 72), espinho(x + S - 2, H * 0.30, 15, 110, 72)), w

@letra("J")
def _J():
    w = 530
    f = D(rrect(0, 0, w, H * 0.5, bl=w / 2 - 1, br=w / 2 - 1), rrect(S, S, w - S, H * 0.5 + 20, bl=w / 2 - S, br=w / 2 - S),
          rect(-1, 250, S + 1, H))
    return U(f, rect(w - S, H * 0.2, w, H), rect(w * 0.22, H - S, w, H)), w

@letra("K")
def _K():
    w = 590
    return U(rect(0, 0, S, H), poly([(S - 10, H * 0.30), (w - 175, H), (w, H), (S + 150, H * 0.52)]),
             poly([(S + 70, H * 0.55), (w - 175, 0), (w, 0), (S + 215, H * 0.66)]),
             espinho(w - 100, 95, 25, 95, 70)), w

@letra("L")
def _L():
    w = 520
    return U(rect(0, 0, S, H), rect(0, 0, w - 170, S), petala(w - 172, S / 2, 0, 172, 150)), w

@letra("M")
def _M():
    w = 770; m = w / 2
    c1 = rrect(S, -10, m - S / 2, H - S, tl=80, tr=80)
    c2 = rrect(m + S / 2, -10, w - S, H - S, tl=80, tr=80)
    return D(rrect(0, 0, w, H, tl=210, tr=210), c1, c2), w

@letra("N")
def _N():
    w = 620
    return U(rect(0, 0, S, H), rect(w - S, 0, w, H), poly([(0, H), (S + 50, H), (w, 0), (w - S - 50, 0)])), w

@letra("O")
def _O():
    w = 660; cx = w / 2
    anel = D(rrect(0, 0, w, H, 310, 310, 310, 310), rrect(S, S, w - S, H - S, 190, 190, 190, 190))
    # o miolo é uma espiral: a rosa vista de cima
    espiral = U(faixa(cx, H / 2, 128, 178, 52, 110, 420), faixa(cx + 8, H / 2 + 6, 62, 92, 40, 250, 520))
    return U(anel, espiral), w

@letra("P")
def _P():
    w = 580; y0 = H * 0.36
    return U(rect(0, 0, S, H), D(rrect(0, y0, w, H, tr=220, br=220), rrect(S, y0 + S, w - S, H - S, tr=90, br=90))), w

@letra("Q")
def _Q():
    w = 660
    anel = D(rrect(0, 0, w, H, 310, 310, 310, 310), rrect(S, S, w - S, H - S, 190, 190, 190, 190))
    return U(anel, petala(w * 0.52, 190, -42, 300, 125)), w

@letra("R")
def _R():
    w = 610; y0 = H * 0.40
    bojo = D(rrect(0, y0, w - 30, H, tr=200, br=200), rrect(S, y0 + S, w - 30 - S, H - S, tr=80, br=80))
    perna = poly([(S + 40, y0 + 10), (S + 230, y0 + 10), (w, 0), (w - 190, 0)])
    return U(rect(0, 0, S, H), bojo, perna, espinho(w - 120, 150, 30, 105, 75)), w

@letra("S")
def _S():
    w = 570; cx = w / 2; ro = (H + S) / 4
    f = U(faixa(cx, H - ro, cx, ro, S, 18, 270), faixa(cx, ro, cx, ro, S, 90, -162))
    return U(f, espinho(55, 105, 215, 110, 80, -0.25)), w

@letra("T")
def _T():
    w = 570; x = w / 2 - S / 2
    return U(rect(0, H - S, w, H), rect(x, 0, x + S, H),
             espinho(x + 2, H * 0.46, 160, 115, 72), espinho(x + S - 2, H * 0.20, 20, 115, 72)), w

@letra("U")
def _U():
    w = 610
    return D(rrect(0, 0, w, H, bl=w / 2, br=w / 2), rrect(S, S, w - S, H + 10, bl=w / 2 - S, br=w / 2 - S)), w

@letra("V")
def _V():
    w = 630
    return poly([(0, H), (S + 25, H), (w / 2, 180), (w - S - 25, H), (w, H), (w / 2 + 75, 0), (w / 2 - 75, 0)]), w

@letra("W")
def _W():
    w = 820; m = w / 2
    return D(rrect(0, 0, w, H, bl=220, br=220), rrect(S, S, m - S / 2, H + 10, bl=85, br=85),
             rrect(m + S / 2, S, w - S, H + 10, bl=85, br=85)), w

@letra("X")
def _X():
    w = 610
    return U(poly([(0, H), (S + 35, H), (w, 0), (w - S - 35, 0)]), poly([(w, H), (w - S - 35, H), (0, 0), (S + 35, 0)])), w

@letra("Y")
def _Y():
    w = 610; m = w / 2; y = H * 0.42
    return U(poly([(0, H), (S + 30, H), (m + S / 2, y), (m - S / 2, y)]), poly([(w, H), (w - S - 30, H), (m - S / 2, y), (m + S / 2, y)]),
             rect(m - S / 2, 0, m + S / 2, y + 5), espinho(m - S / 2 + 2, 150, 170, 100, 66)), w

@letra("Z")
def _Z():
    w = 570
    return U(rect(0, H - S, w, H), rect(0, 0, w, S), poly([(w - S - 70, H - S), (w, H - S), (S + 70, S), (0, S)])), w

# ── números ──
@letra("0")
def _0():
    w = 570
    anel = D(rrect(0, 0, w, H, 280, 280, 280, 280), rrect(S, S, w - S, H - S, 145, 145, 145, 145))
    return U(anel, petala(w / 2 - 70, H / 2 - 95, 55, 220, 90)), w

@letra("1")
def _1():
    w = 420; x = w - S - 40
    return U(rect(x, 0, x + S, H), poly([(x + 5, H), (x - 170, H - 150), (x - 170, H - 290), (x + 5, H - 140)])), w

@letra("2")
def _2():
    w = 570; cx = w / 2; ro = (H + S) / 4
    return U(faixa(cx, H - ro, cx, ro, S, 165, -38), poly([(w - S - 15, H * 0.55), (w - 5, H * 0.47), (S + 40, S - 2), (0, S - 2)]),
             rect(0, 0, w, S)), w

@letra("3")
def _3():
    w = 560; cx = w / 2; ro = (H + S) / 4
    return U(faixa(cx, H - ro, cx, ro, S, 155, -90), faixa(cx, ro, cx, ro, S, 90, -155), rect(cx - 90, H / 2 - S / 2, cx + 5, H / 2 + S / 2)), w

@letra("4")
def _4():
    w = 590; x = w - S - 50
    return U(rect(x, 0, x + S, H), poly([(x, H), (x + S, H), (S + 30, 190), (0, 190)]), rect(0, 190, w, 190 + S * 0.85)), w

@letra("5")
def _5():
    w = 570; cx = w / 2; ry = 245
    return U(rect(30, H - S, w, H), rect(30, H * 0.44, 30 + S, H), faixa(cx, ry, cx, ry, S, 148, -160)), w

@letra("6")
def _6():
    w = 580; cx = w / 2; ry = 250
    anel = D(elipse(cx, ry, cx, ry), elipse(cx, ry, cx - S, ry - S + 10))
    return U(anel, poly([(2, ry + 10), (S + 2, ry + 50), (w - 70, H), (w - 70 - S - 60, H)])), w

@letra("7")
def _7():
    w = 560
    return U(rect(0, H - S, w, H), poly([(w - S - 30, H - S), (w, H - S), (S + 150, 0), (110, 0)]), espinho(w * 0.57, H * 0.42, 0, 105, 70)), w

@letra("8")
def _8():
    w = 590; cx = w / 2
    cima = D(elipse(cx, H - 195, cx - 30, 195), elipse(cx, H - 195, cx - 30 - S + 15, 195 - S + 30))
    baixo = D(elipse(cx, 235, cx, 235), elipse(cx, 235, cx - S, 235 - S + 20))
    return U(cima, baixo), w

@letra("9")
def _9():
    w = 580; cx = w / 2; ry = 250; cy = H - ry
    anel = D(elipse(cx, cy, cx, ry), elipse(cx, cy, cx - S, ry - S + 10))
    return U(anel, poly([(w - 2, cy - 10), (w - S - 2, cy - 50), (70, 0), (70 + S + 60, 0)])), w

# ── pontuação e ornamentos ──
@letra(" ")
def _espaco():
    return P(), 250

@letra(".")
def _ponto():
    return petala(80, 0, 90, 150, 120), 160

@letra(",")
def _virgula():
    return U(petala(85, 150, -105, 160, 110), espinho(85, 40, -110, 90, 50)), 170

@letra(":")
def _dois():
    return U(petala(80, 0, 90, 150, 120), petala(80, 330, 90, 150, 120)), 160

@letra(";")
def _pv():
    return U(petala(85, 150, -105, 160, 110), petala(85, 330, 90, 150, 120)), 170

@letra("!")
def _excl():
    return U(poly([(30, H), (190, H), (130, 230), (90, 230)]), petala(110, 0, 90, 150, 120)), 220

@letra("?")
def _interr():
    w = 520; cx = w / 2; ro = 190
    return U(faixa(cx, H - ro, cx, ro, S * 0.95, 160, -95), rect(cx - S / 2, 230, cx + S / 2, H - 2 * ro + 30),
             petala(cx, 0, 90, 150, 120)), w

@letra("-")
def _hifen():
    return U(rect(0, H / 2 - 70, 230, H / 2 + 40), espinho(229, H / 2 - 15, 0, 90, 110, 0.1)), 320

@letra("'")
def _apos():
    return poly([(30, H), (160, H), (110, H - 260), (60, H - 260)]), 190

@letra('"')
def _aspas():
    return U(poly([(30, H), (150, H), (105, H - 260), (60, H - 260)]), poly([(190, H), (310, H), (265, H - 260), (220, H - 260)])), 340

@letra("/")
def _barra():
    return poly([(300, H + 40), (440, H + 40), (140, -60), (0, -60)]), 440

@letra("+")
def _mais():
    return U(rect(0, H / 2 - 70 - 40, 440, H / 2 + 70 - 40), rect(220 - 70, H / 2 - 260, 220 + 70, H / 2 + 180)), 440

@letra("(")
def _abre():
    return faixa(300, H / 2, 300, 450, S * 0.9, 110, 250), 300

@letra(")")
def _fecha():
    return faixa(0, H / 2, 300, 450, S * 0.9, 70, -70), 300

@letra("*", "✿")
def _flor():
    c = 340; cy = H / 2
    return D(U(*[petala(c, cy, a, 330, 230) for a in (90, 162, 234, 306, 18)]), elipse(c, cy, 70, 70)), 680

@letra("#")
def _cerq():
    return U(rect(110, 40, 110 + 110, H - 40), rect(320, 40, 320 + 110, H - 40), rect(0, 210, 540, 300), rect(0, 420, 540, 510)), 540

# ── acentos (montados sobre a letra base) ──
def agudo(w):  return petala(w / 2 - 70, H + 60, 50, 210, 95)
def grave(w):  return petala(w / 2 + 70, H + 60, 130, 210, 95)
def circ(w):   return poly([(w / 2 - 200, H + 50), (w / 2 - 70, H + 50), (w / 2, H + 150), (w / 2 + 70, H + 50), (w / 2 + 200, H + 50), (w / 2 + 60, H + 230), (w / 2 - 60, H + 230)])
def til(w):
    c = w / 2
    return U(faixa(c - 85, H + 95, 105, 75, 55, 0, 180), faixa(c + 85, H + 175, 105, 75, 55, 180, 360))
def cedilha(w): return U(rect(w / 2 - 40, -120, w / 2 + 40, 10), espinho(w / 2, -100, -160, 140, 80, -0.3))
def trema(w):  return U(elipse(w / 2 - 110, H + 110, 60, 60), elipse(w / 2 + 110, H + 110, 60, 60))

ACENTOS = {
    "Á": ("A", agudo), "À": ("A", grave), "Â": ("A", circ), "Ã": ("A", til),
    "É": ("E", agudo), "Ê": ("E", circ), "Í": ("I", agudo), "Ó": ("O", agudo), "Ô": ("O", circ),
    "Õ": ("O", til), "Ú": ("U", agudo), "Ü": ("U", trema), "Ç": ("C", cedilha), "Ñ": ("N", til),
}

# ── montagem da fonte ──
def nome_glifo(c):
    return "space" if c == " " else f"uni{ord(c):04X}"

def main():
    formas = {}
    for c, fn in G.items():
        if c not in formas:
            formas[c] = fn()
    for c, (base, acento) in ACENTOS.items():
        f, w = formas[base]
        formas[c] = (U(f, acento(w)), w)

    ordem = [".notdef"] + [nome_glifo(c) for c in formas]
    cmap, metricas, charstrings = {}, {".notdef": (500, 0)}, {}
    pen = T2CharStringPen(500, None); pen.moveTo((50, 0)); pen.lineTo((450, 0)); pen.lineTo((450, H)); pen.lineTo((50, H)); pen.closePath()
    charstrings[".notdef"] = pen.getCharString()

    for c, (f, w) in formas.items():
        nome = nome_glifo(c)
        adv = round(w + 2 * SB)
        f = pathops.simplify(f, clockwise=False)
        pen = T2CharStringPen(adv, None)
        f.draw(TransformPen(pen, (1, 0, 0, 1, SB, 0)))
        charstrings[nome] = pen.getCharString()
        b = f.bounds
        metricas[nome] = (adv, round(b[0] + SB) if f else 0)
        cmap[ord(c)] = nome
        if c.lower() != c:
            cmap[ord(c.lower())] = nome  # fonte só de maiúsculas: minúsculas usam as mesmas formas

    fb = FontBuilder(1000, isTTF=False)
    fb.setupGlyphOrder(ordem)
    fb.setupCharacterMap(cmap)
    fb.setupCFF("RosaBrava-Regular", {"FullName": "Rosa Brava"}, charstrings, {})
    fb.setupHorizontalMetrics(metricas)
    fb.setupHorizontalHeader(ascent=980, descent=-260)
    fb.setupNameTable({"familyName": "Rosa Brava", "styleName": "Regular", "uniqueFontIdentifier": "RosaBrava-1.0",
                       "version": "Version 1.000", "psName": "RosaBrava-Regular",
                       "copyright": "© 2026 A ROSA", "licenseDescription": "Fonte da comunidade A ROSA."})
    fb.setupOS2(sTypoAscender=980, sTypoDescender=-260, sTypoLineGap=0, usWinAscent=1000, usWinDescent=280,
                sCapHeight=H, sxHeight=H, achVendID="ROSA")
    fb.setupPost()

    raiz = Arquivo(__file__).resolve().parents[2] / "fonts"
    raiz.mkdir(exist_ok=True)
    fb.save(raiz / "rosa-brava.otf")
    fb.font.flavor = "woff2"
    fb.save(raiz / "rosa-brava.woff2")
    print(f"{len(formas)} glifos ->", raiz)

if __name__ == "__main__":
    main()
