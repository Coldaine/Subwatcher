#!/usr/bin/env python3
"""vibeplan.cc wordmark. Pixel-art art from the HERMES_AGENT_LOGO tradition,
lighting and palette designed from the vibeplan.cc brand.

The art
    figlet ANSI Shadow box-drawing letterforms, 6 rows, dark ground, no chrome
    (same construction as hermes_cli/banner.py, HERMES_AGENT_LOGO)

The design
    colour      one flat colour per row, interpolated over the brand ramp from
                assets/logo.svg: the endpoint dot #E9EEF5, the curve gradient
                #6EE7C7 -> #3FBF9C. Six steps read as a gradient at 28px per row
                and stay pixel-crisp, because nothing is anti-aliased.
    ground      a shallow vertical gradient plus a soft radial ambient light
                behind the word, the same move as the radial glow in logo.svg
    light       a dark keyline hugging the art, then a two-step hard-edged neon
                rim and a wide faint halo. The keyline is what keeps the lower
                ramp rows from dissolving into their own glow.
    depth       the art repeated 4px down-right in the bottom ramp colour at 30%
                over the ground, so the word sits in space instead of floating.

Pure stdlib: own PNG encoder (zlib) and own SVG writer. No Pillow, no pyfiglet.
The glyph table holds every shape ANSI Shadow uses for A-Z, 0-9 and '.' '/' '-'
(verified against the font); an unknown character raises instead of rendering wrong.

  python3 make-vibeplan-banner.py                    # both embedded arts
  python3 make-vibeplan-banner.py --out ../         # write into ../ instead of here
  python3 make-vibeplan-banner.py --flat             # art only, no lighting
  python3 make-vibeplan-banner.py --fetch "MY TEXT"  # fetch art for any text
  python3 make-vibeplan-banner.py --art art.txt      # render a local art file
"""
import os
import struct
import sys
import urllib.parse
import urllib.request
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE                          # where the PNG/SVG land; override with --out

# ------------------------------------------------------------------- the brand
BRAND = [(0xE9, 0xEE, 0xF5),        # logo.svg: the endpoint dot
         (0x6E, 0xE7, 0xC7),        # logo.svg: the mint end of the curve gradient
         (0x3F, 0xBF, 0x9C)]        # logo.svg: the teal end

STYLE = "ramp"                      # "ramp": one colour per row, "bands": 3 blocks of 2
BANDS_STEP = 2                      # only used by STYLE="bands"

BG_TOP = (0x0D, 0x14, 0x20)         # logo.svg tile gradient, top stop, lifted
BG_BOT = (0x07, 0x0A, 0x0F)         # logo.svg tile gradient, bottom stop
AMBIENT = (0x6E, 0xE7, 0xC7)        # ambient light colour (mint)
AMBIENT_STRENGTH = 0.11
AMBIENT_CX, AMBIENT_CY = 0.60, 0.40  # focal point, weighted like logo.svg's glow
AMBIENT_RX, AMBIENT_RY = 0.80, 1.05  # ellipse radii as a fraction of w / h

GLOW_COLOR = (0x6E, 0xE7, 0xC7)     # neon rim + halo colour
KEYLINE = (0x05, 0x07, 0x0A)        # dark keyline hugging the art. This is the
                                    # load-bearing part: it separates the art
                                    # from its own glow, so the lower ramp rows
                                    # never dissolve into the halo
RIM_KEY, RIM_INNER, RIM_OUTER = 2, 1, 3   # cumulative ring widths in px
RIM_STRENGTH = (0.88, 0.30)         # blend of GLOW over the ground per rim ring
HALO_RADIUS, HALO_STRENGTH = 12, 0.16

EXT_OFFSET = 4                      # extrusion offset in px
EXT_LEVEL = 0.30                    # bottom ramp colour over the ground

CELL_W, CELL_H = 14, 28             # cell size in px, monospace-ish 1:2
THICKNESS = 6                       # box-drawing line thickness in px
PAD = (30, 26)                      # padding around the art
SS = 3                              # supersample factor (grid-aligned, so no blur)

API = "https://asciified.thelicato.io/api/v2/ascii?text={}&font=ANSI+Shadow"

ART = {
    "VIBEPLAN.CC": """\
██╗   ██╗██╗██████╗ ███████╗██████╗ ██╗      █████╗ ███╗   ██╗    ██████╗ ██████╗
██║   ██║██║██╔══██╗██╔════╝██╔══██╗██║     ██╔══██╗████╗  ██║   ██╔════╝██╔════╝
██║   ██║██║██████╔╝█████╗  ██████╔╝██║     ███████║██╔██╗ ██║   ██║     ██║
╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██╔═══╝ ██║     ██╔══██║██║╚██╗██║   ██║     ██║
 ╚████╔╝ ██║██████╔╝███████╗██║     ███████╗██║  ██║██║ ╚████║██╗╚██████╗╚██████╗
  ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═════╝""",
    "VIBEPLAN": """\
██╗   ██╗██╗██████╗ ███████╗██████╗ ██╗      █████╗ ███╗   ██╗
██║   ██║██║██╔══██╗██╔════╝██╔══██╗██║     ██╔══██╗████╗  ██║
██║   ██║██║██████╔╝█████╗  ██████╔╝██║     ███████║██╔██╗ ██║
╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██╔═══╝ ██║     ██╔══██║██║╚██╗██║
 ╚████╔╝ ██║██████╔╝███████╗██║     ███████╗██║  ██║██║ ╚████║
  ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝""",
}

# ------------------------------------------------------------------ colour maths
def lerp(a, b, t):
    """Blend two RGB triples. t=0 gives a, t=1 gives b."""
    return tuple(int(round(a[k] + (b[k] - a[k]) * t)) for k in range(3))


def brand_ramp(steps):
    """`steps` flat colours interpolated across the three brand colours."""
    if steps < 2:
        return [BRAND[1]]
    out = []
    for i in range(steps):
        t = i / (steps - 1)
        if t <= 0.5:
            out.append(lerp(BRAND[0], BRAND[1], t / 0.5))
        else:
            out.append(lerp(BRAND[1], BRAND[2], (t - 0.5) / 0.5))
    return out


def row_colours(rows):
    """One colour per art row: a smooth ramp, or the Hermes-style 3 blocks."""
    if STYLE == "bands":
        return [BRAND[min(len(BRAND) - 1, r // BANDS_STEP)] for r in range(rows)]
    return brand_ramp(rows)


# ------------------------------------------------------------------ glyph shapes
def glyph_rects(g, cw, chh, t):
    """Rectangles (x, y, w, h) in cell-local px for one box-drawing glyph."""
    cx, cy, h = cw // 2, chh // 2, t // 2
    if g == "\u2588":                                     # full block
        return [(0, 0, cw, chh)]
    if g == "\u2550":                                     # double horizontal
        return [(0, cy - h, cw, t)]
    if g == "\u2551":                                     # double vertical
        return [(cx - h, 0, t, chh)]
    if g == "\u2580":                                     # upper half block
        return [(0, 0, cw, chh // 2)]
    if g == "\u2584":                                     # lower half block
        return [(0, chh // 2, cw, chh - chh // 2)]
    if g == "\u2557":                                     # down + left
        return [(0, cy - h, cx + h, t), (cx - h, cy, t, chh - cy)]
    if g == "\u2554":                                     # down + right
        return [(cx, cy - h, cw - cx, t), (cx - h, cy, t, chh - cy)]
    if g == "\u255A":                                     # up + right
        return [(cx, cy - h, cw - cx, t), (cx - h, 0, t, cy + h)]
    if g == "\u255D":                                     # up + left
        return [(0, cy - h, cx + h, t), (cx - h, 0, t, cy + h)]
    raise SystemExit(f"unmapped glyph {g!r} (U+{ord(g):04X})")


def normalize(lines):
    """Drop blank lines, pad every line to a common width."""
    lines = [ln.rstrip() for ln in lines]
    lines = [ln for ln in lines if ln]
    w = max(len(ln) for ln in lines)
    return [ln.ljust(w) for ln in lines]


# ------------------------------------------------------------------ the renderer
def render(art, cw, chh, t, pad_x, pad_y, scale):
    """The art, flat: one row colour per row, on the mid ground colour.
    Rendered at `scale`x and box-filtered down, which is a no-op here because
    every rectangle edge lands on a multiple of `scale`."""
    rows, cols = len(art), len(art[0])
    colours = row_colours(rows)
    icw, ichh, it = cw * scale, chh * scale, t * scale
    PW, PH = cols * icw + 2 * pad_x * scale, rows * ichh + 2 * pad_y * scale
    ground = lerp(BG_TOP, BG_BOT, 0.5)
    buf = bytearray(bytes(ground) * (PW * PH))
    ox0, oy0 = pad_x * scale, pad_y * scale

    for r, line in enumerate(art):
        col = colours[r]
        for c, g in enumerate(line):
            if g == " ":
                continue
            bx, by = ox0 + c * icw, oy0 + r * ichh
            for (rx, ry, rw, rh) in glyph_rects(g, icw, ichh, it):
                fill = bytes(col) * rw
                for yy in range(by + ry, by + ry + rh):
                    o = (yy * PW + bx + rx) * 3
                    buf[o:o + rw * 3] = fill

    W, H, n = PW // scale, PH // scale, scale * scale
    out = bytearray(W * H * 3)
    for y in range(H):
        for x in range(W):
            rs = gs = bs = 0
            for sy in range(scale):
                base = ((y * scale + sy) * PW + x * scale) * 3
                for sx in range(scale):
                    o = base + sx * 3
                    rs += buf[o]
                    gs += buf[o + 1]
                    bs += buf[o + 2]
            o = (y * W + x) * 3
            out[o] = rs // n
            out[o + 1] = gs // n
            out[o + 2] = bs // n
    return W, H, out


def dilate(mask, W, H, r):
    """Square dilation by r px, separable so it stays cheap."""
    tmp = bytearray(W * H)
    for y in range(H):
        row = y * W
        for x in range(W):
            for dx in range(-r, r + 1):
                xx = x + dx
                if 0 <= xx < W and mask[row + xx]:
                    tmp[row + x] = 1
                    break
    out = bytearray(W * H)
    for x in range(W):
        for y in range(H):
            for dy in range(-r, r + 1):
                yy = y + dy
                if 0 <= yy < H and tmp[yy * W + x]:
                    out[y * W + x] = 1
                    break
    return out


def box_blur(src, W, H, radius, passes):
    """Normalised box blur, separable, sliding window."""
    f = [float(v) for v in src]
    for _ in range(passes):
        out = [0.0] * (W * H)
        for y in range(H):
            row = y * W
            s = sum(f[row:row + min(W, radius + 1)])
            for x in range(W):
                lo, hi = max(0, x - radius), min(W - 1, x + radius)
                out[row + x] = s / (hi - lo + 1)
                if x + radius + 1 < W:
                    s += f[row + x + radius + 1]
                if x - radius >= 0:
                    s -= f[row + x - radius]
        f, out2 = out, [0.0] * (W * H)
        for x in range(W):
            s = sum(f[y * W + x] for y in range(min(H, radius + 1)))
            for y in range(H):
                lo, hi = max(0, y - radius), min(H - 1, y + radius)
                out2[y * W + x] = s / (hi - lo + 1)
                if y + radius + 1 < H:
                    s += f[(y + radius + 1) * W + x]
                if y - radius >= 0:
                    s -= f[(y - radius) * W + x]
        f = out2
    return f


def apply_lighting(rgb, W, H, rows):
    """Ground, sky, glow, extrusion. The glyphs themselves are never touched."""
    N = W * H
    mask = bytearray(N)
    ground_mid = lerp(BG_TOP, BG_BOT, 0.5)
    for i in range(N):
        if rgb[i * 3:i * 3 + 3] != bytes(ground_mid):
            mask[i] = 1

    # 1. ground: shallow vertical gradient, then the radial ambient light
    for y in range(H):
        gy = lerp(BG_TOP, BG_BOT, y / max(1, H - 1))
        row = y * W
        dy = (y - AMBIENT_CY * H) / (AMBIENT_RY * H)
        dy2 = dy * dy
        for x in range(W):
            i = row + x
            if mask[i]:
                continue
            dx = (x - AMBIENT_CX * W) / (AMBIENT_RX * W)
            f = 1.0 - (dx * dx + dy2)
            a = AMBIENT_STRENGTH * f * f if f > 0 else 0.0
            o = i * 3
            for k in range(3):
                rgb[o + k] = int(gy[k] + (AMBIENT[k] - gy[k]) * a)

    # 2. halo: a wide, faint wash, so the light reads as atmosphere
    halo = box_blur(mask, W, H, HALO_RADIUS, 2)
    for i in range(N):
        g = halo[i] * HALO_STRENGTH
        if not g or mask[i]:
            continue
        o = i * 3
        for k in range(3):
            rgb[o + k] = int(rgb[o + k] + (GLOW_COLOR[k] - rgb[o + k]) * g)

    # 3. extrusion: the art again, pushed down-right, dimmed
    ext = tuple(int(c * EXT_LEVEL) for c in row_colours(rows)[-1])
    d = EXT_OFFSET
    for y in range(H - 1, d - 1, -1):
        row = y * W
        src = (y - d) * W
        for x in range(W - 1, d - 1, -1):
            if mask[src + x - d] and not mask[row + x]:
                o = (row + x) * 3
                rgb[o:o + 3] = bytes(ext)

    # 4. keyline, then the neon rim. Two hard-edged rings outside a dark
    #    keyline; nothing here is blurred, so the art stays pixel-crisp.
    k0 = dilate(mask, W, H, RIM_KEY)
    k1 = dilate(mask, W, H, RIM_KEY + RIM_INNER)
    k2 = dilate(mask, W, H, RIM_KEY + RIM_INNER + RIM_OUTER)
    dark = bytes(KEYLINE)
    for i in range(N):
        if mask[i]:
            continue
        o = i * 3
        if k0[i]:
            rgb[o:o + 3] = dark
        elif k1[i] or k2[i]:
            s = RIM_STRENGTH[0] if k1[i] else RIM_STRENGTH[1]
            for k in range(3):
                rgb[o + k] = int(rgb[o + k] + (GLOW_COLOR[k] - rgb[o + k]) * s)
    return rgb


def write_png(path, w, h, rgb):
    raw = bytearray()
    for y in range(h):
        raw.append(0)                                       # filter type 0
        raw += rgb[y * w * 3:(y + 1) * w * 3]

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
           + chunk(b"IEND", b""))
    open(path, "wb").write(png)
    return len(png)


def write_svg(path, art, effects=True, cw=16, chh=32, t=2, pad=(48, 40)):
    """Vector twin. The rim is built by inflating the rectangles, so it stays a
    hard edge like the raster; the halo is the one piece that needs a filter."""
    rows, cols = len(art), len(art[0])
    colours = row_colours(rows)
    w, h = cols * cw + 2 * pad[0], rows * chh + 2 * pad[1]
    ground_mid = lerp(BG_TOP, BG_BOT, 0.5)
    hexof = lambda c: "#%02X%02X%02X" % tuple(c)

    def rects(inflate=0):
        out = []
        for r, line in enumerate(art):
            for c, g in enumerate(line):
                if g == " ":
                    continue
                for (rx, ry, rw, rh) in glyph_rects(g, cw, chh, t):
                    out.append(f'<rect x="{pad[0] + c * cw + rx - inflate}" '
                               f'y="{pad[1] + r * chh + ry - inflate}" '
                               f'width="{rw + 2 * inflate}" height="{rh + 2 * inflate}"/>')
        return "".join(out)

    letter_rects = rects()
    stops = []
    for i, c in enumerate(colours):
        y0 = (pad[1] + i * chh) / h
        y1 = (pad[1] + (i + 1) * chh) / h
        stops.append(f'<stop offset="{y0:.6f}" stop-color="{hexof(c)}"/>')
        stops.append(f'<stop offset="{y1:.6f}" stop-color="{hexof(c)}"/>')
    kk = max(1, int(RIM_KEY * cw / CELL_W))
    k_in = max(kk + 1, int((RIM_KEY + RIM_INNER) * cw / CELL_W))
    k_out = max(k_in + 1, int((RIM_KEY + RIM_INNER + RIM_OUTER) * cw / CELL_W))
    d = max(1, int(EXT_OFFSET * cw / CELL_W))
    ext_col = hexof(tuple(int(c * EXT_LEVEL) for c in colours[-1]))

    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
             f'width="{w}" height="{h}" role="img" aria-label="vibeplan.cc">',
             '<defs>',
             f'<linearGradient id="vpGround" x1="0" y1="0" x2="0" y2="{h}" gradientUnits="userSpaceOnUse">',
             f'<stop offset="0" stop-color="{hexof(BG_TOP)}"/>',
             f'<stop offset="1" stop-color="{hexof(BG_BOT)}"/></linearGradient>',
             f'<radialGradient id="vpAmbient" gradientUnits="userSpaceOnUse" '
             f'cx="{AMBIENT_CX * w:.1f}" cy="{AMBIENT_CY * h:.1f}" r="{AMBIENT_RX * w:.1f}" '
             f'gradientTransform="matrix(1 0 0 {AMBIENT_RY / AMBIENT_RX:.4f} 0 '
             f'{AMBIENT_CY * h * (1 - AMBIENT_RY / AMBIENT_RX):.1f})">',
             f'<stop offset="0" stop-color="{hexof(AMBIENT)}" stop-opacity="{AMBIENT_STRENGTH}"/>',
             f'<stop offset="1" stop-color="{hexof(AMBIENT)}" stop-opacity="0"/></radialGradient>',
             f'<linearGradient id="vpBand" x1="0" y1="0" x2="0" y2="{h}" gradientUnits="userSpaceOnUse">',
             "".join(stops), '</linearGradient>',
             f'<filter id="vpHalo" x="-20%" y="-45%" width="140%" height="190%">'
             f'<feGaussianBlur stdDeviation="{HALO_RADIUS * cw / CELL_W / 2:.1f}"/></filter>',
             '</defs>',
             f'<rect width="{w}" height="{h}" fill="url(#vpGround)"/>',
             f'<rect width="{w}" height="{h}" fill="url(#vpAmbient)"/>']
    if effects:
        parts.append(f'<g fill="{hexof(GLOW_COLOR)}" opacity="{HALO_STRENGTH}" '
                     f'filter="url(#vpHalo)">{letter_rects}</g>')
        parts.append(f'<g fill="{ext_col}" transform="translate({d},{d})">{letter_rects}</g>')
        parts.append(f'<g fill="{hexof(lerp(ground_mid, GLOW_COLOR, RIM_STRENGTH[1]))}">{rects(k_out)}</g>')
        parts.append(f'<g fill="{hexof(lerp(ground_mid, GLOW_COLOR, RIM_STRENGTH[0]))}">{rects(k_in)}</g>')
        parts.append(f'<g fill="{hexof(KEYLINE)}">{rects(kk)}</g>')
    parts.append(f'<g fill="url(#vpBand)">{letter_rects}</g>')
    parts.append("</svg>")
    open(path, "w", encoding="utf-8").write("".join(parts))
    return os.path.getsize(path)


def fetch(text):
    with urllib.request.urlopen(API.format(urllib.parse.quote(text)), timeout=20) as r:
        return r.read().decode("utf-8")


def emit(slug, lines, effects=True):
    art = normalize(lines)
    w, h, rgb = render(art, CELL_W, CELL_H, THICKNESS, PAD[0], PAD[1], SS)
    if effects:
        rgb = apply_lighting(rgb, w, h, len(art))
    png = write_png(os.path.join(OUT, slug + ".png"), w, h, rgb)
    svg = write_svg(os.path.join(OUT, slug + ".svg"), art, effects)
    tag = "designed" if effects else "flat"
    print(f"{slug}: art {len(art[0])}x{len(art)}  {tag}  png {w}x{h} {png}B  svg {svg}B")


if __name__ == "__main__":
    argv = sys.argv[1:]
    effects = "--flat" not in argv
    argv = [a for a in argv if a != "--flat"]
    if "--out" in argv:
        i = argv.index("--out")
        OUT = os.path.abspath(argv[i + 1])
        del argv[i:i + 2]
        os.makedirs(OUT, exist_ok=True)
    if argv[:1] == ["--fetch"]:
        text = " ".join(argv[1:])
        slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in text).strip("-")
        emit(slug, fetch(text).splitlines(), effects)
    elif argv[:1] == ["--art"]:
        p = argv[1]
        emit(os.path.splitext(os.path.basename(p))[0],
             open(p, encoding="utf-8").read().splitlines(), effects)
    else:
        for slug, key in (("banner", "VIBEPLAN.CC"),
                          ("wordmark", "VIBEPLAN")):
            emit(slug, ART[key].splitlines(), effects)
