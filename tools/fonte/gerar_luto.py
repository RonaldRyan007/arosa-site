"""Gera a fonte LUTO (fonts/luto.woff2), a tipografia punk/emo do easter egg TLLN.

Letras estreitas feitas de traços retos de ponta quadrada, inclinadas, com cortes de estilete
atravessando e tinta escorrendo da base. Só tem as letras de "EM BREVE, UM NOVO SISTEMA"
(ponytail: o resto do alfabeto entra quando outro texto precisar). Rode:
    python tools/fonte/gerar_luto.py
"""
import math
import random
from pathlib import Path as Arquivo

import pathops
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen

from gerar import P, poly, U, D, elipse

H = 760          # altura das maiúsculas
T = 92           # espessura do traço
SB = 30          # respiro lateral
INCLINA = 0.13   # itálico: x += INCLINA * y

def traco(a, b, t=T):
    """Traço reto de a até b, ponta quadrada (estica t/2 além de cada ponta)."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy); ux, uy = dx / n, dy / n; px, py = -uy * t / 2, ux * t / 2
    a = (a[0] - ux * t / 2, a[1] - uy * t / 2); b = (b[0] + ux * t / 2, b[1] + uy * t / 2)
    return poly([(a[0] + px, a[1] + py), (b[0] + px, b[1] + py), (b[0] - px, b[1] - py), (a[0] - px, a[1] - py)])

def linha(pts, t=T):
    return U(*[traco(pts[i], pts[i + 1], t) for i in range(len(pts) - 1)])

def escorrido(x, comp):
    """Tinta pingando da base: filete que afina e termina numa gota."""
    return U(poly([(x - 26, 40), (x + 26, 40), (x + 11, -comp), (x - 11, -comp)]), elipse(x, -comp - 8, 24, 30))

def cortes(forma, w, semente, n=2):
    """Riscos de estilete atravessando a letra (sementes fixas: a fonte sai sempre igual)."""
    r = random.Random(semente)
    for _ in range(n):
        y = r.uniform(H * 0.2, H * 0.8); inc = r.uniform(-0.35, 0.35); e = r.uniform(9, 16)
        forma = D(forma, poly([(-80, y - e), (w + 80, y - e + inc * (w + 160)), (w + 80, y + e + inc * (w + 160)), (-80, y + e)]))
    return forma

G = {}
def letra(c, semente, pingos=()):
    def reg(fn):
        def montar():
            f, w = fn()
            f = cortes(f, w, semente)
            return (U(f, *[escorrido(x, comp) for x, comp in pingos]) if pingos else f), w
        G[c] = montar
        return fn
    return reg

@letra("A", 1, [(40, 170)])
def _A():
    w = 400
    return U(linha([(0, 0), (w / 2, H), (w, 0)]), traco((w * 0.22, H * 0.36), (w * 0.8, H * 0.40), T * 0.8)), w

@letra("B", 2)
def _B():
    w = 380; m = H * 0.52
    return U(linha([(0, 0), (0, H), (w * 0.8, H), (w * 0.95, H * 0.8), (w * 0.72, m), (0, m)]),
             linha([(w * 0.72, m), (w, H * 0.27), (w * 0.82, 0), (0, 0)])), w

@letra("E", 3, [(330, 120)])
def _E():
    w = 340
    return U(linha([(w, H), (0, H), (0, 0), (w, 0)]), traco((0, H * 0.5), (w * 0.78, H * 0.56), T * 0.85)), w

@letra("I", 4, [(110, 230)])
def _I():
    w = 220
    return U(traco((w / 2, 0), (w / 2, H)), traco((0, H), (w, H), T * 0.6), traco((0, 0), (w, 0), T * 0.6)), w

@letra("M", 5, [(0, 140)])
def _M():
    w = 520
    return linha([(0, 0), (0, H), (w / 2, H * 0.3), (w, H), (w, 0)]), w

@letra("N", 6, [(400, 200)])
def _N():
    w = 400
    return linha([(0, 0), (0, H), (w, 0), (w, H)]), w

@letra("O", 7)
def _O():
    w = 400
    anel = linha([(w * 0.28, 0), (0, H * 0.18), (0, H * 0.82), (w * 0.28, H), (w * 0.72, H), (w, H * 0.82),
                  (w, H * 0.18), (w * 0.72, 0), (w * 0.28, 0)])
    return U(anel, traco((-40, H * 0.08), (w + 40, H * 0.92), T * 0.55)), w  # O cortado (Ø)

@letra("R", 8, [(390, 110)])
def _R():
    w = 390; m = H * 0.46
    return U(linha([(0, 0), (0, H), (w * 0.82, H), (w, H * 0.76), (w * 0.8, m), (0, m)]), traco((w * 0.4, m), (w, 0))), w

@letra("S", 9, [(60, 150)])
def _S():
    w = 390
    return linha([(w, H * 0.86), (w * 0.72, H), (w * 0.12, H), (0, H * 0.8), (0, H * 0.62), (w, H * 0.4),
                   (w, H * 0.18), (w * 0.84, 0), (w * 0.22, 0), (0, H * 0.14)]), w

@letra("T", 10, [(200, 260)])
def _T():
    w = 400
    return U(traco((0, H * 0.97), (w, H)), traco((w / 2, H), (w / 2, 0))), w

@letra("U", 11)
def _U():
    w = 390
    return linha([(0, H), (0, H * 0.16), (w * 0.22, 0), (w * 0.78, 0), (w, H * 0.16), (w, H)]), w

@letra("V", 12, [(190, 190)])
def _V():
    w = 400
    return linha([(0, H), (w / 2, 0), (w, H)]), w

@letra(",", 13)
def _virgula():
    return traco((90, 90), (20, -150), T * 0.8), 140

@letra(".", 14)
def _ponto():
    return traco((60, 0), (60, 90), T * 0.95), 130

def _espaco():
    return P(), 230
G[" "] = _espaco

def nome_glifo(c):
    return "space" if c == " " else f"uni{ord(c):04X}"

def main():
    formas = {c: fn() for c, fn in G.items()}
    ordem = [".notdef"] + [nome_glifo(c) for c in formas]
    cmap, metricas, charstrings = {}, {".notdef": (400, 0)}, {}
    pen = T2CharStringPen(400, None); pen.moveTo((40, 0)); pen.lineTo((360, 0)); pen.lineTo((360, H)); pen.lineTo((40, H)); pen.closePath()
    charstrings[".notdef"] = pen.getCharString()

    for c, (f, w) in formas.items():
        nome = nome_glifo(c)
        adv = round(w + 2 * SB + INCLINA * H * 0.5)
        if f:
            f = pathops.simplify(f, clockwise=False)
        pen = T2CharStringPen(adv, None)
        f.draw(TransformPen(pen, (1, 0, INCLINA, 1, SB, 0)))  # inclina e afasta do vizinho
        charstrings[nome] = pen.getCharString()
        metricas[nome] = (adv, round(f.bounds[0] + SB) if f else 0)
        cmap[ord(c)] = nome
        if c.lower() != c:
            cmap[ord(c.lower())] = nome

    fb = FontBuilder(1000, isTTF=False)
    fb.setupGlyphOrder(ordem)
    fb.setupCharacterMap(cmap)
    fb.setupCFF("Luto-Regular", {"FullName": "Luto"}, charstrings, {})
    fb.setupHorizontalMetrics(metricas)
    fb.setupHorizontalHeader(ascent=950, descent=-330)
    fb.setupNameTable({"familyName": "Luto", "styleName": "Regular", "uniqueFontIdentifier": "Luto-1.0",
                       "version": "Version 1.000", "psName": "Luto-Regular", "copyright": "© 2026 A ROSA"})
    fb.setupOS2(sTypoAscender=950, sTypoDescender=-330, sTypoLineGap=0, usWinAscent=980, usWinDescent=340,
                sCapHeight=H, sxHeight=H, achVendID="ROSA")
    fb.setupPost()

    raiz = Arquivo(__file__).resolve().parents[2] / "fonts"
    fb.font.flavor = "woff2"
    fb.save(raiz / "luto.woff2")
    print(f"{len(formas)} glifos ->", raiz / "luto.woff2")

if __name__ == "__main__":
    main()
