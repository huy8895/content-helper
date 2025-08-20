// content/YoutubeStudioPanel.js (Debug Version)

// =================================================================
// CONSTANTS FOR PANEL
// =================================================================

const AVAILABLE_LANGUAGES = [
  'Arabic', 'Chinese (Simplified)', 'Chinese (Traditional)', 'English', 'French',
  'German', 'Hindi', 'Indonesian', 'Italian', 'Japanese', 'Korean', 'Malay',
  'Polish', 'Portuguese (Brazil)', 'Russian', 'Spanish', 'Thai', 'Turkish', 'Vietnamese'
];

const YTB_PANEL_HTML = `
  <div class="panel-header">
    <h4>⚙️ Configure Languages</h4>
    <button id="yt-close-panel-btn" class="btn-close" title="Close">×</button>
  </div>
  <p>Select the languages you want to add automatically.</p>
  <div id="yt-language-checkbox-container"></div>
  <button id="yt-save-languages-btn" class="btn-save">Save Settings</button>
`;

const YTB_PANEL_CSS = `
  #youtube-studio-helper-panel {
    position: fixed;
    top: 70px;
    right: 20px;
    width: 320px;
    max-height: calc(100vh - 90px);
    overflow-y: auto;
    background: #282828;
    border: 1px solid #3f3f3f;
    border-radius: 12px;
    padding: 20px;
    z-index: 10001;
    box-shadow: 0 8px 16px rgba(0,0,0,0.3);
    font-family: 'Roboto', Arial, sans-serif;
    color: #fff;
    font-size: 14px;
    display: flex;
    flex-direction: column;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  #youtube-studio-helper-panel h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: #f1f1f1;
  }
  
  .btn-close {
    background: none;
    border: none;
    color: #aaa;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    padding: 0 5px;
  }
  .btn-close:hover {
    color: #fff;
  }

  #youtube-studio-helper-panel p {
    font-size: 13px;
    color: #aaa;
    margin: 0 0 15px;
  }

  #yt-language-checkbox-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
    overflow-y: auto;
  }

  .yt-language-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 5px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .yt-language-label:hover {
    background-color: #3f3f3f;
  }

  .yt-language-label input[type="checkbox"] {
    margin-right: 12px;
    width: 16px;
    height: 16px;
  }

  #youtube-studio-helper-panel .btn-save {
    width: 100%;
    padding: 10px;
    background: #3ea6ff;
    color: #0d0d0d;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    transition: background-color 0.2s;
    margin-top: auto;
  }

  #youtube-studio-helper-panel .btn-save:hover {
    background: #65baff;
  }
`;

// =================================================================
// PANEL CLASS
// =================================================================

window.YoutubeStudioPanel = class {
  constructor() {
    console.log("create YoutubeStudioPanel")
    this.panelId = 'youtube-studio-helper-panel';
    this.styleId = `${this.panelId}-styles`;
    this.storageKey = 'youtube_subtitle_languages';
    console.log("[YT Panel LOG] 🚀 Panel constructor called.");
  }

  init() {
    console.log("[YT Panel LOG] ✨ Initializing panel...");
    if (document.getElementById(this.panelId)) {
        console.log("[YT Panel LOG] 💡 Panel already exists. Skipping init.");
        return;
    }
    this.injectStyles();
    this.createPanel();
    this.loadSettings();
    this.attachEvents();
    console.log("[YT Panel LOG] 🎉 Panel initialized successfully.");
  }

  togglePanel() {
    const panel = document.getElementById(this.panelId);
    if (panel) {
      console.log("[YT Panel LOG] 🔽 Closing panel.");
      panel.remove();
    } else {
      console.log("[YT Panel LOG]🔼 Opening panel.");
      this.init();
    }
  }

  injectStyles() {
    if (document.getElementById(this.styleId)) return;
    const styleElement = document.createElement('style');
    styleElement.id = this.styleId;
    styleElement.textContent = YTB_PANEL_CSS;
    document.head.appendChild(styleElement);
    console.log("[YT Panel LOG] 🎨 Styles injected.");
  }

  createPanel() {
    const panel = document.createElement('div');
    panel.id = this.panelId;
    panel.innerHTML = YTB_PANEL_HTML;
    document.body.appendChild(panel);
    console.log("[YT Panel LOG] 🏗️ Panel element created and appended to body.");

    const container = panel.querySelector('#yt-language-checkbox-container');
    AVAILABLE_LANGUAGES.forEach(lang => {
      const label = document.createElement('label');
      label.className = 'yt-language-label';
      label.innerHTML = `<input type="checkbox" value="${lang}"> ${lang}`;
      container.appendChild(label);
    });
    console.log(`[YT Panel LOG] ✅ ${AVAILABLE_LANGUAGES.length} language checkboxes created.`);
  }

  attachEvents() {
    document.getElementById('yt-close-panel-btn').addEventListener('click', () => {
        this.togglePanel();
    });
    document.getElementById('yt-save-languages-btn').addEventListener('click', () => {
      this.saveSettings();
    });
    console.log("[YT Panel LOG] 🔗 Event listeners attached.");
  }

  saveSettings() {
    console.log("[YT Panel LOG] 💾 Saving settings...");
    const checkboxes = document.querySelectorAll(`#${this.panelId} input[type="checkbox"]`);
    const selectedLanguages = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    chrome.storage.local.set({ [this.storageKey]: selectedLanguages }, () => {
      if (chrome.runtime.lastError) {
        console.error("[YT Panel LOG] ❌ Error saving to chrome.storage:", chrome.runtime.lastError);
        alert('Error saving settings!');
      } else {
        console.log('[YT Panel LOG] ✅ Languages saved successfully:', selectedLanguages);
        alert('Settings saved!');
        this.togglePanel();
      }
    });
  }

  loadSettings() {
    console.log("[YT Panel LOG] 📥 Loading settings from storage...");
    chrome.storage.local.get([this.storageKey], (result) => {
      if (chrome.runtime.lastError) {
          console.error("[YT Panel LOG] ❌ Error reading from chrome.storage:", chrome.runtime.lastError);
          return;
      }
      const savedLangs = result[this.storageKey] || [];
      console.log('[YT Panel LOG] ✅ Found languages in storage:', savedLangs);

      const checkboxes = document.querySelectorAll(`#${this.panelId} input[type="checkbox"]`);
      checkboxes.forEach(cb => {
        cb.checked = savedLangs.includes(cb.value);
      });
      console.log(`[YT Panel LOG] ✨ Updated ${savedLangs.length} checkboxes based on saved settings.`);
    });
  }
}