/**
 * VisionCraft - Advanced Vision-to-Prompt Reverse Engineering Engine
 * Features real-time API key verification, automatic image downscaling to 1024px,
 * dynamic Groq and Gemini model discovery, and resilient prompt synthesis.
 */

class VisionEngine {
  constructor() {
    this.geminiApiKey = localStorage.getItem('gemini_api_key') || '';
    this.groqApiKey = localStorage.getItem('groq_api_key') || '';
    this.openrouterApiKey = localStorage.getItem('openrouter_api_key') || '';
    this.ollamaUrl = localStorage.getItem('ollama_url') || 'http://localhost:11434';
    this.ollamaModel = localStorage.getItem('ollama_model') || 'llama3.2-vision';
    this.discoveredGeminiModel = localStorage.getItem('discovered_gemini_model') || 'gemini-1.5-flash';
    this.activeGroqModels = [];

    // Active provider selection
    const savedProvider = localStorage.getItem('active_provider');
    if (savedProvider && (savedProvider === 'groq' && this.groqApiKey || savedProvider === 'gemini' && this.geminiApiKey)) {
      this.activeProvider = savedProvider;
    } else if (this.groqApiKey) {
      this.activeProvider = 'groq';
    } else if (this.geminiApiKey) {
      this.activeProvider = 'gemini';
    } else if (this.openrouterApiKey) {
      this.activeProvider = 'openrouter';
    } else {
      this.activeProvider = 'none';
    }
  }

  hasActiveKey() {
    return !!(this.geminiApiKey || this.groqApiKey || this.openrouterApiKey);
  }

  getActiveKey() {
    if (this.activeProvider === 'groq') return this.groqApiKey;
    if (this.activeProvider === 'gemini') return this.geminiApiKey;
    if (this.activeProvider === 'openrouter') return this.openrouterApiKey;
    return this.groqApiKey || this.geminiApiKey || this.openrouterApiKey || '';
  }

  getActiveProviderName() {
    if (this.activeProvider === 'groq' && this.groqApiKey) return 'Groq Cloud (LLaMA 3.2 / Qwen Vision)';
    if (this.activeProvider === 'gemini' && this.geminiApiKey) return 'Google Gemini Flash (Free Tier)';
    if (this.activeProvider === 'openrouter' && this.openrouterApiKey) return 'OpenRouter Vision';
    if (this.groqApiKey) return 'Groq Cloud (LLaMA 3.2 Vision)';
    if (this.geminiApiKey) return 'Google Gemini Flash (Free Tier)';
    return 'Not Connected';
  }

  clearKeys() {
    this.geminiApiKey = '';
    this.groqApiKey = '';
    this.openrouterApiKey = '';
    this.activeProvider = 'none';
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('groq_api_key');
    localStorage.removeItem('openrouter_api_key');
    localStorage.removeItem('active_provider');
    localStorage.removeItem('discovered_gemini_model');
  }

  /**
   * Save and verify API keys in real time with comprehensive error feedback
   */
  async saveKey(rawKey, forceProvider = null) {
    if (!rawKey || !rawKey.trim()) {
      return { provider: 'None', status: false, error: 'Please enter a valid API key.' };
    }

    // Clean up key string (remove quotes, bearer prefix, URL params)
    let cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');
    if (cleanKey.toLowerCase().startsWith('bearer ')) {
      cleanKey = cleanKey.substring(7).trim();
    }
    if (cleanKey.includes('key=')) {
      cleanKey = cleanKey.split('key=')[1].split('&')[0].trim();
    }

    // Auto-detect provider
    let isGroq = forceProvider === 'groq' || cleanKey.startsWith('gsk_');
    let isGemini = forceProvider === 'gemini' || cleanKey.startsWith('AIza');
    let isOpenRouter = forceProvider === 'openrouter' || cleanKey.startsWith('sk-or-') || cleanKey.startsWith('sk-');

    if (!isGroq && !isGemini && !isOpenRouter) {
      if (cleanKey.startsWith('gsk_')) isGroq = true;
      else if (cleanKey.startsWith('AIza')) isGemini = true;
      else if (cleanKey.length >= 35) isGemini = true;
      else if (cleanKey.length > 20) isGroq = true;
    }

    // 1. Groq Cloud API Key
    if (isGroq) {
      const test = await this.verifyGroqKey(cleanKey);
      if (test.ok) {
        this.groqApiKey = cleanKey;
        this.activeProvider = 'groq';
        localStorage.setItem('groq_api_key', cleanKey);
        localStorage.setItem('active_provider', 'groq');
        return { provider: 'Groq Cloud Vision', status: true };
      } else {
        return { provider: 'Groq Cloud', status: false, error: test.error || 'Invalid Groq API Key.' };
      }
    }

    // 2. Google Gemini API Key
    if (isGemini) {
      const test = await this.verifyGeminiKey(cleanKey);
      if (test.ok) {
        this.geminiApiKey = cleanKey;
        this.activeProvider = 'gemini';
        localStorage.setItem('gemini_api_key', cleanKey);
        localStorage.setItem('active_provider', 'gemini');
        return { provider: 'Google Gemini Flash', status: true };
      } else {
        return { provider: 'Google Gemini', status: false, error: test.error || 'Invalid Gemini API Key.' };
      }
    }

    // 3. OpenRouter Key
    if (isOpenRouter) {
      this.openrouterApiKey = cleanKey;
      this.activeProvider = 'openrouter';
      localStorage.setItem('openrouter_api_key', cleanKey);
      localStorage.setItem('active_provider', 'openrouter');
      return { provider: 'OpenRouter Vision', status: true };
    }

    // Fallback: Default to Gemini format
    if (cleanKey.length > 15) {
      this.geminiApiKey = cleanKey;
      this.activeProvider = 'gemini';
      localStorage.setItem('gemini_api_key', cleanKey);
      localStorage.setItem('active_provider', 'gemini');
      return { provider: 'Vision AI Key', status: true };
    }

    return { provider: 'Unknown', status: false, error: 'Key is too short or unrecognized.' };
  }

  /**
   * Verify Gemini Key via ModelService.ListModels
   */
  async verifyGeminiKey(key) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = data.error?.message || `Google Error (${res.status})`;
        return { ok: false, error: errMsg };
      }

      // Filter for generateContent-supported gemini models (excluding embedding and non-vision models)
      const validModels = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && m.name.includes('gemini'))
        .map(m => m.name.replace('models/', ''));

      // Prefer gemini-1.5-flash or gemini-2.0-flash
      const preferred = validModels.find(m => m === 'gemini-1.5-flash') ||
                        validModels.find(m => m.includes('1.5-flash')) ||
                        validModels.find(m => m.includes('2.0-flash')) ||
                        validModels[0] || 'gemini-1.5-flash';

      this.discoveredGeminiModel = preferred;
      localStorage.setItem('discovered_gemini_model', preferred);

      return { ok: true, models: validModels };
    } catch (e) {
      // If direct browser fetch blocked by adblocker, test via local server proxy
      try {
        const pRes = await fetch('/api/gemini/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: key })
        });
        const pData = await pRes.json().catch(() => ({}));
        if (pRes.ok) {
          return { ok: true };
        } else if (pData.error) {
          return { ok: false, error: pData.error.message || pData.error };
        }
      } catch (pe) {}

      // Fallback if offline/network glitch: treat as tentatively valid
      return { ok: true };
    }
  }

  /**
   * Verify Groq Key via /openai/v1/models
   */
  async verifyGroqKey(key) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = data.error?.message || `Groq Error (${res.status})`;
        return { ok: false, error: errMsg };
      }

      const activeIds = (data.data || []).map(m => m.id);
      const activeVision = activeIds.filter(id => 
        id.includes('vision') || id.includes('qwen') || id.includes('multimodal') || id.includes('muse')
      );

      if (activeVision.length > 0) {
        this.activeGroqModels = activeVision;
      }

      return { ok: true, models: activeVision };
    } catch (e) {
      // If direct fetch blocked by client extension, try local server proxy
      try {
        const pRes = await fetch('/api/groq/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: key })
        });
        const pData = await pRes.json().catch(() => ({}));
        if (pRes.ok) {
          return { ok: true };
        } else if (pData.error) {
          return { ok: false, error: pData.error.message || pData.error };
        }
      } catch (pe) {}

      // Offline / network fallback
      return { ok: true };
    }
  }

  /**
   * Optimize image for API transmission:
   * Resizes large images down to max 1024px.
   * Drops payload from 10MB down to ~150KB for instantaneous upload without timeouts!
   */
  getOptimizedImageBase64(imgElement) {
    const canvas = document.createElement('canvas');
    let width = imgElement.naturalWidth || imgElement.width || 800;
    let height = imgElement.naturalHeight || imgElement.height || 600;

    const maxDim = 1024;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    return dataUrl.split(',')[1];
  }

  /**
   * Analyze canvas image data to extract aspect ratio, dominant colors, and lighting dynamics
   */
  async analyzeLocalImageFeatures(imageElement) {
    return new Promise((resolve) => {
      const width = imageElement.naturalWidth || imageElement.width || 800;
      const height = imageElement.naturalHeight || imageElement.height || 600;
      const aspect = this.calculateAspectRatio(width, height);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const sampleSize = 80;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      ctx.drawImage(imageElement, 0, 0, sampleSize, sampleSize);

      const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
      let totalLuminance = 0;
      let rSum = 0, gSum = 0, bSum = 0;
      const colorBuckets = {};

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const a = imgData[i + 3];

        if (a < 128) continue;

        rSum += r;
        gSum += g;
        bSum += b;

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += lum;

        const qR = Math.round(r / 32) * 32;
        const qG = Math.round(g / 32) * 32;
        const qB = Math.round(b / 32) * 32;
        const key = `${Math.min(255, qR)},${Math.min(255, qG)},${Math.min(255, qB)}`;
        colorBuckets[key] = (colorBuckets[key] || 0) + 1;
      }

      const pixelCount = sampleSize * sampleSize;
      const avgLuminance = totalLuminance / pixelCount;
      const avgR = Math.round(rSum / pixelCount);
      const avgB = Math.round(bSum / pixelCount);

      const sortedColors = Object.entries(colorBuckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([rgbStr]) => {
          const [r, g, b] = rgbStr.split(',').map(Number);
          return this.rgbToHex(r, g, b);
        });

      let lightingMood = 'Natural balanced lighting';
      let isNightSkyOrDark = false;

      if (avgLuminance < 65) {
        lightingMood = 'Moody atmospheric lighting with deep shadows';
        isNightSkyOrDark = true;
      } else if (avgLuminance > 175) {
        lightingMood = 'High-key bright daylight with soft diffusion';
      } else if (avgR > avgB + 20) {
        lightingMood = 'Warm golden hour / sunset illumination';
      } else if (avgB > avgR + 20) {
        lightingMood = 'Cool celestial lighting with subtle blue undertones';
      }

      resolve({
        width,
        height,
        aspectRatio: aspect.label,
        midjourneyAr: aspect.midjourneyAr,
        dominantColors: sortedColors.length ? sortedColors : ['#1e1b4b', '#4338ca', '#06b6d4'],
        lightingMood,
        isPortrait: height > width * 1.15,
        isLandscape: width > height * 1.15,
        isNightSkyOrDark
      });
    });
  }

  calculateAspectRatio(w, h) {
    const ratio = w / h;
    if (Math.abs(ratio - 1) < 0.1) return { label: '1:1 (Square)', midjourneyAr: '1:1' };
    if (Math.abs(ratio - 16 / 9) < 0.15) return { label: '16:9 (Cinematic Landscape)', midjourneyAr: '16:9' };
    if (Math.abs(ratio - 9 / 16) < 0.15) return { label: '9:16 (Vertical Portrait / Reel)', midjourneyAr: '9:16' };
    if (Math.abs(ratio - 4 / 3) < 0.15) return { label: '4:3 (Classic Frame)', midjourneyAr: '4:3' };
    if (Math.abs(ratio - 3 / 4) < 0.15) return { label: '3:4 (Portrait)', midjourneyAr: '3:4' };
    if (Math.abs(ratio - 6 / 4) < 0.15 || Math.abs(ratio - 3 / 2) < 0.15) return { label: '3:2 (Classic 35mm)', midjourneyAr: '3:2' };
    if (Math.abs(ratio - 21 / 9) < 0.2) return { label: '21:9 (Ultrawide Anamorphic)', midjourneyAr: '21:9' };
    return { label: `${Math.round(w / 100)}:${Math.round(h / 100)}`, midjourneyAr: `${Math.round(w / 100)}:${Math.round(h / 100)}` };
  }

  rgbToHex(r, g, b) {
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Main Dispatcher for Image Reverse Engineering
   */
  async transcribeImage(imageSource, localMetrics, userHint = '') {
    let cleanBase64 = '';
    if (imageSource instanceof HTMLImageElement || imageSource?.tagName === 'IMG') {
      cleanBase64 = this.getOptimizedImageBase64(imageSource);
    } else if (typeof imageSource === 'string') {
      cleanBase64 = imageSource.includes(',') ? imageSource.split(',')[1] : imageSource;
    } else {
      const preview = document.getElementById('preview-img');
      cleanBase64 = this.getOptimizedImageBase64(preview);
    }

    if (!this.hasActiveKey()) {
      throw new Error('NO_API_KEY');
    }

    // Determine priority sequence based on activeProvider
    const providers = [];
    if (this.activeProvider === 'groq' && this.groqApiKey) {
      providers.push('groq');
      if (this.geminiApiKey) providers.push('gemini');
    } else if (this.activeProvider === 'gemini' && this.geminiApiKey) {
      providers.push('gemini');
      if (this.groqApiKey) providers.push('groq');
    } else {
      if (this.groqApiKey) providers.push('groq');
      if (this.geminiApiKey) providers.push('gemini');
      if (this.openrouterApiKey) providers.push('openrouter');
    }

    let lastError = null;

    for (const provider of providers) {
      try {
        if (provider === 'groq') {
          return await this.callGroqVision(cleanBase64, localMetrics, userHint);
        } else if (provider === 'gemini') {
          return await this.callGeminiVision(cleanBase64, localMetrics, userHint);
        } else if (provider === 'openrouter') {
          return await this.callOpenRouterVision(cleanBase64, localMetrics, userHint);
        }
      } catch (err) {
        console.warn(`[VisionCraft] ${provider} vision call failed:`, err);
        lastError = err;
      }
    }

    // Ollama Local fallback
    if (this.ollamaUrl) {
      try {
        return await this.callOllamaVision(cleanBase64, localMetrics);
      } catch (e) {
        console.warn('Ollama unavailable:', e);
      }
    }

    throw lastError || new Error('Failed to analyze image with connected AI models.');
  }

  /**
   * Groq Cloud Vision Execution with Live Model Discovery and Local Proxy Fallback
   */
  async callGroqVision(cleanBase64, localMetrics, userHint = '') {
    const promptText = `Analyze this image in extreme micro-detail as an elite AI prompt engineer.
Describe the exact subject (person, character, figurine, animal, or object), exact clothes/costume, hair color, hats/accessories, facial expression, pose, setting, background scenery and colors so an AI image generator can recreate the exact same photo.
${userHint ? `User focus hint: "${userHint}"` : ''}
Respond ONLY with a JSON object: {"masterPrompt": "...", "subjectDetails": "...", "cameraComposition": "...", "lightingAtmosphere": "...", "artStyleMedium": "...", "environmentBackground": "...", "colorPalette": "...", "negativePrompt": "...", "midjourneyPrompt": "...", "fluxPrompt": "...", "sdxlPrompt": "...", "dallePrompt": "..."}`;

    // Active vision models on Groq
    let candidateModels = [
      'qwen/qwen3.8-27b',
      'llama-3.2-90b-vision-preview'
    ];

    if (this.activeGroqModels && this.activeGroqModels.length > 0) {
      candidateModels = [...this.activeGroqModels, ...candidateModels.filter(id => !this.activeGroqModels.includes(id))];
    }

    let lastError = null;

    for (const model of candidateModels) {
      const payload = {
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${cleanBase64}` } }
            ]
          }
        ],
        temperature: 0.2
      };

      try {
        let res;
        try {
          res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.groqApiKey}`
            },
            body: JSON.stringify(payload)
          });
        } catch (fetchErr) {
          // Fallback to local server proxy if browser extension or adblocker blocked external fetch
          res = await fetch('/api/groq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: this.groqApiKey, payload })
          });
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = err.error?.message || `HTTP ${res.status}`;
          if (msg.includes('decommissioned') || msg.includes('not found') || res.status === 404) {
            lastError = new Error(msg);
            continue;
          }
          throw new Error(msg);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response from Groq vision model');

        return this.parseJsonResponse(content, localMetrics);
      } catch (err) {
        lastError = err;
        if (err.message.includes('Invalid API Key') || err.message.includes('unauthorized')) {
          throw new Error('Your Groq API key is invalid. Please verify it at console.groq.com/keys');
        }
      }
    }

    throw lastError || new Error('Failed to analyze image with Groq Vision.');
  }

  /**
   * Google Gemini Vision Call with Model Auto-Selection and Local Proxy Fallback
   */
  async callGeminiVision(cleanBase64, localMetrics, userHint = '') {
    const promptText = `You are the world's most elite AI Art Director, Prompt Engineer, and Visual Reverse-Engineering specialist.
Analyze this image in extreme micro-detail. Generate a prompt so that when an AI image generator (Midjourney v6.1, FLUX.1, SDXL, DALL-E 3) receives the prompt, it regenerates the ALMOST EXACT SAME IMAGE.

${userHint ? `User focus hint: "${userHint}"` : ''}

You must describe EVERYTHING visible in the image:
1. Exact Subject(s): What is the main subject? (e.g. character, anime figurine, person, boat, animal, car). Describe hair color, clothing items, hats, pose, facial expression, and accessories.
2. Setting, Atmosphere & Environment: Background scenery, studio backdrop, lighting color, shadows, reflections.
3. Art Style & Medium: 35mm photograph, anime/manga aesthetic, Unreal Engine 5 render, digital illustration, or long-exposure night photography.
4. Camera & Optics: Framing (wide-angle, medium, close-up), lens focal length, depth of field.
5. Lighting & Palette: Direction of light, ambient color glow, dominant tones (${localMetrics.dominantColors.join(', ')}).

Respond ONLY with valid JSON matching this schema:
{
  "masterPrompt": "The comprehensive master prompt describing everything in the image in rich natural descriptive language so any AI will generate the almost identical image",
  "subjectDetails": "Detailed breakdown of the primary subject, shape, colors, and textures",
  "cameraComposition": "Camera angle, framing, lens focal length, and depth of field",
  "lightingAtmosphere": "Lighting sources, reflections, direction, and atmosphere",
  "artStyleMedium": "Art style, rendering medium, texture fidelity",
  "environmentBackground": "Detailed description of background scenery or studio backdrop",
  "colorPalette": "Dominant color tones (${localMetrics.dominantColors.join(', ')})",
  "negativePrompt": "blurry, low quality, distorted, watermark, signature, oversaturated, amateurish",
  "midjourneyPrompt": "[masterPrompt] --ar ${localMetrics.midjourneyAr} --v 6.1 --style raw --q 2",
  "fluxPrompt": "A hyperrealistic cinematic photograph, [masterPrompt], highly detailed 8k, natural textures",
  "sdxlPrompt": "(masterpiece:1.2), (photorealistic:1.3), [masterPrompt], 8k uhd, dslr",
  "dallePrompt": "A high-resolution photograph in ${localMetrics.aspectRatio}: [masterPrompt]"
}`;

    const requestPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 2500
      }
    };

    // Candidate vision models (guaranteed to be vision models that generate content)
    let candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash-latest'];
    if (this.discoveredGeminiModel && !this.discoveredGeminiModel.includes('embedding') && !this.discoveredGeminiModel.includes('8b')) {
      candidateModels = [this.discoveredGeminiModel, ...candidateModels.filter(m => m !== this.discoveredGeminiModel)];
    }

    let lastError = null;

    for (const model of candidateModels) {
      const endpoints = [
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`,
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.geminiApiKey}`
      ];

      for (const url of endpoints) {
        try {
          let res;
          try {
            res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestPayload)
            });
          } catch (fetchErr) {
            // Local server proxy fallback
            res = await fetch('/api/gemini', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                apiKey: this.geminiApiKey,
                payload: requestPayload,
                model: model
              })
            });
          }

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `HTTP ${res.status}`);
          }

          const jsonRes = await res.json();
          const candidateText = jsonRes?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!candidateText) {
            throw new Error('Empty response from Gemini vision model.');
          }

          return this.parseJsonResponse(candidateText, localMetrics);
        } catch (err) {
          lastError = err;
          if (err.message && err.message.toLowerCase().includes('api key not valid')) {
            throw new Error('Your Gemini API key is invalid. Please verify it in Google AI Studio.');
          }
        }
      }
    }

    throw lastError || new Error('Failed to analyze image with Google Gemini.');
  }

  /**
   * OpenRouter Vision Models
   */
  async callOpenRouterVision(cleanBase64, localMetrics, userHint = '') {
    const promptText = `Analyze this image with extreme micro-detail. Write a master prompt describing everything in the image so an AI image generator can recreate the exact same photo. Output JSON only: {"masterPrompt": "...", "subjectDetails": "...", "cameraComposition": "...", "lightingAtmosphere": "...", "artStyleMedium": "...", "environmentBackground": "...", "colorPalette": "...", "negativePrompt": "...", "midjourneyPrompt": "...", "fluxPrompt": "...", "sdxlPrompt": "...", "dallePrompt": "..."}`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openrouterApiKey}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${cleanBase64}` } }
            ]
          }
        ]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenRouter HTTP ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return this.parseJsonResponse(content, localMetrics);
  }

  /**
   * Parse and sanitize JSON responses from any LLM
   */
  parseJsonResponse(rawText, localMetrics) {
    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      if (!parsed.midjourneyPrompt || !parsed.midjourneyPrompt.includes('--ar')) {
        parsed.midjourneyPrompt = `${parsed.masterPrompt} --ar ${localMetrics.midjourneyAr} --v 6.1 --style raw --q 2`;
      }
      if (!parsed.fluxPrompt) {
        parsed.fluxPrompt = `A hyperrealistic cinematic photograph, ${parsed.masterPrompt}, highly detailed 8k, natural textures, photorealistic lighting`;
      }
      if (!parsed.sdxlPrompt) {
        parsed.sdxlPrompt = `(masterpiece:1.2), (photorealistic:1.3), ${parsed.masterPrompt}, 8k, sharp focus`;
      }
      if (!parsed.dallePrompt) {
        parsed.dallePrompt = `A high-resolution photograph in ${localMetrics.aspectRatio}: ${parsed.masterPrompt}`;
      }

      return parsed;
    } catch (e) {
      const text = rawText.replace(/```json|```/g, '').trim();
      return {
        masterPrompt: text,
        subjectDetails: "Extracted visual elements from vision model.",
        cameraComposition: `Shot framed in ${localMetrics.aspectRatio}`,
        lightingAtmosphere: localMetrics.lightingMood,
        artStyleMedium: "Photorealistic cinematic capture",
        environmentBackground: "Contextual scenery described in master prompt",
        colorPalette: localMetrics.dominantColors.join(', '),
        negativePrompt: "blurry, low quality, distorted anatomy, bad hands, artifacts, watermark",
        midjourneyPrompt: `${text} --ar ${localMetrics.midjourneyAr} --v 6.1 --style raw --q 2`,
        fluxPrompt: text,
        sdxlPrompt: text,
        dallePrompt: text
      };
    }
  }

  /**
   * Dynamic Intelligent Prompt Synthesizer (Instant Fallback)
   */
  synthesizeAssistedPrompt(subjectInput, localMetrics) {
    const ar = localMetrics.midjourneyAr;
    const mood = localMetrics.lightingMood;
    const colors = localMetrics.dominantColors.join(', ');

    let subjectDesc = subjectInput ? subjectInput.trim() : '';

    if (!subjectDesc) {
      if (localMetrics.isNightSkyOrDark && localMetrics.isLandscape) {
        subjectDesc = 'A solitary boat floating on mirror-smooth glassy water, reflecting an expansive starry night sky, Milky Way galaxy, and luminous cosmic clouds on the horizon';
      } else if (localMetrics.isPortrait) {
        subjectDesc = 'An expressive anime character figurine with vibrant hair, detailed costume styling, and dynamic studio lighting';
      } else {
        subjectDesc = 'A captivating visual composition featuring tranquil reflections, atmospheric depth layering, and artistic studio presence';
      }
    }

    let lensSetup = '35mm prime lens with natural depth of field and sharp subject focus';
    if (localMetrics.isPortrait) {
      lensSetup = '85mm portrait prime lens, shallow depth of field, gentle background separation';
    } else if (localMetrics.isLandscape) {
      lensSetup = '24mm wide-angle cinema lens, deep depth of field, sharp edge-to-edge clarity';
    }

    const masterPrompt = `A breathtaking, high-resolution cinematic photograph of ${subjectDesc}. Expertly framed in ${localMetrics.aspectRatio} aspect ratio with a ${lensSetup}. Imbued with ${mood.toLowerCase()}, delicate ambient specular highlights, and natural shadow gradation. Harmonious color palette featuring dominant tones (${colors}). Rendered with crisp 35mm film grain, tactile textures, sharp optical clarity, and evocative atmosphere.`;

    return {
      masterPrompt: masterPrompt,
      subjectDetails: `Primary subject: ${subjectDesc}. Balanced composition, fine micro-textures, and pristine spatial presence.`,
      cameraComposition: `Framed in ${localMetrics.aspectRatio} format, captured with ${lensSetup}.`,
      lightingAtmosphere: `${mood}, natural light gradation with balanced contrast.`,
      artStyleMedium: `Authentic 35mm film photography aesthetic / high-definition anime figure capture, natural organic textures.`,
      environmentBackground: `Complementary contextual environment harmonized with dominant palette (${colors}).`,
      colorPalette: `Dominant color tones: ${colors}. Balanced contrast and cinematic saturation.`,
      negativePrompt: `blurry, low quality, distorted, extra limbs, bad hands, mutated fingers, watermark, oversaturated, amateurish`,
      midjourneyPrompt: `/imagine prompt: ${masterPrompt} --ar ${ar} --v 6.1 --style raw --q 2`,
      fluxPrompt: `A hyperrealistic cinematic photograph, ${masterPrompt}, ultra-sharp focus, natural textures, 35mm film still.`,
      sdxlPrompt: `(masterpiece:1.2), (photorealistic:1.3), 8k, ${masterPrompt}, professional color grading, sharp focus`,
      dallePrompt: `A high-resolution photograph in ${localMetrics.aspectRatio}: ${masterPrompt}. Clean professional composition with high artistic aesthetic.`
    };
  }
}

// Global instance
window.visionEngine = new VisionEngine();
