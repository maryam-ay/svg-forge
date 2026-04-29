from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import vtracer
import tempfile
import os
import re
from io import BytesIO
from PIL import Image

app = FastAPI(title="SVG Forge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp"}

# ── SVG path post-processing ──────────────────────────────────────────────────

_TOK_RE = re.compile(
    r'([MmZzLlHhVvCcSsQqTtAa])'
    r'|([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)'
)


def _fmt(v: float) -> str:
    s = f"{v:.3f}"
    return s.rstrip('0').rstrip('.') if '.' in s else s


def _catmull_rom_segment(p0, p1, p2, p3):
    cp1 = (p1[0] + (p2[0] - p0[0]) / 6.0, p1[1] + (p2[1] - p0[1]) / 6.0)
    cp2 = (p2[0] - (p3[0] - p1[0]) / 6.0, p2[1] - (p3[1] - p1[1]) / 6.0)
    return cp1, cp2


def _polyline_to_curves(pts: list) -> str:
    """Convert a list of (x, y) points to cubic-bezier SVG commands (no leading M)."""
    n = len(pts)
    if n < 2:
        return ""
    if n == 2:
        return f"L {_fmt(pts[1][0])},{_fmt(pts[1][1])}"
    parts = []
    for i in range(1, n):
        p0 = pts[max(0, i - 2)]
        p1 = pts[i - 1]
        p2 = pts[i]
        p3 = pts[min(n - 1, i + 1)]
        cp1, cp2 = _catmull_rom_segment(p0, p1, p2, p3)
        parts.append(
            f"C {_fmt(cp1[0])},{_fmt(cp1[1])} "
            f"{_fmt(cp2[0])},{_fmt(cp2[1])} "
            f"{_fmt(p2[0])},{_fmt(p2[1])}"
        )
    return " ".join(parts)


def _tokenize_path(d: str) -> list:
    cmds, cur, args = [], None, []
    for m in _TOK_RE.finditer(d):
        if m.group(1):
            if cur is not None:
                cmds.append((cur, args))
            cur, args = m.group(1), []
        else:
            args.append(float(m.group(2)))
    if cur is not None:
        cmds.append((cur, args))
    return cmds


def _smooth_d(d: str) -> str:
    """Smooth all consecutive L-command sequences in one path's d attribute."""
    cmds = _tokenize_path(d)
    cx = cy = sx = sy = 0.0
    out = []
    i = 0

    while i < len(cmds):
        cmd, args = cmds[i]

        if cmd == 'M':
            cx, cy = args[0], args[1]
            sx, sy = cx, cy
            out.append(f"M {_fmt(cx)},{_fmt(cy)}")
            i += 1
            continue

        if cmd == 'm':
            cx += args[0]; cy += args[1]
            sx, sy = cx, cy
            out.append(f"M {_fmt(cx)},{_fmt(cy)}")
            i += 1
            continue

        if cmd in ('L', 'l'):
            # Accumulate all consecutive L/l commands into one polyline
            pts = [(cx, cy)]
            j = i
            while j < len(cmds) and cmds[j][0] in ('L', 'l'):
                c2, a2 = cmds[j]
                for k in range(0, len(a2) - 1, 2):
                    if c2 == 'L':
                        cx, cy = a2[k], a2[k + 1]
                    else:
                        cx += a2[k]; cy += a2[k + 1]
                    pts.append((cx, cy))
                j += 1
            out.append(_polyline_to_curves(pts))
            i = j
            continue

        if cmd in ('Z', 'z'):
            cx, cy = sx, sy
            out.append('Z')
            i += 1
            continue

        if cmd == 'H':
            for x in args:
                cx = x
                out.append(f"L {_fmt(cx)},{_fmt(cy)}")
            i += 1
            continue

        if cmd == 'h':
            for dx in args:
                cx += dx
                out.append(f"L {_fmt(cx)},{_fmt(cy)}")
            i += 1
            continue

        if cmd == 'V':
            for y in args:
                cy = y
                out.append(f"L {_fmt(cx)},{_fmt(cy)}")
            i += 1
            continue

        if cmd == 'v':
            for dy in args:
                cy += dy
                out.append(f"L {_fmt(cx)},{_fmt(cy)}")
            i += 1
            continue

        if cmd == 'C':
            for k in range(0, len(args) - 5, 6):
                x1, y1, x2, y2, x, y = args[k:k + 6]
                cx, cy = x, y
                out.append(f"C {_fmt(x1)},{_fmt(y1)} {_fmt(x2)},{_fmt(y2)} {_fmt(x)},{_fmt(y)}")
            i += 1
            continue

        if cmd == 'c':
            for k in range(0, len(args) - 5, 6):
                dx1, dy1, dx2, dy2, dx, dy = args[k:k + 6]
                x1, y1 = cx + dx1, cy + dy1
                x2, y2 = cx + dx2, cy + dy2
                cx += dx; cy += dy
                out.append(f"C {_fmt(x1)},{_fmt(y1)} {_fmt(x2)},{_fmt(y2)} {_fmt(cx)},{_fmt(cy)}")
            i += 1
            continue

        # S, Q, T, A and their relative variants — pass through, update position
        raw = ' '.join(_fmt(a) for a in args)
        out.append(f"{cmd} {raw}" if raw else cmd)
        if cmd in ('S', 'Q') and len(args) >= 4:
            cx, cy = args[-2], args[-1]
        elif cmd in ('s', 'q') and len(args) >= 4:
            cx += args[-2]; cy += args[-1]
        elif cmd == 'T' and len(args) >= 2:
            cx, cy = args[-2], args[-1]
        elif cmd == 't' and len(args) >= 2:
            cx += args[-2]; cy += args[-1]
        elif cmd == 'A' and len(args) >= 7:
            cx, cy = args[-2], args[-1]
        elif cmd == 'a' and len(args) >= 7:
            cx += args[-2]; cy += args[-1]
        i += 1

    return ' '.join(out)


def smooth_svg_paths(svg_content: str) -> str:
    """Post-process SVG: convert all L-command sequences to smooth catmull-rom bezier curves."""
    return re.sub(
        r'd="([^"]*)"',
        lambda m: f'd="{_smooth_d(m.group(1))}"',
        svg_content,
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


MIN_TRACE_SIZE = 1024  # upscale shortest/longest side to at least this many px


def upscale_for_tracing(img: Image.Image) -> Image.Image:
    """Upscale image so its longest side is at least MIN_TRACE_SIZE pixels.

    Larger pixel grids give vtracer more detail to trace, which dramatically
    improves quality for small logos, icons, and text. Images already larger
    than MIN_TRACE_SIZE are returned unchanged.
    """
    w, h = img.size
    longest = max(w, h)
    if longest >= MIN_TRACE_SIZE:
        return img
    scale = MIN_TRACE_SIZE / longest
    return img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)


@app.post("/convert")
async def convert_image(
    file: UploadFile = File(...),
    color_precision: int = Form(8),
    filter_speckle: int = Form(1),
    mode: str = Form("color"),
    corner_threshold: int = Form(90),
    path_precision: int = Form(10),
    length_threshold: float = Form(2.0),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PNG, JPG, or WebP image.",
        )

    tmp_png_path = None
    tmp_svg_path = None

    try:
        content = await file.read()

        # Normalise to PNG so vtracer always gets a consistent format.
        # This also transparently handles WebP and CMYK JPEGs.
        img = Image.open(BytesIO(content))
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")

        # Upscale small images so vtracer has more pixel detail to trace.
        img = upscale_for_tracing(img)

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            img.save(f, format="PNG")
            tmp_png_path = f.name

        tmp_svg_path = tmp_png_path + ".svg"

        colormode = "color" if mode == "color" else "binary"

        vtracer.convert_image_to_svg_py(
            tmp_png_path,
            tmp_svg_path,
            colormode=colormode,
            hierarchical="stacked",
            mode="spline",
            filter_speckle=max(1, min(32, filter_speckle)),
            color_precision=max(1, min(8, color_precision)),
            layer_difference=16,
            corner_threshold=max(1, min(180, corner_threshold)),
            length_threshold=max(0.5, min(10.0, length_threshold)),
            max_iterations=10,
            splice_threshold=45,
            path_precision=max(1, min(16, path_precision)),
        )

        with open(tmp_svg_path, "r", encoding="utf-8") as f:
            svg_content = f.read()

        svg_content = smooth_svg_paths(svg_content)

        return Response(
            content=svg_content,
            media_type="image/svg+xml",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")

    finally:
        for path in (tmp_png_path, tmp_svg_path):
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except OSError:
                    pass
