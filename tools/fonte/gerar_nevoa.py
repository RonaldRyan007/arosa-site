"""Gera a fonte NÉVOA (fonts/nevoa.woff2): serifada clássica de alto contraste, corroída.

Hastes grossas, linhas finas e serifas com apoio curvo (estilo romano), depois "enferrujadas":
furos de corrosão, mordidas nas bordas e riscos finos, sempre com a mesma semente para sair igual.
A-Z e pontuação básica (minúsculas usam as maiúsculas). Rode:
    python tools/fonte/gerar_nevoa.py
"""
import math
import random
from pathlib import Path as Arquivo

import pathops
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen

from gerar import P, poly, rect, rrect, elipse, faixa, U, D

H = 700     # altura das maiúsculas
S = 116     # haste grossa
T = 30      # linha fina
SB = 40     # respiro lateral
SH = 20     # altura da serifa
SE = 44     # quanto a serifa sai para cada lado
SA = 48     # altura do apoio curvo da serifa

def serifa(x0, x1, y, para_cima=True):
    """Serifa com apoio curvo na ponta de uma haste que vai de x0 a x1."""
    d = 1 if para_cima else -1
    p = P()
    p.moveTo(x0 - SE, y); p.lineTo(x1 + SE, y); p.lineTo(x1 + SE, y + d * SH)
    p.cubicTo(x1 + 8, y + d * SH, x1, y + d * (SH + SA * 0.4), x1, y + d * (SH + SA))
    p.lineTo(x0, y + d * (SH + SA))
    p.cubicTo(x0, y + d * (SH + SA * 0.4), x0 - 8, y + d * SH, x0 - SE, y + d * SH)
    p.close(); return p

def haste(x0, x1, y0=0, y1=H, pe=True, topo=True):
    partes = [rect(x0, y0, x1, y1)]
    if pe: partes.append(serifa(x0, x1, y0, True))
    if topo: partes.append(serifa(x0, x1, y1, False))
    return U(*partes)

def diag(xb, xt, larg, y0=0, y1=H):
    """Traço inclinado com pontas horizontais: base em xb, topo em xt, largura horizontal larg."""
    return poly([(xb, y0), (xb + larg, y0), (xt + larg, y1), (xt, y1)])

def ponta(x, y, para_baixo=True, alt=70):
    """Serifa vertical na ponta de uma barra horizontal (como no E, F, T, L)."""
    return rect(x - T * 0.6, y - alt if para_baixo else y, x + T * 0.6, y if para_baixo else y + alt)

def bojo(x0, y0, y1, xr, grossa=S, fina=T):
    """Bojo em D (B, D, P, R): lado direito grosso, cima e baixo finos."""
    r = (y1 - y0) / 2
    ri = max(1, r - fina)
    return D(rrect(x0, y0, xr, y1, tr=r, br=r), rrect(x0 - 1, y0 + fina, xr - grossa, y1 - fina, tr=ri * 0.9, br=ri * 0.9))

def anel(cx, cy, rx, ry, grossa=S, fina=T):
    return D(elipse(cx, cy, rx, ry), elipse(cx, cy, rx - grossa, ry - fina))

# ── letras ──
G = {}
def letra(*cs):
    def reg(fn):
        for c in cs: G[c] = fn
        return fn
    return reg

@letra("A")
def _A():
    w = 600; m = w / 2
    f = U(diag(30, m - 18, T + 8), diag(w - 30 - S, m - 30, S), rect(150, 210, 440, 210 + T))
    return U(f, serifa(30, 30 + T + 8, 0), serifa(w - 30 - S, w - 30, 0), rect(m - 60, H - 8, m + 60, H)), w

@letra("B")
def _B():
    w = 520; m = H * 0.53
    return U(haste(0, S, pe=False, topo=False), serifa(0, S, 0), serifa(0, S, H, False),
             bojo(0, m - T, H, w - 40, S * 0.9), bojo(0, 0, m, w, S)), w

@letra("C")
def _C():
    w = 590
    f = D(anel(w / 2, H / 2, w / 2, H / 2 + 8), rect(w / 2 + 30, H * 0.3, w + 5, H * 0.7))
    return U(f, rect(w - T * 1.6 - 10, H * 0.62, w - 10, H * 0.86), rect(w - T * 1.6 - 10, H * 0.12, w - 10, H * 0.3)), w

@letra("D")
def _D():
    w = 620
    return U(haste(0, S, pe=False, topo=False), serifa(0, S, 0), serifa(0, S, H, False), bojo(0, 0, H, w, S * 1.05)), w

@letra("E")
def _E():
    w = 490
    return U(haste(0, S, pe=False, topo=False), serifa(0, S, 0), serifa(0, S, H, False),
             rect(0, 0, w, T + 8), rect(0, H - T - 4, w - 20, H), rect(0, H / 2 - T / 2, w - 90, H / 2 + T / 2),
             ponta(w - T * 0.6, T + 8, False), ponta(w - 20 - T * 0.6, H - T - 4), ponta(w - 90 - T * 0.6, H / 2 + 40, True, 80),
             ponta(w - 90 - T * 0.6, H / 2 - 40, False, 80)), w

@letra("F")
def _F():
    w = 470
    return U(haste(0, S, topo=False), serifa(0, S, H, False), rect(0, H - T - 4, w, H), rect(0, H / 2 - 30 - T / 2, w - 90, H / 2 - 30 + T / 2),
             ponta(w - T * 0.6, H - T - 4), ponta(w - 90 - T * 0.6, H / 2 + 10, True, 80), ponta(w - 90 - T * 0.6, H / 2 - 70, False, 80)), w

@letra("G")
def _G():
    w = 620
    f = D(anel(w / 2, H / 2, w / 2, H / 2 + 8), rect(w / 2 + 30, H * 0.38, w + 5, H * 0.72))
    return U(f, rect(w - T * 1.6 - 10, H * 0.62, w - 10, H * 0.86), rect(w - S + 10, 30, w - 6, H * 0.42),
             rect(w - S - 50, H * 0.42 - T, w + 30, H * 0.42)), w

@letra("H")
def _H():
    w = 640
    return U(haste(0, S), haste(w - S, w), rect(S, H / 2 - T / 2 + 20, w - S, H / 2 + T / 2 + 20)), w

@letra("I")
def _I():
    return haste(SE, SE + S), S + 2 * SE

@letra("J")
def _J():
    w = 400; x = w - S
    gancho = D(elipse(x - 40, 60, 170, 200), elipse(x - 40, 60, 170 - S * 0.8, 200 - T), rect(-300, 60, 500, 600), rect(x - 40 - 300, -300, x - 40 - 120, 400))
    return U(rect(x, 60, w, H), serifa(x, w, H, False), gancho, elipse(x - 170, 45, 45, 50)), w

@letra("K")
def _K():
    w = 600
    return U(haste(0, S), diag(S - 20, w - 60 - T, T + 6, H * 0.36, H), serifa(w - 60 - T, w - 60 + 6, H, False),
             diag(w - 40 - S, S + 40, S, 0, H * 0.48), serifa(w - 40 - S, w - 40, 0)), w

@letra("L")
def _L():
    w = 480
    return U(haste(0, S, pe=False), serifa(0, S, 0), rect(0, 0, w, T + 10), ponta(w - T * 0.6, T + 10, False, 90)), w

@letra("M")
def _M():
    w = 760; m = w / 2
    return U(haste(30, 30 + T + 10), diag(m - S / 2, 30, S, 0, H), diag(m - T / 2 + 10, w - S - 30, T + 6, 0, H), haste(w - S - 30, w - 30)), w

@letra("N")
def _N():
    w = 630
    return U(haste(0, T + 10, topo=False), diag(w - T - 10 - S + 20, 0, S, 0, H), haste(w - T - 10, w, pe=False),
             serifa(0, T + 10, H, False)), w

@letra("O")
def _O():
    w = 660
    return anel(w / 2, H / 2, w / 2, H / 2 + 10, S * 1.05, T), w

@letra("P")
def _P():
    w = 540; y0 = H * 0.4
    return U(haste(0, S, topo=False), serifa(0, S, H, False), bojo(0, y0, H, w, S)), w

@letra("Q")
def _Q():
    w = 660
    return U(anel(w / 2, H / 2, w / 2, H / 2 + 10, S * 1.05, T), diag(w / 2 - 20, w / 2 - 140, S * 0.7, -170, 40)), w

@letra("R")
def _R():
    w = 600; y0 = H * 0.44
    return U(haste(0, S, topo=False), serifa(0, S, H, False), bojo(0, y0, H, w - 50, S),
             diag(w - 30 - S, S + 140, S, 0, y0 + T), serifa(w - 30 - S, w - 30, 0)), w

@letra("S")
def _S():
    w = 500; cx = w / 2; ro = (H + T) / 4
    f = U(faixa(cx, H - ro, cx, ro, S * 0.68, 20, 270), faixa(cx, ro, cx, ro, S * 0.68, 90, -160))
    return U(f, rect(w - T * 1.6, H * 0.74, w, H * 0.94), rect(0, H * 0.06, T * 1.6, H * 0.26)), w

@letra("T")
def _T():
    w = 600; x = w / 2 - S / 2
    return U(haste(x, x + S, topo=False), rect(0, H - T - 8, w, H), ponta(T * 0.6, H - T - 8, True, 100), ponta(w - T * 0.6, H - T - 8, True, 100)), w

@letra("U")
def _U():
    w = 620
    taça = D(rrect(0, 0, w, H * 0.6, bl=w / 2, br=w / 2), rrect(S, T + 6, w - T - 10, H * 0.6 + 10, bl=w / 2 - S, br=w / 2 - T))
    return U(taça, haste(0, S, H * 0.55, H, pe=False), haste(w - T - 10, w, H * 0.55, H, pe=False)), w

@letra("V")
def _V():
    w = 600; m = w / 2
    return U(diag(m - S / 2 + 10, 20, S), diag(m - 10, w - 30 - T - 6, T + 6), serifa(20, 20 + S, H, False), serifa(w - 30 - T - 6, w - 30, H, False)), w

@letra("W")
def _W():
    w = 860
    return U(diag(220 - S / 2, 20, S), diag(220, 400, T + 6), diag(620 - S / 2, 420, S), diag(620, w - 40, T + 6),
             serifa(20, 20 + S, H, False), serifa(w - 40, w - 40 + T + 6, H, False)), w

@letra("X")
def _X():
    w = 600
    return U(diag(w - 30 - S, 30, S), diag(40, w - 40 - T, T + 6), serifa(w - 30 - S, w - 30, 0), serifa(40, 40 + T + 6, 0),
             serifa(30, 30 + S, H, False), serifa(w - 40 - T, w - 40 + 6, H, False)), w

@letra("Y")
def _Y():
    w = 600; m = w / 2; y = H * 0.45
    return U(haste(m - S / 2, m + S / 2, 0, y, topo=False), diag(m - S / 2, 20, S, y, H), diag(m + S / 2 - T - 6, w - 30 - T - 6, T + 6, y, H),
             serifa(20, 20 + S, H, False), serifa(w - 30 - T - 6, w - 30, H, False)), w

@letra("Z")
def _Z():
    w = 540
    return U(rect(0, 0, w, T + 10), rect(10, H - T - 6, w - 10, H), diag(0, w - S - 10, S, T, H - T),
             ponta(w - T * 0.6, T + 10, False, 100), ponta(10 + T * 0.6, H - T - 6, True, 100)), w

@letra(" ")
def _espaco(): return P(), 230

@letra(".")
def _ponto(): return rect(20, 0, 20 + S, S), S + 40

@letra(",")
def _virgula(): return U(rect(20, 0, 20 + S, S), poly([(20 + S, 10), (20 + S, -40), (10, -190), (60, -10)])), S + 40

@letra(":")
def _dois(): return U(rect(20, 0, 20 + S, S), rect(20, 380, 20 + S, 380 + S)), S + 40

@letra("!")
def _excl(): return U(rect(40, 0, 40 + S, S), poly([(30, H), (40 + S + 10, H), (40 + S / 2 + 18, 220), (40 + S / 2 - 18, 220)])), S + 80

@letra("?")
def _interr():
    w = 460; cx = w / 2
    return U(faixa(cx, H - 170, cx, 170, S * 0.9, 170, -90), rect(cx - S / 2, 220, cx + S / 2, H - 340 + T), rect(cx - S / 2, 0, cx + S / 2, S)), w

@letra("-")
def _hifen(): return rect(0, 250, 280, 250 + T + 20), 280

@letra("'")
def _apos(): return poly([(20, H), (20 + S, H), (20 + S / 2 + 10, H - 240), (20 + S / 2 - 10, H - 240)]), S + 40

# ── corrosão: furos, mordidas na borda e riscos ──
def mancha(cx, cy, r, sorte):
    pts = []
    for i in range(9):
        a = i / 9 * math.tau
        rr = r * sorte.uniform(0.55, 1.25)
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    return poly(pts)

def corroer(f, w, semente):
    if not f: return f
    sorte = random.Random(semente)
    b = f.bounds
    furos = []
    for _ in range(14):                      # furos de ferrugem (pequenos, para a letra continuar legível)
        furos.append(mancha(sorte.uniform(b[0], b[2]), sorte.uniform(b[1], b[3]), sorte.uniform(5, 15), sorte))
    for _ in range(10):                      # mordidas nas bordas de cima e de baixo
        y = sorte.choice([b[1], b[3]]) + sorte.uniform(-8, 8)
        furos.append(mancha(sorte.uniform(b[0], b[2]), y, sorte.uniform(10, 26), sorte))
    for _ in range(2):                       # riscos finos e tortos
        y = sorte.uniform(H * 0.15, H * 0.85); inc = sorte.uniform(-0.12, 0.12)
        furos.append(poly([(b[0] - 20, y), (b[2] + 20, y + inc * w), (b[2] + 20, y + inc * w + 5), (b[0] - 20, y + 5)]))
    return D(f, *furos)

def nome_glifo(c):
    return "space" if c == " " else f"uni{ord(c):04X}"

def main():
    formas = {}
    for i, (c, fn) in enumerate(G.items()):
        f, w = fn()
        formas[c] = (corroer(f, w, 1000 + i), w)

    ordem = [".notdef"] + [nome_glifo(c) for c in formas]
    cmap, metricas, charstrings = {}, {".notdef": (500, 0)}, {}
    pen = T2CharStringPen(500, None); pen.moveTo((50, 0)); pen.lineTo((450, 0)); pen.lineTo((450, H)); pen.lineTo((50, H)); pen.closePath()
    charstrings[".notdef"] = pen.getCharString()
    for c, (f, w) in formas.items():
        nome = nome_glifo(c)
        adv = round(w + 2 * SB + 2 * SE * 0.5)
        dx = SB + SE * 0.5
        if f: f = pathops.simplify(f, clockwise=False)
        pen = T2CharStringPen(adv, None)
        from fontTools.pens.transformPen import TransformPen
        f.draw(TransformPen(pen, (1, 0, 0, 1, dx, 0)))
        charstrings[nome] = pen.getCharString()
        metricas[nome] = (adv, round(f.bounds[0] + dx) if f else 0)
        cmap[ord(c)] = nome
        if c.lower() != c: cmap[ord(c.lower())] = nome

    fb = FontBuilder(1000, isTTF=False)
    fb.setupGlyphOrder(ordem)
    fb.setupCharacterMap(cmap)
    fb.setupCFF("Nevoa-Regular", {"FullName": "Nevoa"}, charstrings, {})
    fb.setupHorizontalMetrics(metricas)
    fb.setupHorizontalHeader(ascent=900, descent=-250)
    fb.setupNameTable({"familyName": "Nevoa", "styleName": "Regular", "uniqueFontIdentifier": "Nevoa-1.0",
                       "version": "Version 1.000", "psName": "Nevoa-Regular", "copyright": "© 2026 A ROSA"})
    fb.setupOS2(sTypoAscender=900, sTypoDescender=-250, sTypoLineGap=0, usWinAscent=950, usWinDescent=260,
                sCapHeight=H, sxHeight=H, achVendID="ROSA")
    fb.setupPost()
    raiz = Arquivo(__file__).resolve().parents[2] / "fonts"
    fb.font.flavor = "woff2"
    fb.save(raiz / "nevoa.woff2")
    print(f"{len(formas)} glifos ->", raiz / "nevoa.woff2")

if __name__ == "__main__":
    main()
