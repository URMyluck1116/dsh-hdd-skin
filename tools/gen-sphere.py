import math
from PIL import Image, ImageDraw

phi = (1 + 5 ** 0.5) / 2
raw = [(-1, phi, 0), (1, phi, 0), (-1, -phi, 0), (1, -phi, 0),
       (0, -1, phi), (0, 1, phi), (0, -1, -phi), (0, 1, -phi),
       (phi, 0, -1), (phi, 0, 1), (-phi, 0, -1), (-phi, 0, 1)]
faces = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11),
         (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
         (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9),
         (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]


def norm(v):
    length = math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)
    return (v[0] / length, v[1] / length, v[2] / length)


verts = [norm(v) for v in raw]
cache = {}


def mid(a, b):
    key = (a, b) if a < b else (b, a)
    if key in cache:
        return cache[key]
    va, vb = verts[a], verts[b]
    m = norm(((va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2))
    verts.append(m)
    cache[key] = len(verts) - 1
    return cache[key]


for _ in range(3):
    next_faces = []
    for a, b, c in faces:
        ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
        next_faces += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
    faces = next_faces

edges = set()
for a, b, c in faces:
    for u, v in ((a, b), (b, c), (c, a)):
        edges.add((u, v) if u < v else (v, u))

R = 320.0
C = 320.0
segs = []
for u, v in edges:
    zu, zv = verts[u][2], verts[v][2]
    if zu < -0.15 or zv < -0.15:
        continue
    x1, y1 = C + verts[u][0] * R, C - verts[u][1] * R
    x2, y2 = C + verts[v][0] * R, C - verts[v][1] * R
    segs.append((x1, y1, x2, y2))

img = Image.new("RGB", (640, 640), (6, 15, 31))
draw = ImageDraw.Draw(img)
for x1, y1, x2, y2 in segs:
    draw.line((x1, y1, x2, y2), fill=(150, 195, 255), width=2)
img.save("sphere-preview.png")

parts = []
for x1, y1, x2, y2 in segs:
    parts.append(
        '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>' % (x1, y1, x2, y2)
    )
svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">'
    '<g fill="none" stroke="#5b8fd6" stroke-width="0.6" stroke-linecap="round">'
    + "".join(parts)
    + "</g></svg>"
)
with open("sphere.svg", "w", encoding="utf-8") as f:
    f.write(svg)
print("edges", len(segs), "svg bytes", len(svg.encode()))


