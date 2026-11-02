/**
 * VisionCraft Application Controller
 * Handles UI interactions, themes, clipboard paste, drag & drop, and deep prompt rendering.
 */

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const previewContainer = document.getElementById('preview-container');
  const previewImg = document.getElementById('preview-img');
  const removeImgBtn = document.getElementById('remove-img-btn');
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultsContainer = document.getElementById('results-container');
  const emptyState = document.getElementById('empty-state');
  const loadingOverlay = document.getElementById('loading-overlay');
  const userHintInput = document.getElementById('user-hint-input');
  
  // Error Card Elements
  const apiErrorCard = document.getElementById('api-error-card');
  const apiErrorTitle = document.getElementById('api-error-title');
  const apiErrorMsg = document.getElementById('api-error-msg');
  const errorFixKeyBtn = document.getElementById('error-fix-key-btn');

  // Banner Elements
  const aiStatusIcon = document.getElementById('ai-status-icon');
  const aiStatusTitle = document.getElementById('ai-status-title');
  const aiStatusDesc = document.getElementById('ai-status-desc');
  const bannerInputGroup = document.getElementById('banner-input-group');
  const bannerConnectedGroup = document.getElementById('banner-connected-group');
  const bannerKeyInput = document.getElementById('banner-key-input');
  const bannerSaveBtn = document.getElementById('banner-save-btn');
  const bannerOptionsBtn = document.getElementById('banner-options-btn');
  const bannerConnectedText = document.getElementById('banner-connected-text');
  const bannerChangeBtn = document.getElementById('banner-change-btn');
  const bannerDisconnectBtn = document.getElementById('banner-disconnect-btn');

  // Metadata & Palette Elements
  const metaDimensions = document.getElementById('meta-dimensions');
  const metaAspect = document.getElementById('meta-aspect');
  const metaLighting = document.getElementById('meta-lighting');
  const paletteSection = document.getElementById('palette-section');
  const paletteSwatches = document.getElementById('palette-swatches');

  // Prompts & Breakdown Elements
  const masterPromptText = document.getElementById('master-prompt-text');
  const copyMasterBtn = document.getElementById('copy-master-btn');
  const breakdownSubject = document.getElementById('breakdown-subject');
  const breakdownStyle = document.getElementById('breakdown-style');
  const breakdownCamera = document.getElementById('breakdown-camera');
  const breakdownLighting = document.getElementById('breakdown-lighting');
  const breakdownEnvironment = document.getElementById('breakdown-environment');
  const breakdownColor = document.getElementById('breakdown-color');
  const breakdownNegative = document.getElementById('breakdown-negative');

  // Platform Formats
  const mjCode = document.getElementById('mj-code');
  const fluxCode = document.getElementById('flux-code');
  const sdxlCode = document.getElementById('sdxl-code');
  const dalleCode = document.getElementById('dalle-code');
  const jsonCode = document.getElementById('json-code');

  // Modal & Settings Elements
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const geminiKeyInput = document.getElementById('gemini-key-input');
  const groqKeyInput = document.getElementById('groq-key-input');
  const ollamaUrlInput = document.getElementById('ollama-url-input');
  const modalClearKeysBtn = document.getElementById('modal-clear-keys-btn');
  const modalStatusMsg = document.getElementById('modal-status-msg');
  const geminiActiveBadge = document.getElementById('gemini-active-badge');
  const groqActiveBadge = document.getElementById('groq-active-badge');

  // Application State
  let currentImageData = null;
  let currentMimeType = null;
  let currentLocalMetrics = null;
  let currentTranscription = null;

  // Initialize Key Display
  updateBannerStatus();

  function updateBannerStatus() {
    if (window.visionEngine.hasActiveKey()) {
      const provider = window.visionEngine.getActiveProviderName();

      if (aiStatusIcon) {
        aiStatusIcon.className = 'ai-status-icon';
        aiStatusIcon.innerHTML = '<i class="fa-solid fa-check"></i>';
      }
      if (aiStatusTitle) {
        aiStatusTitle.innerHTML = `🟢 ${provider}`;
      }
      if (aiStatusDesc) {
        aiStatusDesc.innerHTML = 'AI Vision Active. Ready to recognize exact people, clothes, faces, and backgrounds.';
      }

      if (bannerInputGroup) bannerInputGroup.style.display = 'none';
      if (bannerConnectedGroup) bannerConnectedGroup.style.display = 'flex';
      if (bannerConnectedText) bannerConnectedText.innerText = provider;
    } else {
      if (aiStatusIcon) {
        aiStatusIcon.className = 'ai-status-icon inactive';
        aiStatusIcon.innerHTML = '<i class="fa-solid fa-bolt"></i>';
      }
      if (aiStatusTitle) {
        aiStatusTitle.innerHTML = '⚡ Connect Free AI Vision';
      }
      if (aiStatusDesc) {
        aiStatusDesc.innerHTML = 'Paste your free Google Gemini (AIza...) or Groq (gsk_...) key to recognize exact clothing, people, faces, and scenes.';
      }

      if (bannerInputGroup) bannerInputGroup.style.display = 'flex';
      if (bannerConnectedGroup) bannerConnectedGroup.style.display = 'none';
    }
  }

  // Handle Banner Quick Connect
  async function handleQuickConnect() {
    if (!bannerKeyInput || !bannerSaveBtn) return;
    const rawKey = bannerKeyInput.value.trim();

    if (!rawKey) {
      bannerKeyInput.classList.remove('input-shake');
      void bannerKeyInput.offsetWidth; // trigger CSS reflow
      bannerKeyInput.classList.add('input-shake');
      bannerKeyInput.focus();
      showToast('Please paste your Gemini (AIza...) or Groq (gsk_...) key', 'warning');
      return;
    }

    bannerSaveBtn.disabled = true;
    const originalHtml = bannerSaveBtn.innerHTML;
    bannerSaveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';
    bannerSaveBtn.style.opacity = '0.85';

    try {
      const res = await window.visionEngine.saveKey(rawKey);

      if (res.status) {
        bannerSaveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Connected!';
        bannerSaveBtn.style.background = '#10b981';
        bannerKeyInput.value = '';
        apiErrorCard.style.display = 'none';
        showToast(`✅ Connected to ${res.provider}!`);

        setTimeout(() => {
          updateBannerStatus();
          bannerSaveBtn.disabled = false;
          bannerSaveBtn.innerHTML = originalHtml;
          bannerSaveBtn.style.background = '';
          bannerSaveBtn.style.opacity = '1';

          // If an image is already loaded, automatically re-run analysis
          if (currentImageData && previewImg.src && !analyzeBtn.disabled) {
            showToast('⚡ Re-analyzing image with connected AI...', 'info');
            analyzeBtn.click();
          }
        }, 500);
      } else {
        bannerSaveBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error';
        bannerSaveBtn.style.background = '#ef4444';
        showToast(`Connection failed: ${res.error || 'Invalid API key'}`, 'warning');

        setTimeout(() => {
          bannerSaveBtn.disabled = false;
          bannerSaveBtn.innerHTML = originalHtml;
          bannerSaveBtn.style.background = '';
          bannerSaveBtn.style.opacity = '1';
        }, 2500);
      }
    } catch (err) {
      bannerSaveBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error';
      bannerSaveBtn.style.background = '#ef4444';
      showToast(err.message || 'Connection error', 'warning');

      setTimeout(() => {
        bannerSaveBtn.disabled = false;
        bannerSaveBtn.innerHTML = originalHtml;
        bannerSaveBtn.style.background = '';
        bannerSaveBtn.style.opacity = '1';
      }, 2500);
    }
  }

  if (bannerSaveBtn) {
    bannerSaveBtn.addEventListener('click', handleQuickConnect);
  }

  if (bannerKeyInput) {
    bannerKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleQuickConnect();
      }
    });
  }

  if (bannerChangeBtn) {
    bannerChangeBtn.addEventListener('click', () => {
      if (bannerConnectedGroup) bannerConnectedGroup.style.display = 'none';
      if (bannerInputGroup) bannerInputGroup.style.display = 'flex';
      if (bannerKeyInput) bannerKeyInput.focus();
    });
  }

  if (bannerDisconnectBtn) {
    bannerDisconnectBtn.addEventListener('click', () => {
      window.visionEngine.clearKeys();
      updateBannerStatus();
      showToast('API key disconnected. Ready for new key.', 'info');
    });
  }

  if (bannerOptionsBtn) {
    bannerOptionsBtn.addEventListener('click', openSettingsModal);
  }

  /* ===================================================================
     DRAG & DROP, FILE UPLOAD, & CLIPBOARD PASTE
     =================================================================== */
  dropzone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Global Clipboard Paste (Ctrl + V)
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        handleFile(blob);
        showToast('Screenshot pasted from clipboard!');
        break;
      }
    }
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG, WEBP)', 'warning');
      return;
    }

    currentMimeType = file.type;
    const reader = new FileReader();

    reader.onload = (e) => {
      currentImageData = e.target.result;
      displayImagePreview(currentImageData);
    };

    reader.readAsDataURL(file);
  }

  function displayImagePreview(dataUrl) {
    previewImg.src = dataUrl;
    previewImg.onload = async () => {
      dropzone.style.display = 'none';
      previewContainer.style.display = 'flex';
      analyzeBtn.disabled = false;

      // Extract canvas metrics
      currentLocalMetrics = await window.visionEngine.analyzeLocalImageFeatures(previewImg);
      
      // Update UI with image metrics
      metaDimensions.innerHTML = `<i class="fa-solid fa-expand"></i> ${currentLocalMetrics.width} × ${currentLocalMetrics.height}px`;
      metaAspect.innerHTML = `<i class="fa-solid fa-crop-simple"></i> ${currentLocalMetrics.aspectRatio}`;
      metaLighting.innerHTML = `<i class="fa-solid fa-sun"></i> ${currentLocalMetrics.lightingMood.split(' ')[0]} Mood`;

      // Render extracted color palette swatches
      renderPaletteSwatches(currentLocalMetrics.dominantColors);
    };
  }

  function renderPaletteSwatches(colors) {
    paletteSwatches.innerHTML = '';
    colors.forEach(hex => {
      const swatch = document.createElement('div');
      swatch.className = 'swatch-item';
      swatch.style.backgroundColor = hex;
      swatch.title = `Click to copy ${hex}`;

      const hexLabel = document.createElement('span');
      hexLabel.className = 'swatch-hex';
      hexLabel.innerText = hex;
      swatch.appendChild(hexLabel);

      swatch.addEventListener('click', () => {
        copyToClipboard(hex, `Copied hex color: ${hex}`);
      });

      paletteSwatches.appendChild(swatch);
    });
    paletteSection.style.display = 'block';
  }

  // Remove uploaded image
  removeImgBtn.addEventListener('click', () => {
    resetImageState();
  });

  function resetImageState() {
    previewImg.src = '';
    currentImageData = null;
    currentLocalMetrics = null;
    currentTranscription = null;
    fileInput.value = '';
    previewContainer.style.display = 'none';
    paletteSection.style.display = 'none';
    dropzone.style.display = 'block';
    analyzeBtn.disabled = true;
    resultsContainer.style.display = 'none';
    apiErrorCard.style.display = 'none';
    emptyState.style.display = 'flex';
  }

  /* ===================================================================
     SAMPLE IMAGES (One-Click Testing)
     =================================================================== */
  const sampleThumbnails = document.querySelectorAll('.sample-thumbnail');
  sampleThumbnails.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const src = thumb.dataset.src;
      loadSampleImage(src);
    });
  });

  function loadSampleImage(url) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      currentMimeType = 'image/jpeg';
      currentImageData = dataUrl;
      displayImagePreview(dataUrl);
      showToast('Loaded sample image!');
    };
    img.onerror = () => {
      showToast('Could not load sample image', 'warning');
    };
  }

  /* ===================================================================
     VISION REVERSE-ENGINEERING EXECUTION
     =================================================================== */
  analyzeBtn.addEventListener('click', async () => {
    if (!currentImageData || !currentLocalMetrics) return;

    // Show loading state
    emptyState.style.display = 'none';
    apiErrorCard.style.display = 'none';
    resultsContainer.style.display = 'none';
    loadingOverlay.style.display = 'flex';
    analyzeBtn.disabled = true;

    const userHint = userHintInput ? userHintInput.value.trim() : '';

    try {
      if (!window.visionEngine.hasActiveKey()) {
        throw new Error('NO_API_KEY');
      }

      currentTranscription = await window.visionEngine.transcribeImage(
        previewImg,
        currentLocalMetrics,
        userHint
      );

      apiErrorCard.style.display = 'none';
      renderTranscriptionResults(currentTranscription);
      showToast('Deep AI Prompt & Breakdown Generated!');
    } catch (err) {
      console.warn('Vision processing warning/error:', err);

      // ALWAYS generate a complete, high-quality prompt so the right panel NEVER stays empty!
      currentTranscription = window.visionEngine.synthesizeAssistedPrompt(userHint, currentLocalMetrics);
      renderTranscriptionResults(currentTranscription);

      // Show informative error notice
      if (err.message === 'NO_API_KEY') {
        apiErrorTitle.innerText = '🔑 AI Vision Key Needed for Full Facial/Wardrobe Recognition';
        apiErrorMsg.innerText = 'A prompt was synthesized using your photo\'s framing, camera angle, and color harmony. To recognize exact faces, clothes, and graphics, connect your free Gemini API key.';
      } else {
        apiErrorTitle.innerText = '⚠️ Cloud Vision API Notice';
        if (err.message && err.message.includes('not found for API version')) {
          apiErrorMsg.innerHTML = `<strong>Google Project API Notice:</strong> The Generative Language API is not enabled on this Google Cloud Project.<br>
          👉 <strong>To Fix in 10 seconds:</strong> In Google AI Studio, click <strong>"Create API key in new project"</strong>, OR use a 100% free <a href="https://console.groq.com/keys" target="_blank" style="color: var(--secondary); text-decoration: underline; font-weight: 700;">Groq Vision Key (console.groq.com)</a> which works instantly with zero project configuration!`;
        } else {
          apiErrorMsg.innerText = `${err.message}. A high-resolution photographic prompt was synthesized below. You can copy it directly or update your API key.`;
        }
      }
      apiErrorCard.style.display = 'block';
      showToast('Prompt generated!', 'info');
    } finally {
      loadingOverlay.style.display = 'none';
      resultsContainer.style.display = 'flex';
      analyzeBtn.disabled = false;
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  if (errorFixKeyBtn) {
    errorFixKeyBtn.addEventListener('click', openSettingsModal);
  }

  function renderTranscriptionResults(data) {
    // 1. Master Prompt
    masterPromptText.innerText = data.masterPrompt;

    // 2. Deep Breakdown
    breakdownSubject.innerText = data.subjectDetails || '--';
    breakdownStyle.innerText = data.artStyleMedium || '--';
    breakdownCamera.innerText = data.cameraComposition || '--';
    breakdownLighting.innerText = data.lightingAtmosphere || '--';
    breakdownEnvironment.innerText = data.environmentBackground || '--';
    breakdownColor.innerText = data.colorPalette || '--';
    breakdownNegative.innerText = data.negativePrompt || '--';

    // 3. Platform Ready Formats
    mjCode.innerText = data.midjourneyPrompt || `${data.masterPrompt} --ar ${currentLocalMetrics.midjourneyAr} --v 6.1 --style raw`;
    fluxCode.innerText = data.fluxPrompt || data.masterPrompt;
    sdxlCode.innerText = `Positive:\n${data.sdxlPrompt || data.masterPrompt}\n\nNegative:\n${data.negativePrompt || 'blurry, distorted'}`;
    dalleCode.innerText = data.dallePrompt || data.masterPrompt;
    jsonCode.innerText = JSON.stringify(data, null, 2);

    // Display Results Container
    resultsContainer.style.display = 'flex';
  }

  /* ===================================================================
     RESULTS TABS NAVIGATION
     =================================================================== */
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;

      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(targetId).classList.add('active');
    });
  });

  /* ===================================================================
     COPY ACTIONS & DIRECT AI LAUNCHERS
     =================================================================== */
  copyMasterBtn.addEventListener('click', () => {
    copyToClipboard(masterPromptText.innerText, 'Master AI Prompt copied to clipboard! Paste it into any AI generator.');
  });

  document.querySelectorAll('.copy-platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const textToCopy = document.getElementById(targetId).innerText;
      const platform = btn.dataset.platform || 'Prompt';
      copyToClipboard(textToCopy, `${platform} prompt copied!`);
    });
  });

  // Direct paste in links auto-copy master prompt before opening
  document.querySelectorAll('.direct-ai-launch-row a').forEach(link => {
    link.addEventListener('click', () => {
      if (masterPromptText.innerText && masterPromptText.innerText !== 'Prompt will be synthesized here...') {
        copyToClipboard(masterPromptText.innerText, 'Copied prompt to clipboard! Ready to paste into AI.');
      }
    });
  });

  function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(successMsg);
    });
  }

  /* ===================================================================
     THEME & CUSTOM COLOR SYSTEM
     =================================================================== */
  const themePresets = {
    cyber: { primary: '#8b5cf6', secondary: '#06b6d4', accent: '#f43f5e' },
    emerald: { primary: '#10b981', secondary: '#06b6d4', accent: '#fbbf24' },
    sunset: { primary: '#f97316', secondary: '#ec4899', accent: '#8b5cf6' },
    violet: { primary: '#a855f7', secondary: '#6366f1', accent: '#06b6d4' },
    arctic: { primary: '#0ea5e9', secondary: '#14b8a6', accent: '#6366f1' }
  };

  const swatchBtns = document.querySelectorAll('.color-swatch-btn');
  const customColorPicker = document.getElementById('custom-color-picker');

  swatchBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      swatchBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const themeName = btn.dataset.theme;
      if (themePresets[themeName]) {
        applyTheme(themePresets[themeName]);
        showToast(`Theme changed: ${themeName.toUpperCase()}`);
      }
    });
  });

  customColorPicker.addEventListener('input', (e) => {
    swatchBtns.forEach(b => b.classList.remove('active'));
    const hex = e.target.value;
    applyTheme({
      primary: hex,
      secondary: adjustBrightness(hex, 30),
      accent: adjustHue(hex)
    });
  });

  function applyTheme(theme) {
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--primary-hover', adjustBrightness(theme.primary, -15));
    document.documentElement.style.setProperty('--primary-glow', hexToRgba(theme.primary, 0.45));
    document.documentElement.style.setProperty('--secondary', theme.secondary);
    document.documentElement.style.setProperty('--secondary-glow', hexToRgba(theme.secondary, 0.35));
    if (theme.accent) {
      document.documentElement.style.setProperty('--accent', theme.accent);
    }
  }

  function hexToRgba(hex, alpha) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function adjustBrightness(hex, percent) {
    let num = parseInt(hex.replace('#', ''), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      G = (num >> 8 & 0x00FF) + amt,
      B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  function adjustHue(hex) {
    let num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16);
    let g = (num >> 8 & 0x00FF);
    let b = (num & 0x0000FF);
    return `#${(255 - r).toString(16).padStart(2,'0')}${(255 - g).toString(16).padStart(2,'0')}${(255 - b).toString(16).padStart(2,'0')}`;
  }

  /* ===================================================================
     SETTINGS MODAL
     =================================================================== */
  if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeSettingsModal);
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });
  }

  function showModalStatus(msg, type = 'info') {
    if (!modalStatusMsg) return;
    modalStatusMsg.style.display = 'block';
    modalStatusMsg.innerText = msg;
    if (type === 'error' || type === 'warning') {
      modalStatusMsg.style.background = 'rgba(239, 68, 68, 0.15)';
      modalStatusMsg.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      modalStatusMsg.style.color = '#fca5a5';
    } else if (type === 'success') {
      modalStatusMsg.style.background = 'rgba(16, 185, 129, 0.15)';
      modalStatusMsg.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      modalStatusMsg.style.color = '#6ee7b7';
    } else {
      modalStatusMsg.style.background = 'rgba(139, 92, 246, 0.15)';
      modalStatusMsg.style.border = '1px solid rgba(139, 92, 246, 0.4)';
      modalStatusMsg.style.color = 'var(--text-main)';
    }
  }

  function openSettingsModal() {
    if (geminiKeyInput) geminiKeyInput.value = window.visionEngine.geminiApiKey || '';
    if (groqKeyInput) groqKeyInput.value = window.visionEngine.groqApiKey || '';
    if (ollamaUrlInput) ollamaUrlInput.value = window.visionEngine.ollamaUrl || 'http://localhost:11434';

    if (modalStatusMsg) modalStatusMsg.style.display = 'none';

    if (geminiActiveBadge) {
      geminiActiveBadge.style.display = (window.visionEngine.activeProvider === 'gemini' && window.visionEngine.geminiApiKey) ? 'inline' : 'none';
    }
    if (groqActiveBadge) {
      groqActiveBadge.style.display = (window.visionEngine.activeProvider === 'groq' && window.visionEngine.groqApiKey) ? 'inline' : 'none';
    }

    if (settingsModal) settingsModal.style.display = 'flex';
    setTimeout(() => {
      if (groqKeyInput && !groqKeyInput.value) groqKeyInput.focus();
      else if (geminiKeyInput && !geminiKeyInput.value) geminiKeyInput.focus();
    }, 150);
  }

  function closeSettingsModal() {
    if (settingsModal) settingsModal.style.display = 'none';
  }

  if (modalClearKeysBtn) {
    modalClearKeysBtn.addEventListener('click', () => {
      window.visionEngine.clearKeys();
      if (geminiKeyInput) geminiKeyInput.value = '';
      if (groqKeyInput) groqKeyInput.value = '';
      if (geminiActiveBadge) geminiActiveBadge.style.display = 'none';
      if (groqActiveBadge) groqActiveBadge.style.display = 'none';
      showModalStatus('All API keys have been removed.', 'info');
      updateBannerStatus();
      showToast('All API keys cleared.');
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      const geminiKey = geminiKeyInput ? geminiKeyInput.value.trim() : '';
      const groqKey = groqKeyInput ? groqKeyInput.value.trim() : '';

      if (!geminiKey && !groqKey) {
        showModalStatus('Please enter at least one API key (Gemini or Groq).', 'warning');
        return;
      }

      saveSettingsBtn.disabled = true;
      const originalHtml = saveSettingsBtn.innerHTML;
      saveSettingsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

      let successProvider = null;
      let errorMessages = [];

      // Prefer whichever key user modified or entered
      if (groqKey && (!window.visionEngine.groqApiKey || groqKey !== window.visionEngine.groqApiKey || window.visionEngine.activeProvider === 'groq')) {
        const resGroq = await window.visionEngine.saveKey(groqKey, 'groq');
        if (resGroq.status) successProvider = resGroq.provider;
        else errorMessages.push(`Groq: ${resGroq.error}`);
      }

      if (geminiKey && (!successProvider || geminiKey !== window.visionEngine.geminiApiKey)) {
        const resGemini = await window.visionEngine.saveKey(geminiKey, 'gemini');
        if (resGemini.status) successProvider = successProvider || resGemini.provider;
        else errorMessages.push(`Gemini: ${resGemini.error}`);
      }

      if (successProvider) {
        showModalStatus(`✅ Successfully connected to ${successProvider}!`, 'success');
        apiErrorCard.style.display = 'none';
        updateBannerStatus();
        showToast(`Connected to ${successProvider}!`);

        setTimeout(() => {
          closeSettingsModal();
          saveSettingsBtn.disabled = false;
          saveSettingsBtn.innerHTML = originalHtml;

          // Auto-reanalyze if image is ready
          if (currentImageData && previewImg.src && !analyzeBtn.disabled) {
            showToast('⚡ Re-analyzing image with connected AI...', 'info');
            analyzeBtn.click();
          }
        }, 600);
      } else {
        showModalStatus(`❌ ${errorMessages.join(' | ') || 'Key verification failed.'}`, 'error');
        saveSettingsBtn.disabled = false;
        saveSettingsBtn.innerHTML = originalHtml;
      }
    });
  }

  // Document-level delegation fallback for banner connect button
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#banner-save-btn');
    if (btn && !btn.disabled) {
      handleQuickConnect();
    }
  });

  /* ===================================================================
     TOAST NOTIFICATIONS
     =================================================================== */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'fa-circle-check';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    if (type === 'info') icon = 'fa-circle-info';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastSlideIn 0.3s ease reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
});
