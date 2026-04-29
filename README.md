# SVG Forge

A full-stack web app that converts raster images (PNG, JPG, WebP) into clean, scalable SVG vector graphics. Upload an image, tweak the conversion settings, and download a production-ready SVG — all in the browser.

## Features

- Drag-and-drop or click-to-upload image input
- Live side-by-side preview of the original and converted SVG
- Color mode: full-color or black & white
- Fine-grained controls: color precision, speckle filtering, corner smoothness, and more
- Smooth edge post-processing using Catmull-Rom bezier curve fitting
- Download the resulting SVG with one click

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18 + Vite |
| Backend  | Python FastAPI |
| Tracing  | [vtracer](https://github.com/visioncortex/vtracer) (Rust-powered bitmap-to-vector) |
| Imaging  | Pillow (image normalisation & upscaling) |

## Project Structure

```
svg-converter/
├── backend/
│   ├── main.py           # FastAPI app — /convert and /health endpoints
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js    # proxies /convert and /health → localhost:8000
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── App.css
        └── components/
            ├── DropZone.jsx
            ├── Controls.jsx
            └── Preview.jsx
```

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** and npm

## Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/your-username/svg-converter.git
cd svg-converter
```

### 2. Start the backend

```bash
cd backend
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. You can verify it with:

```bash
curl http://localhost:8000/health
```

### 3. Start the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app

Navigate to **http://localhost:5173**

The Vite dev server automatically proxies `/convert` and `/health` requests to the backend, so no CORS configuration is needed during development.

## Conversion Controls

| Control          | Range | Description |
|------------------|-------|-------------|
| Color Precision  | 1–8   | Number of distinct colors traced into the SVG |
| Filter Speckle   | 1–16  | Removes small noise islands; higher = simpler output |
| Corner Threshold | 1–180 | Angle below which a point is treated as a sharp corner; higher = smoother |
| Output Mode      | —     | Toggle between full-color and black & white output |

## License

MIT — see [LICENSE](LICENSE) for details.
