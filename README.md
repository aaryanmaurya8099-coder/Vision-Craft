# 🎨 VisionCraft Studio - Real AI Image-to-Prompt Reverse Engineer

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen.svg)]()
[![Pure Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%7C%20CSS3-blue.svg)]()
[![Python Standard Library](https://img.shields.io/badge/Backend-Python%203.x-yellow.svg)]()
[![Free AI Vision](https://img.shields.io/badge/Vision%20Models-Groq%20%7C%20Google%20Gemini-violet.svg)]()

> **Turn any photo or screenshot into an exact, micro-detailed AI master prompt.**  
> VisionCraft deeply inspects the subject, facial expressions, wardrobe styling, lighting atmosphere, camera optics, background scenery, and color harmony. Copy the prompt directly into any AI image generator to reproduce the almost identical image!

---

## ⚡ Supported Target Image Generators

VisionCraft synthesizes formatted prompts optimized specifically for:

* 🌌 **Midjourney v6.1** (includes `--ar [ratio]`, `--v 6.1 --style raw --q 2`)
* ⚡ **FLUX.1 [Dev / Schnell]** (photorealistic natural language descriptors)
* 🎯 **Stable Diffusion XL (SDXL)** (quality tag weighting `(masterpiece:1.2)` + negative prompt)
* 🖼️ **DALL-E 3 / ChatGPT** (rich descriptive narrative framing)
* 🚀 **Bing Image Creator / Microsoft Designer**

---

## ✨ Features

- **Extreme Micro-Detail Subject Recognition**:
  - Exact Subject Details (people, characters, figurines, animals, objects, age, posture, expressions).
  - Exact Wardrobe & Materials (clothing items, fabrics, logos, accessories, jewelry, hats).
  - Environment & Scenery (indoor/outdoor, architectural details, textures, weather, props).
  - Camera & Optics (lens focal lengths like `85mm f/1.4`, depth of field, framing, camera angle).
  - Lighting & Palette (lighting sources, rim highlights, reflections, and extracted dominant HEX palette).
- **Smooth Animations & Dark Aesthetic**:
  - Dark glassmorphic interface (`#08090d`) with ambient glowing orbs.
  - 5 Preset Theme Accents (Cyberpunk, Emerald, Sunset, Violet, Arctic) + Live Color Picker.
  - Smooth loading states, micro-interactions, shimmer action buttons, and toast alerts.
- **Client-Side Optimization**:
  - Automatic on-the-fly canvas image downscaling to max 1024px (~150KB payload) to prevent upload timeouts.
  - Direct clipboard paste support (`Ctrl + V`).
  - Drag-and-drop file upload.
- **Zero Heavy Dependencies**:
  - No `node_modules`, no npm build steps, no external pip packages required.
  - Runs natively on any computer with Python 3 installed.

---

## 🚀 Quick Start Guide

### Option 1: Run Locally with Python

1. **Clone this repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vision-prompt-studio.git
   cd vision-prompt-studio
   ```

2. **Start the local server**:
   ```bash
   python server.py
   ```

3. **Open in browser**:
   Navigate to **`http://localhost:8000`** in any web browser.

---

### Option 2: Run in VS Code

1. Open **Visual Studio Code**.
2. Go to **File $\rightarrow$ Open Folder...** and select the `vision-prompt-studio` folder.
3. Press **`F5`** (or open the terminal with `Ctrl + ~` and type `python server.py`).
4. The studio opens automatically in your browser.

---

## 🔑 Free Vision API Setup (Zero Cost Forever)

VisionCraft connects to free vision models so you never pay for subscriptions:

### Recommended: Groq Cloud Vision (Takes 10 Seconds)
1. Head to **[console.groq.com/keys](https://console.groq.com/keys)** and sign in.
2. Click **Create API Key** and copy your key (`gsk_...`).
3. Paste it into VisionCraft's top banner and click **Connect**.
4. *Works immediately with zero project configuration!*

### Option 2: Google Gemini Vision (100% Free Forever)
1. Visit **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2. Click **Create API Key in new project** and copy your key (`AIzaSy...`).
3. Paste it into the banner and click **Connect**.

---

## 📂 Project Structure

```text
vision-prompt-studio/
├── .vscode/
│   ├── launch.json        # 1-Click F5 debug launcher for VS Code
│   └── settings.json      # VS Code configuration
├── css/
│   └── style.css          # Glassmorphic dark styling, animations, themes
├── js/
│   ├── app.js             # UI controller, clipboard paste, event delegation
│   └── vision-engine.js   # Canvas analyzer, downscaler, Groq & Gemini APIs
├── index.html             # Studio workspace interface
├── server.py              # Zero-dependency Python HTTP server & CORS proxy
├── .gitignore             # Excluded build and OS cache files
├── LICENSE                # MIT License
└── README.md              # Project documentation
```

---

## 🤝 Contributing

Contributions, feature requests, and bug reports are welcome!  
Feel free to open an issue or submit a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more details.
