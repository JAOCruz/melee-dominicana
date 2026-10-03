#!/usr/bin/env python3
"""Generador de retratos pixel art 32x32 para Melee Dominicana.
Uso: python3 tools/gen-sprites.py  (requiere Pillow; escribe public/sprites.js + sheet.png/sprites.json junto al script).
Dibuja con primitivas (elipses, rects, polígonos) + parches a mano y emite public/sprites.js
y una hoja de contacto PNG para revisar."""
import json, sys, os
from PIL import Image, ImageDraw

SIZE = 32
OUT_JS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "sprites.js")
OUT_PNG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sheet.png")

SPRITES = []


class Sp:
    def __init__(self, slug, name, pal):
        self.slug, self.name, self.pal = slug, name, dict(pal)
        self.g = [["."] * SIZE for _ in range(SIZE)]
        SPRITES.append(self)

    # --- básicos -------------------------------------------------------
    def px(self, x, y, c):
        if 0 <= x < SIZE and 0 <= y < SIZE:
            self.g[y][x] = c

    def get(self, x, y):
        return self.g[y][x] if (0 <= x < SIZE and 0 <= y < SIZE) else "."

    def paint(self, mask, fill, outline=None, dark=None, light=None, clip=None, shade_dir=(0.5, 0.85), dark_t=0.55, light_t=-0.8):
        mask = set(p for p in mask if 0 <= p[0] < SIZE and 0 <= p[1] < SIZE)
        if clip:
            mask = {p for p in mask if clip(*p)}
        if not mask:
            return
        xs = [p[0] for p in mask]; ys = [p[1] for p in mask]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        rx, ry = max((x1 - x0) / 2, 0.5), max((y1 - y0) / 2, 0.5)
        for (x, y) in mask:
            c = fill
            if dark or light:
                n = (x - cx) / rx * shade_dir[0] + (y - cy) / ry * shade_dir[1]
                if dark and n > dark_t:
                    c = dark
                elif light and n < light_t:
                    c = light
            self.px(x, y, c)
        if outline:
            for (x, y) in mask:
                if any((x + dx, y + dy) not in mask for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    self.px(x, y, outline)

    # --- formas --------------------------------------------------------
    @staticmethod
    def m_ellipse(cx, cy, rx, ry):
        return [(x, y) for x in range(SIZE) for y in range(SIZE)
                if ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1]

    @staticmethod
    def m_rect(x0, y0, x1, y1):
        return [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]

    @staticmethod
    def m_poly(pts):
        out = []
        n = len(pts)
        for x in range(SIZE):
            for y in range(SIZE):
                px, py = x + 0.5, y + 0.5
                inside = False
                for i in range(n):
                    ax, ay = pts[i]; bx, by = pts[(i + 1) % n]
                    if (ay > py) != (by > py):
                        ix = ax + (py - ay) * (bx - ax) / (by - ay)
                        if px < ix:
                            inside = not inside
                if inside:
                    out.append((x, y))
        return out

    def ellipse(self, cx, cy, rx, ry, fill, **kw):
        self.paint(self.m_ellipse(cx, cy, rx, ry), fill, **kw)

    def rect(self, x0, y0, x1, y1, fill, **kw):
        self.paint(self.m_rect(x0, y0, x1, y1), fill, **kw)

    def poly(self, pts, fill, **kw):
        self.paint(self.m_poly(pts), fill, **kw)

    def line(self, x0, y0, x1, y1, c):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            self.px(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), c)

    def blit(self, x0, y0, rows):
        """Parche a mano: '.' = no tocar."""
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != ".":
                    self.px(x0 + i, y0 + j, ch)

    def mirror_blit(self, x0, y0, rows, axis=16):
        """Parche + su espejo horizontal respecto al centro (col axis)."""
        self.blit(x0, y0, rows)
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != ".":
                    self.px(2 * axis - (x0 + i) - 1 + 1, y0 + j, ch) if False else self.px(31 - (x0 + i), y0 + j, ch)

    def silhouette(self, c):
        """Contorno exterior de toda la figura."""
        todo = []
        for y in range(SIZE):
            for x in range(SIZE):
                if self.g[y][x] != "." and any(self.get(x + dx, y + dy) == "." for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    todo.append((x, y))
        for x, y in todo:
            self.g[y][x] = c

    def rows(self):
        return ["".join(r) for r in self.g]


# tonos compartidos
K = "#17131c"
SKIN, SKIN2 = "#f4c9a1", "#cf8f68"
W = "#ffffff"


def mirror_pts(pts):
    return [(32 - x, y) for x, y in pts]


# =====================================================================
# 1. MARIO
# =====================================================================
def mario(slug="mario", name="Mario", cap="#e23b3b", cap2="#a51c22", shirt="#e23b3b", shirt2="#a51c22",
          overall="#2f55c8", overall2="#1c3a90", coat=None):
    s = Sp(slug, name, {"k": K, "s": SKIN, "S": SKIN2, "r": cap, "R": cap2,
                        "h": "#4a2a12", "w": W, "e": "#2f6fd1", "b": overall, "y": "#f5c542"})
    # cuerpo
    s.poly([(3, 25), (29, 25), (32, 32), (0, 32)], "r", dark="R", outline="k")
    s.rect(11, 27, 20, 31, "b", outline="k")
    s.rect(11, 25, 12, 27, "b"); s.rect(19, 25, 20, 27, "b")
    s.px(13, 28, "y"); s.px(18, 28, "y")
    # pelo detrás + cabeza
    s.ellipse(16, 15, 10, 7, "h", outline="k")
    s.ellipse(16, 16, 8, 8, "s", dark="S", outline="k")
    s.ellipse(7, 17, 1, 2, "s", outline="k"); s.ellipse(25, 17, 1, 2, "s", outline="k")
    s.rect(8, 13, 9, 17, "h"); s.rect(22, 13, 23, 17, "h")
    # gorra
    s.ellipse(16, 9, 9, 6, "r", dark="R", outline="k", clip=lambda x, y: y <= 10)
    s.rect(5, 10, 26, 12, "r", outline="k")
    s.rect(15, 6, 17, 8, "w")
    # cara
    s.blit(11, 13, ["hhh", ".ww", ".ee", ".ee"])
    s.blit(18, 13, ["hhh", "ww.", "ee.", "ee."])
    s.ellipse(16, 18, 3, 2, "s", dark="S", outline="k")
    s.blit(10, 21, ["hhhhhhhhhhhh", ".hhhh..hhhh."])
    s.rect(14, 23, 18, 23, "k")
    return s


mario()
m = mario("luigi", "Luigi", cap="#3fae4a", cap2="#237a30", shirt="#3fae4a", shirt2="#237a30",
          overall="#243b8a", overall2="#15245c")

# Dr. Mario: bata blanca, gorra blanca, espejo frontal
d = Sp("dr-mario", "Dr. Mario", {"k": K, "s": SKIN, "S": SKIN2, "w": W, "g": "#c4c6d2", "G": "#8d90a0",
                                  "h": "#4a2a12", "e": "#2f6fd1", "y": "#f5c542", "r": "#d8232a", "b": "#2f55c8"})
d.poly([(3, 25), (29, 25), (32, 32), (0, 32)], "w", dark="g", outline="k")
d.poly([(13, 25), (19, 25), (16, 30)], "b")                    # camisa
d.poly([(15, 26), (17, 26), (17, 31), (15, 31)], "r")           # corbata
d.rect(6, 27, 7, 31, "g"); d.rect(24, 27, 25, 31, "g")
d.ellipse(16, 15, 10, 7, "h", outline="k")
d.ellipse(16, 16, 8, 8, "s", dark="S", outline="k")
d.ellipse(7, 17, 1, 2, "s", outline="k"); d.ellipse(25, 17, 1, 2, "s", outline="k")
d.rect(8, 13, 9, 17, "h"); d.rect(22, 13, 23, 17, "h")
d.ellipse(16, 9, 9, 6, "w", dark="g", outline="k", clip=lambda x, y: y <= 10)
d.rect(5, 10, 26, 12, "w", outline="k"); d.rect(6, 11, 25, 11, "g")
d.ellipse(16, 6, 2, 2, "y", outline="k"); d.px(16, 6, "w")       # espejo frontal
d.blit(11, 13, ["hhh", ".ww", ".ee", ".ee"]); d.blit(18, 13, ["hhh", "ww.", "ee.", "ee."])
d.ellipse(16, 18, 3, 2, "s", dark="S", outline="k")
d.blit(10, 21, ["hhhhhhhhhhhh", ".hhhh..hhhh."])
d.rect(14, 23, 18, 23, "k")

# =====================================================================
# BOWSER
# =====================================================================
b = Sp("bowser", "Bowser", {"k": K, "g": "#55b03f", "G": "#2f7a28", "c": "#f2dca6", "C": "#c9a86a",
                            "r": "#e8432e", "R": "#a51f14", "w": W, "e": "#d61f1f", "d": "#2a2a30"})
# cuerpo + collar con púas
b.poly([(2, 24), (30, 24), (32, 32), (0, 32)], "g", dark="G", outline="k")
b.rect(0, 26, 31, 28, "d", outline="k")
for x in (2, 8, 22, 28):
    b.poly([(x - 1, 27), (x + 3, 27), (x + 1, 20)], "w", outline="k")
# melena roja (detrás)
b.poly([(5, 13), (7, 3), (10, 7), (13, 1), (16, 6), (19, 1), (22, 7), (25, 3), (27, 13)], "r", dark="R", outline="k")
# cabeza
b.ellipse(16, 15, 11, 8, "g", dark="G", outline="k")
# cuernos
b.poly([(0, 1), (10, 6), (7, 13)], "c", dark="C", outline="k")
b.poly([(32, 1), (22, 6), (25, 13)], "c", dark="C", outline="k")
# hocico
b.ellipse(16, 19, 8, 4, "c", dark="C", outline="k")
b.px(13, 18, "k"); b.px(19, 18, "k")
b.rect(9, 21, 23, 21, "k")
b.blit(9, 19, ["kw", "kw"]); b.blit(21, 19, ["wk", "wk"])
b.blit(13, 22, ["w.....w"])
# cejas rojas + ojos
b.blit(8, 10, ["rrrr..", ".rrrrr", ".wwwww", ".wweew", "..kkk."])
b.blit(18, 10, ["..rrrr", "rrrrr.", "wwwww.", "weeww.", ".kkk.."])
# =====================================================================
# PEACH
# =====================================================================
p = Sp("peach", "Peach", {"k": K, "s": SKIN, "S": SKIN2, "y": "#f7d35b", "Y": "#c9a030", "p": "#ff8fcf", "P": "#d64aa0",
                          "o": "#ffb52e", "e": "#3b6fe0", "r": "#d8323a", "w": W})
p.poly([(5, 10), (27, 10), (29, 32), (3, 32)], "y", dark="Y", outline="k")              # pelo largo
p.poly([(9, 27), (23, 27), (25, 32), (7, 32)], "p", dark="P", outline="k")               # vestido
p.ellipse(16, 11, 10, 6, "y", dark="Y", outline="k")                                      # pelo arriba
p.ellipse(16, 17, 7, 7, "s", dark="S", outline="k")
p.poly([(9, 10), (23, 10), (23, 13), (18, 12), (13, 14), (9, 14)], "y", dark="Y", outline="k")  # flequillo
# corona
p.poly([(12, 8), (13, 3), (15, 6), (16, 2), (17, 6), (19, 3), (20, 8)], "o", outline="k")
p.px(16, 6, "P"); p.px(13, 7, "e"); p.px(19, 7, "e")
# cara
p.blit(11, 14, ["kk..", ".ww.", ".ee.", ".ee."]); p.blit(17, 14, ["..kk", ".ww.", ".ee.", ".ee."])
p.rect(15, 21, 17, 21, "P")
p.px(8, 19, "e"); p.px(24, 19, "e")

# =====================================================================
# YOSHI
# =====================================================================
y = Sp("yoshi", "Yoshi", {"k": K, "g": "#4fc84b", "G": "#2f8f32", "w": W, "c": "#f8f4d8", "r": "#e23b2a", "R": "#9b1d16", "b": "#1a1620"})
y.poly([(5, 25), (27, 25), (30, 32), (2, 32)], "g", dark="G", outline="k")
y.ellipse(16, 30, 6, 4, "c", outline="k")                                               # pecho
y.rect(4, 24, 8, 31, "r", dark="R", outline="k"); y.rect(24, 24, 28, 31, "r", dark="R", outline="k")  # silla
y.poly([(11, 8), (13, 2), (15, 6), (17, 2), (19, 6), (21, 2), (23, 8)], "r", dark="R", outline="k")  # cresta
y.ellipse(16, 13, 9, 7, "g", dark="G", outline="k")
y.ellipse(16, 21, 9, 3, "c", outline="k")                                                 # mejillas blancas
y.ellipse(16, 18, 8, 5, "g", dark="G", outline="k")                                       # hocico
y.ellipse(12, 8, 2, 3, "w", outline="k"); y.ellipse(20, 8, 2, 3, "w", outline="k")        # ojos
y.rect(12, 8, 12, 9, "b"); y.rect(20, 8, 20, 9, "b")
y.px(12, 16, "G"); y.px(13, 16, "G"); y.px(19, 16, "G"); y.px(20, 16, "G")                # fosas
y.rect(11, 21, 21, 21, "k")

# =====================================================================
# DONKEY KONG
# =====================================================================
dk = Sp("donkey-kong", "Donkey Kong", {"k": K, "b": "#7a4522", "B": "#4b2912", "t": "#efbf8f", "T": "#c38b5a",
                                       "w": W, "e": "#2b1a0e", "r": "#e02e2e", "R": "#9b1a1a", "y": "#f2c14a"})
dk.poly([(1, 24), (31, 24), (32, 32), (0, 32)], "b", dark="B", outline="k")
dk.ellipse(16, 13, 11, 9, "b", dark="B", outline="k")
dk.poly([(12, 6), (16, 0), (20, 6)], "b", outline="k")                                     # mechón
dk.poly([(14, 5), (16, 2), (18, 5)], "b")
dk.paint(dk.m_ellipse(16, 19, 8, 5) + dk.m_ellipse(16, 15, 7, 3), "t", dark="T", outline="k")  # cara + ceño
dk.rect(11, 13, 21, 13, "B")
dk.blit(11, 14, ["kkk.", ".ww.", ".we."]); dk.blit(17, 14, [".kkk", ".ww.", ".ew."])
dk.rect(13, 19, 14, 20, "k"); dk.rect(18, 19, 19, 20, "k")
dk.rect(11, 22, 21, 22, "k")
dk.poly([(14, 24), (18, 24), (17, 31), (15, 31)], "r", outline="k"); dk.rect(14, 24, 17, 25, "r")

# =====================================================================
# CAPTAIN FALCON
# =====================================================================
cf = Sp("captain-falcon", "Captain Falcon", {"k": K, "s": SKIN, "S": SKIN2, "h": "#3d3399", "H": "#241a5e", "y": "#f0b429",
                                             "r": "#d83030", "R": "#8f1d1d", "w": W, "b": "#2c3fa8", "B": "#1a2670", "e": "#2a1d14"})
cf.poly([(2, 25), (30, 25), (32, 32), (0, 32)], "b", dark="H", outline="k")
cf.rect(0, 25, 7, 29, "H", outline="k"); cf.rect(24, 25, 31, 29, "H", outline="k")        # hombreras
cf.rect(8, 22, 24, 25, "y", outline="k")                                                  # pañuelo
cf.ellipse(16, 18, 7, 6, "s", dark="S", outline="k")                                      # mandíbula
cf.ellipse(16, 11, 10, 9, "h", dark="H", outline="k", clip=lambda x, y: y <= 15 or x <= 8 or x >= 24)  # casco
cf.rect(7, 10, 25, 14, "r", dark="R", outline="k")                                        # visera
cf.blit(11, 11, ["ww.", "kw."]); cf.blit(19, 11, [".ww", ".wk"])
cf.poly([(4, 10), (12, 5), (12, 10)], "y", outline="k"); cf.poly([(28, 10), (20, 5), (20, 10)], "y", outline="k")  # alas
cf.poly([(11, 10), (16, 0), (21, 10)], "y", outline="k")                                   # cresta halcón
cf.px(15, 5, "k"); cf.px(17, 5, "k"); cf.rect(15, 8, 17, 9, "k")
cf.rect(14, 20, 18, 20, "k")

# =====================================================================
# GANONDORF
# =====================================================================
g = Sp("ganondorf", "Ganondorf", {"k": K, "s": "#a4b58e", "S": "#6f8560", "h": "#d9551c", "H": "#8f300c", "a": "#2b2540", "A": "#15121f",
                                  "y": "#e3b341", "e": "#f2d24a", "r": "#c9262b", "w": W})
g.poly([(1, 24), (31, 24), (32, 32), (0, 32)], "a", dark="A", outline="k")
g.rect(6, 24, 26, 26, "y", outline="k")
g.ellipse(16, 13, 11, 10, "h", dark="H", outline="k")                                     # pelo
g.rect(4, 14, 6, 24, "h"); g.rect(26, 14, 28, 24, "h")
g.ellipse(16, 17, 8, 8, "s", dark="S", outline="k")
g.poly([(5, 15), (9, 12), (9, 20)], "s", outline="k"); g.poly([(27, 15), (23, 12), (23, 20)], "s", outline="k")  # orejas
g.poly([(8, 9), (24, 9), (23, 12), (18, 11), (14, 11), (9, 12)], "h", dark="H", outline="k")  # flequillo
g.blit(14, 9, [".y.", "yry", ".y."])                                                        # joya
g.blit(9, 13, ["kkkk.", ".ee..", ".kk.."]); g.blit(18, 13, [".kkkk", "..ee.", "..kk."])
g.ellipse(16, 19, 2, 3, "s", dark="S", outline="k")                                       # nariz
g.rect(13, 23, 19, 23, "k")

# =====================================================================
# FOX
# =====================================================================
f = Sp("fox", "Fox", {"k": K, "o": "#ee9a3c", "O": "#b96a1c", "c": "#faf5e6", "C": "#d6cdb3", "w": W, "j": "#e9e9ef", "J": "#b4b4c2",
                      "g": "#4a9b48", "r": "#d12c2c", "d": "#8a8f9c", "e": "#2d7f3a"})
f.poly([(2, 24), (30, 24), (32, 32), (0, 32)], "j", dark="J", outline="k")
f.rect(11, 25, 21, 31, "g", outline="k")
f.rect(8, 23, 24, 25, "r", outline="k")
f.poly([(4, 13), (8, 1), (13, 10)], "o", dark="O", outline="k"); f.poly([(6, 11), (8, 4), (11, 10)], "c")
f.poly([(28, 13), (24, 1), (19, 10)], "o", dark="O", outline="k"); f.poly([(26, 11), (24, 4), (21, 10)], "c")
f.ellipse(16, 15, 10, 8, "o", dark="O", outline="k")
f.ellipse(16, 19, 8, 5, "c", dark="C", outline="k")                                       # hocico
f.poly([(5, 15), (9, 17), (6, 22)], "c", outline="k"); f.poly([(27, 15), (23, 17), (26, 22)], "c", outline="k")  # mejillas
f.blit(10, 12, ["kkk.", ".cck", ".ck."]); f.blit(18, 12, [".kkk", "kcc.", ".ck."])
f.ellipse(16, 20, 1, 1, "k"); f.px(15, 19, "c")
f.rect(16, 21, 16, 22, "k")
f.blit(22, 11, ["dd", "dd"]); f.px(21, 13, "d"); f.px(20, 14, "d"); f.px(19, 15, "d"); f.px(23, 12, "g")  # auricular

# =====================================================================
# FALCO
# =====================================================================
fa = Sp("falco", "Falco", {"k": K, "b": "#3f5bd6", "B": "#22347f", "l": "#a9b9f7", "y": "#f3a71b", "Y": "#c57a0e",
                           "r": "#e3432b", "w": W, "j": "#c73a3a", "g": "#2f8c7f"})
fa.poly([(2, 24), (30, 24), (32, 32), (0, 32)], "j", dark="B", outline="k")
fa.rect(12, 25, 20, 31, "g", outline="k")
fa.poly([(5, 10), (7, 2), (10, 6), (14, 0), (17, 5), (21, 1), (24, 8), (26, 11)], "b", dark="B", outline="k")   # cresta
fa.ellipse(16, 14, 10, 9, "b", dark="B", outline="k")
fa.ellipse(16, 17, 7, 6, "l")                                                               # cara clara
fa.poly([(5, 11), (14, 10), (14, 15), (9, 17), (5, 15)], "r", outline="k")                  # marcas rojas
fa.poly([(27, 11), (18, 10), (18, 15), (23, 17), (27, 15)], "r", outline="k")
fa.blit(9, 12, ["ww", "wk", "kk"]); fa.blit(21, 12, ["ww", "kw", "kk"])
fa.poly([(9, 16), (23, 16), (17, 26), (15, 26)], "y", dark="Y", outline="k")                # pico
fa.line(10, 21, 22, 21, "k")
fa.px(13, 18, "Y"); fa.px(19, 18, "Y")
# =====================================================================
# NESS
# =====================================================================
n = Sp("ness", "Ness", {"k": K, "s": SKIN, "S": SKIN2, "r": "#d82b2b", "R": "#951818", "b": "#2b4fc4", "B": "#1a3285",
                        "h": "#1d1510", "w": W, "y": "#f2d03d", "p": "#c62a2a"})
n.poly([(3, 25), (29, 25), (32, 32), (0, 32)], "y", outline="k")
n.rect(1, 27, 30, 28, "b"); n.rect(0, 31, 31, 31, "b")
n.rect(8, 25, 9, 31, "R", outline="k"); n.rect(22, 25, 23, 31, "R", outline="k")
n.ellipse(16, 15, 10, 7, "h", outline="k")
n.ellipse(16, 16, 8, 8, "s", dark="S", outline="k")
n.rect(8, 13, 9, 18, "h"); n.rect(22, 13, 23, 18, "h")
n.ellipse(7, 17, 1, 2, "s", outline="k"); n.ellipse(25, 17, 1, 2, "s", outline="k")
n.ellipse(16, 9, 9, 6, "r", dark="R", outline="k", clip=lambda x, y: y <= 10)
n.rect(5, 10, 26, 12, "b", dark="B", outline="k")
n.rect(10, 7, 22, 7, "R")
n.blit(12, 14, ["wk", "kk", "kk"]); n.blit(18, 14, ["wk", "kk", "kk"])
n.px(16, 18, "S")
n.blit(13, 19, ["k...k", ".kkk."])

# =====================================================================
# ICE CLIMBERS
# =====================================================================
ic = Sp("ice-climbers", "Ice Climbers", {"k": K, "s": SKIN, "b": "#3b63d8", "B": "#223c95", "p": "#ec6fb0", "P": "#b1397a",
                                         "f": "#f3eee2", "F": "#c6bfae", "h": "#5a3a1e", "w": W})
def climber(cx, col, dark):
    ic.poly([(cx - 7, 19), (cx + 7, 19), (cx + 9, 32), (cx - 9, 32)], col, dark=dark, outline="k")
    ic.rect(cx - 7, 25, cx + 7, 26, "f")
    ic.ellipse(cx, 12, 7, 7, col, dark=dark, outline="k")
    ic.ellipse(cx, 13, 5, 5, "f", dark="F", outline="k")
    ic.ellipse(cx, 14, 3, 3, "s", outline="k")
    ic.rect(cx - 2, 11, cx + 2, 12, "h")
    ic.px(cx - 1, 14, "k"); ic.px(cx + 1, 14, "k"); ic.px(cx, 16, "k")
climber(22, "p", "P")
climber(10, "b", "B")

# =====================================================================
# KIRBY
# =====================================================================
kb = Sp("kirby", "Kirby", {"k": K, "p": "#ffa8c8", "P": "#e0719e", "L": "#ffd3e3", "b": "#1d2457", "e": "#3f6ee8",
                           "w": W, "c": "#f06c8e", "r": "#e3384d", "R": "#a5223a"})
kb.ellipse(16, 15, 12, 11, "p", dark="P", light="L", outline="k")
kb.ellipse(3, 18, 3, 3, "p", dark="P", outline="k"); kb.ellipse(29, 18, 3, 3, "p", dark="P", outline="k")
kb.ellipse(9, 27, 5, 3, "r", dark="R", outline="k"); kb.ellipse(23, 27, 5, 3, "r", dark="R", outline="k")
kb.blit(12, 10, ["kk", "ww", "bb", "bb", "ee", "kk"]); kb.blit(18, 10, ["kk", "ww", "bb", "bb", "ee", "kk"])
kb.blit(14, 18, ["k.k", ".k."])
kb.rect(8, 16, 9, 17, "c"); kb.rect(22, 16, 23, 17, "c")

# =====================================================================
# SAMUS
# =====================================================================
sm = Sp("samus", "Samus", {"k": K, "o": "#ff8f2e", "O": "#c45a10", "y": "#f7d04b", "g": "#6ee57e", "G": "#2f9a44",
                           "r": "#d8332f", "R": "#8f1d1c", "d": "#3a3f50", "w": W})
sm.rect(12, 19, 20, 24, "d", outline="k")
sm.poly([(8, 23), (24, 23), (26, 32), (6, 32)], "o", dark="O", outline="k")
sm.rect(13, 26, 19, 31, "y", outline="k")
sm.ellipse(5, 27, 6, 5, "r", dark="R", outline="k"); sm.ellipse(27, 27, 6, 5, "r", dark="R", outline="k")
sm.ellipse(16, 12, 9, 9, "r", dark="R", outline="k", clip=lambda x, y: y <= 9)             # cresta roja
sm.ellipse(16, 13, 9, 8, "o", dark="O", outline="k")
sm.poly([(8, 10), (24, 10), (24, 14), (19, 19), (13, 19), (8, 14)], "g", dark="G", outline="k")
sm.rect(10, 11, 12, 11, "w"); sm.px(10, 12, "w")
sm.rect(10, 7, 22, 7, "O")

# =====================================================================
# ZELDA
# =====================================================================
z = Sp("zelda", "Zelda", {"k": K, "s": SKIN, "S": SKIN2, "h": "#6e3d1f", "H": "#45220f", "y": "#e3b341", "p": "#e7a6c8",
                          "P": "#b1659a", "e": "#4a6fd6", "r": "#d13c45", "w": W, "l": "#f0e2f1"})
z.ellipse(16, 14, 10, 9, "h", dark="H", outline="k")
z.poly([(5, 14), (10, 14), (10, 32), (3, 32)], "h", dark="H", outline="k"); z.poly([(27, 14), (22, 14), (22, 32), (29, 32)], "h", dark="H", outline="k")
z.poly([(9, 25), (23, 25), (24, 32), (8, 32)], "p", dark="P", outline="k")
z.rect(14, 26, 18, 31, "w")
z.ellipse(8, 26, 3, 2, "y", outline="k"); z.ellipse(24, 26, 3, 2, "y", outline="k")
z.ellipse(16, 16, 7, 7, "s", dark="S", outline="k")
z.poly([(6, 15), (9, 12), (9, 19)], "s", outline="k"); z.poly([(26, 15), (23, 12), (23, 19)], "s", outline="k")
z.poly([(9, 9), (23, 9), (23, 12), (19, 11), (16, 13), (13, 11), (9, 12)], "h", dark="H", outline="k")
z.rect(10, 9, 22, 9, "y"); z.blit(15, 8, [".y.", "yey"])
z.blit(11, 13, ["kk..", ".ww.", ".ee.", ".ee."]); z.blit(17, 13, ["..kk", ".ww.", ".ee.", ".ee."])
z.rect(15, 21, 17, 21, "P")

# =====================================================================
# SHEIK
# =====================================================================
sh = Sp("sheik", "Sheik", {"k": K, "s": SKIN, "S": SKIN2, "y": "#f2d060", "Y": "#c7a030", "w": "#ece9e0", "W": "#b9b5aa",
                           "b": "#2d3a8f", "B": "#1a2460", "r": "#d8222a"})
sh.poly([(2, 24), (30, 24), (32, 32), (0, 32)], "b", dark="B", outline="k")
sh.rect(11, 25, 21, 31, "w", dark="W", outline="k")
sh.rect(15, 26, 17, 30, "r"); sh.px(16, 28, "w")
sh.rect(26, 12, 28, 26, "y", dark="Y", outline="k")                                        # trenza
sh.ellipse(16, 13, 9, 8, "w", dark="W", outline="k")                                       # turbante
sh.ellipse(16, 17, 7, 6, "s", dark="S", outline="k")
sh.poly([(8, 18), (24, 18), (23, 24), (9, 24)], "w", dark="W", outline="k")                # máscara
sh.poly([(7, 9), (24, 9), (25, 13), (20, 13), (16, 15), (13, 20), (9, 20), (7, 14)], "y", dark="Y", outline="k")  # flequillo
sh.blit(18, 13, ["kkkk", ".rrk", "..k."])

# =====================================================================
# LINK
# =====================================================================
def link_base(slug, name, young=False):
    L = Sp(slug, name, {"k": K, "s": SKIN, "S": SKIN2, "y": "#f0c94a", "Y": "#c49a2a", "g": "#3e9a3c", "G": "#246a25",
                        "e": "#3a7bd5", "w": W, "t": "#7b4b22", "c": "#d7d9e0"})
    L.poly([(3, 25), (29, 25), (32, 32), (0, 32)], "g", dark="G", outline="k")
    L.rect(12, 25, 20, 31, "w")                                                              # cota de malla
    L.rect(11, 29, 21, 31, "t", outline="k")
    if young:
        L.poly([(22, 6), (28, 1), (31, 8), (27, 10), (24, 9)], "g", dark="G", outline="k")
        L.ellipse(16, 10, 10, 6, "g", dark="G", outline="k", clip=lambda x, y: y <= 11)
        L.ellipse(16, 17, 8, 7, "s", dark="S", outline="k")
        L.poly([(3, 16), (9, 14), (9, 20)], "s", outline="k"); L.poly([(29, 16), (23, 14), (23, 20)], "s", outline="k")
        L.poly([(7, 11), (25, 11), (25, 14), (22, 16), (19, 13), (16, 16), (13, 13), (10, 16), (7, 14)], "y", dark="Y", outline="k")
        L.rect(6, 10, 26, 11, "g", outline="k")
        L.blit(11, 15, ["ww", "ee", "ee", "kk"]); L.blit(19, 15, ["ww", "ee", "ee", "kk"])
        L.rect(15, 21, 17, 21, "k")
    else:
        L.poly([(21, 7), (29, 3), (31, 13), (29, 20), (26, 14), (23, 10)], "g", dark="G", outline="k")
        L.ellipse(16, 10, 9, 6, "g", dark="G", outline="k", clip=lambda x, y: y <= 10)
        L.ellipse(16, 17, 7, 7, "s", dark="S", outline="k")
        L.poly([(4, 15), (9, 13), (9, 19)], "s", outline="k"); L.poly([(28, 15), (23, 13), (23, 19)], "s", outline="k")
        L.rect(8, 12, 9, 17, "y"); L.rect(22, 12, 23, 17, "y")
        L.poly([(7, 10), (25, 10), (25, 13), (22, 15), (20, 12), (17, 15), (14, 12), (11, 15), (8, 13)], "y", dark="Y", outline="k")
        L.rect(6, 9, 26, 10, "g", outline="k")
        L.blit(12, 15, ["ww", "ee", "ee"]); L.blit(18, 15, ["ww", "ee", "ee"])
        L.rect(11, 14, 13, 14, "Y"); L.rect(18, 14, 20, 14, "Y")
        L.rect(14, 21, 18, 21, "k")
    return L


link_base("link", "Link")
link_base("young-link", "Young Link", young=True)

# =====================================================================
# PICHU
# =====================================================================
pc = Sp("pichu", "Pichu", {"k": K, "y": "#f9e384", "Y": "#d9b84a", "w": W, "p": "#f49ab2", "b": "#1a1620"})
pc.poly([(9, 26), (23, 26), (25, 32), (7, 32)], "y", dark="Y", outline="k")
pc.blit(10, 26, ["bb.bb.bb.bb.b", ".bbbbbbbbbbb."])
pc.poly([(1, 1), (13, 10), (5, 15)], "y", dark="Y", outline="k"); pc.poly([(1, 1), (8, 6), (4, 10)], "b")
pc.poly([(31, 1), (19, 10), (27, 15)], "y", dark="Y", outline="k"); pc.poly([(31, 1), (24, 6), (28, 10)], "b")
pc.ellipse(16, 18, 10, 8, "y", dark="Y", outline="k")
pc.blit(11, 15, ["kk", "wk", "kk"]); pc.blit(19, 15, ["kk", "kw", "kk"])
pc.px(16, 19, "k")
pc.blit(14, 20, ["k.k", ".k."])
pc.rect(7, 20, 9, 21, "p"); pc.rect(23, 20, 25, 21, "p")

# =====================================================================
# PIKACHU
# =====================================================================
pk = Sp("pikachu", "Pikachu", {"k": K, "y": "#f9d33a", "Y": "#d1a51c", "w": W, "r": "#e23b2a", "b": "#1a1620"})
pk.poly([(7, 26), (25, 26), (28, 32), (4, 32)], "y", dark="Y", outline="k")
pk.poly([(2, 0), (8, 0), (13, 12), (7, 14)], "y", dark="Y", outline="k"); pk.poly([(2, 0), (8, 0), (10, 5), (4, 5)], "b")
pk.poly([(30, 0), (24, 0), (19, 12), (25, 14)], "y", dark="Y", outline="k"); pk.poly([(30, 0), (24, 0), (22, 5), (28, 5)], "b")
pk.ellipse(16, 18, 10, 8, "y", dark="Y", outline="k")
pk.blit(10, 15, ["kk", "wk", "kk"]); pk.blit(20, 15, ["kk", "kw", "kk"])
pk.px(16, 19, "k")
pk.blit(13, 21, ["k...k", ".k.k.", "..k.."])
pk.ellipse(8, 21, 1, 1, "r"); pk.ellipse(24, 21, 1, 1, "r")

# =====================================================================
# JIGGLYPUFF
# =====================================================================
jp = Sp("jigglypuff", "Jigglypuff", {"k": K, "p": "#ffb6d3", "P": "#e07aa6", "L": "#ffdbe9", "w": W, "g": "#3cc08c", "G": "#1f7a52", "m": "#d9486f"})
jp.poly([(3, 10), (6, 2), (12, 7)], "p", dark="P", outline="k"); jp.poly([(29, 10), (26, 2), (20, 7)], "p", dark="P", outline="k")
jp.ellipse(16, 17, 12, 11, "p", dark="P", light="L", outline="k")
jp.ellipse(8, 29, 4, 3, "P", outline="k"); jp.ellipse(24, 29, 4, 3, "P", outline="k")
jp.ellipse(2, 20, 3, 3, "p", dark="P", outline="k"); jp.ellipse(30, 20, 3, 3, "p", dark="P", outline="k")
jp.blit(12, 2, ["...kkk..", "..kpppk.", ".kppkkk.", "kppk....", "kppk....", ".kk....."])             # rizo
jp.ellipse(11, 16, 3, 4, "g", dark="G", outline="k"); jp.ellipse(21, 16, 3, 4, "g", dark="G", outline="k")
jp.rect(9, 13, 10, 14, "w"); jp.rect(19, 13, 20, 14, "w"); jp.px(12, 18, "w"); jp.px(22, 18, "w")
jp.blit(14, 22, ["k...k", ".kkk."])

# =====================================================================
# MEWTWO
# =====================================================================
mw = Sp("mewtwo", "Mewtwo", {"k": K, "l": "#d4c2ea", "L": "#a68bc4", "v": "#6f4aa8", "V": "#4a2d78", "e": "#8b4fe0", "w": W})
mw.rect(24, 14, 27, 26, "v", dark="V", outline="k")                                       # tubo
mw.rect(13, 18, 19, 25, "l", dark="L", outline="k")                                       # cuello
mw.poly([(5, 24), (27, 24), (29, 32), (3, 32)], "l", dark="L", outline="k")
mw.rect(12, 26, 20, 31, "v", dark="V", outline="k")
mw.poly([(6, 9), (8, 0), (12, 7)], "l", dark="L", outline="k"); mw.poly([(26, 9), (24, 0), (20, 7)], "l", dark="L", outline="k")
mw.ellipse(16, 12, 9, 8, "l", dark="L", outline="k")
mw.blit(9, 10, ["kkkk.", ".eeek", "..kk."]); mw.blit(18, 10, [".kkkk", "keee.", ".kk.."])
mw.rect(15, 17, 17, 17, "k")

# =====================================================================
# MR. GAME & WATCH
# =====================================================================
gw = Sp("mr-game-and-watch", "Mr. Game & Watch", {"k": "#000000", "o": "#aeb3c2", "w": W})
gw.poly([(5, 21), (21, 21), (25, 32), (1, 32)], "k")
gw.ellipse(13, 12, 8, 8, "k")
gw.ellipse(23, 14, 4, 2, "k")                                                              # nariz
gw.poly([(17, 19), (23, 17), (23, 20)], "k")                                               # boca/barbilla
gw.rect(18, 18, 24, 18, "o")                                                               # boca
gw.rect(27, 11, 28, 22, "k"); gw.rect(24, 5, 31, 10, "k")                                 # martillo del juez
gw.rect(26, 7, 29, 8, "w")
gw.silhouette("o")

# =====================================================================
# MARTH
# =====================================================================
ma = Sp("marth", "Marth", {"k": K, "s": SKIN, "S": SKIN2, "b": "#3d62dc", "B": "#233a94", "y": "#e3b341", "a": "#2c3e9a", "A": "#182460",
                           "w": W, "e": "#3d62dc", "c": "#dadce8", "C": "#9a9db0", "r": "#b02a3a"})
ma.poly([(3, 25), (29, 25), (32, 32), (0, 32)], "a", dark="A", outline="k")
ma.rect(13, 25, 19, 31, "A")
ma.rect(10, 26, 22, 26, "y")
ma.ellipse(6, 27, 4, 3, "c", dark="A", outline="k"); ma.ellipse(26, 27, 4, 3, "c", dark="A", outline="k")
ma.ellipse(16, 13, 10, 9, "b", dark="B", outline="k")
ma.poly([(5, 13), (10, 13), (9, 27), (5, 26)], "b", dark="B", outline="k"); ma.poly([(27, 13), (22, 13), (23, 27), (27, 26)], "b", dark="B", outline="k")
ma.ellipse(16, 17, 7, 7, "s", dark="S", outline="k")
ma.rect(8, 13, 9, 17, "b"); ma.rect(22, 13, 23, 17, "b")
ma.poly([(7, 9), (25, 9), (25, 14), (21, 17), (18, 12), (15, 17), (11, 15), (7, 14)], "b", dark="B", outline="k")
ma.rect(7, 7, 25, 8, "y"); ma.rect(8, 8, 24, 8, "k"); ma.rect(7, 7, 25, 7, "y"); ma.blit(15, 6, [".y.", "ywy"])
ma.blit(12, 15, ["ww", "ee", "ee"]); ma.blit(18, 15, ["ww", "ee", "ee"])
ma.rect(14, 21, 18, 21, "k")

# =====================================================================
# ROY
# =====================================================================
ro = Sp("roy", "Roy", {"k": K, "s": SKIN, "S": SKIN2, "r": "#e04a2a", "R": "#9a2416", "b": "#2f55c8", "B": "#1c3a90", "a": "#2b3f9e", "A": "#182765",
                       "y": "#e3b341", "w": W, "e": "#2f55c8"})
ro.poly([(3, 25), (29, 25), (32, 32), (0, 32)], "a", dark="A", outline="k")
ro.rect(12, 25, 20, 31, "R", outline="k"); ro.rect(10, 26, 22, 26, "y")
ro.rect(0, 25, 7, 28, "y", outline="k"); ro.rect(24, 25, 31, 28, "y", outline="k")
ro.poly([(5, 12), (7, 4), (10, 8), (13, 2), (16, 7), (19, 1), (22, 7), (25, 3), (27, 12)], "r", dark="R", outline="k")
ro.ellipse(16, 13, 10, 8, "r", dark="R", outline="k")
ro.ellipse(16, 17, 7, 7, "s", dark="S", outline="k")
ro.rect(8, 13, 9, 17, "r"); ro.rect(22, 13, 23, 17, "r")
ro.poly([(7, 9), (25, 9), (25, 13), (22, 16), (19, 12), (16, 17), (12, 13), (9, 15), (7, 13)], "r", dark="R", outline="k")
ro.rect(7, 11, 25, 12, "b", outline="k"); ro.rect(8, 11, 24, 11, "b")
ro.blit(12, 15, ["ww", "ee", "ee"]); ro.blit(18, 15, ["ww", "ee", "ee"])
ro.blit(13, 20, ["k....", ".kkkk"])


# =====================================================================
# salida
# =====================================================================
ORDER = ["dr-mario", "mario", "luigi", "bowser", "peach", "yoshi", "donkey-kong", "captain-falcon", "ganondorf", "falco", "fox",
         "ness", "ice-climbers", "kirby", "samus", "zelda", "sheik", "link", "young-link", "pichu", "pikachu", "jigglypuff",
         "mewtwo", "mr-game-and-watch", "marth", "roy"]
by = {s.slug: s for s in SPRITES}
assert set(ORDER) == set(by), set(ORDER) ^ set(by)

def cleanup(s):
    used = {ch for r in s.rows() for ch in r if ch != "."}
    s.pal = {k: v for k, v in s.pal.items() if k in used}
    # fusionar chars con el mismo hex
    byhex = {}
    remap = {}
    for k, v in list(s.pal.items()):
        if v in byhex:
            remap[k] = byhex[v]; del s.pal[k]
        else:
            byhex[v] = k
    if remap:
        for y in range(SIZE):
            s.g[y] = [remap.get(ch, ch) for ch in s.g[y]]

for s in SPRITES:
    cleanup(s)
    for r in s.rows():
        assert len(r) == 32
        for ch in r:
            assert ch == "." or ch in s.pal, (s.slug, ch)
    if len(s.pal) > 10: print("PALETA>10", s.slug, len(s.pal), "".join(sorted(s.pal)))

js = ["// Retratos pixel art 32x32 de los 26 personajes de Melee — arte original de Melee Dominicana.",
      "// Formato: { slug: { name, palette: {char: '#hex'}, rows: ['...32 chars...'] } }, '.' = transparente.",
      "window.MD_SPRITES = {"]
for slug in ORDER:
    s = by[slug]
    js.append(f"  {json.dumps(slug)}: {{")
    js.append(f"    name: {json.dumps(s.name)},")
    js.append("    palette: " + json.dumps(s.pal) + ",")
    js.append("    rows: [")
    for r in s.rows():
        js.append(f"      {json.dumps(r)},")
    js.append("    ]")
    js.append("  },")
js.append("};")
js.append("""
/** Pinta el sprite `slug` en un <canvas> de 32x32 (escálalo con CSS + image-rendering: pixelated). */
window.MD_drawSprite = function (slug, canvas) {
  var sp = window.MD_SPRITES[slug];
  if (!sp) { console.warn("MD_drawSprite: sprite desconocido", slug); return false; }
  if (!canvas || !canvas.getContext) { console.warn("MD_drawSprite: canvas inválido", slug); return false; }
  var ok = true;
  if (sp.rows.length !== 32) { console.warn("MD_drawSprite: " + slug + " tiene " + sp.rows.length + " filas (deben ser 32)"); ok = false; }
  sp.rows.forEach(function (row, y) {
    if (row.length !== 32) { console.warn("MD_drawSprite: " + slug + " fila " + y + " mide " + row.length + " (debe ser 32)"); ok = false; }
    for (var x = 0; x < row.length; x++) {
      var ch = row[x];
      if (ch !== "." && !sp.palette[ch]) { console.warn("MD_drawSprite: " + slug + " usa '" + ch + "' en (" + x + "," + y + ") y no está en la paleta"); ok = false; }
    }
  });
  canvas.width = 32; canvas.height = 32;
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 32, 32);
  sp.rows.forEach(function (row, y) {
    for (var x = 0; x < row.length; x++) {
      var c = sp.palette[row[x]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return ok;
};
""")
with open(OUT_JS, "w") as fh:
    fh.write("\n".join(js))
json.dump({s.slug: {"name": s.name, "palette": s.pal, "rows": s.rows()} for s in SPRITES}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "sprites.json"), "w"))

# hoja de contacto
SC, PAD, COLS = 3, 10, 7
cw, chh = 32 * SC + PAD * 2, 32 * SC + PAD * 2 + 14
rows_n = (len(ORDER) + COLS - 1) // COLS
img = Image.new("RGB", (COLS * cw, rows_n * chh), "#07080f")
dr = ImageDraw.Draw(img)
for i, slug in enumerate(ORDER):
    s = by[slug]
    ox, oy = (i % COLS) * cw + PAD, (i // COLS) * chh + PAD
    for yy, r in enumerate(s.rows()):
        for xx, ch in enumerate(r):
            if ch != ".":
                dr.rectangle([ox + xx * SC, oy + yy * SC, ox + xx * SC + SC - 1, oy + yy * SC + SC - 1], fill=s.pal[ch])
    dr.text((ox, oy + 32 * SC + 2), s.name, fill="#e3b341")
img.save(OUT_PNG)
img.resize((img.width * 2 // 3, img.height * 2 // 3), Image.NEAREST).save(OUT_PNG.replace(".png", "_2x.png"))
print("ok", OUT_JS, OUT_PNG)
