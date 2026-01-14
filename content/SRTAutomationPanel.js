window.SRTAutomationPanel = class {
    constructor(onClose) {
        this.onClose = onClose;
        this.collectedSRTs = {}; // languageLabel -> srtContent
        this._render();
    }

    _render() {
        this.el = document.createElement("div");
        this.el.id = "srt-automation-panel";
        this.el.className = "panel-box ts-panel";
        this.el.style.width = "420px";
        this.el.style.padding = "20px";
        this.el.style.borderRadius = "16px";
        this.el.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
        this.el.style.background = "#fff";

        const html = `
      <div class="ts-title" style="display: flex; align-items: center; margin-bottom: 20px; cursor: move; user-select: none;">
        <span style="font-size: 24px; margin-right: 12px;">🤖</span>
        <div>
          <h3 style="margin: 0; font-size: 18px; color: #1a1a1a; font-weight: 700;">SRT Automation</h3>
          <div id="srt-status-text" style="font-size: 12px; color: #666; margin-top: 2px;">Status: Standby (Scan ready)</div>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label for="srt-labels-input" style="font-size: 13px; font-weight: 600; color: #444; display: block; margin-bottom: 8px;">Manual Labels (comma separated):</label>
        <div style="position: relative;">
          <textarea id="srt-labels-input" 
            style="width: 100%; height: 80px; font-size: 13px; padding: 12px; border: 1.5px solid #e0e0e0; border-radius: 12px; resize: vertical; outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit; line-height: 1.5;" 
            placeholder="e.g. Arabic, Chinese, English, French"
            onfocus="this.style.borderColor='#4f46e5'; this.style.boxShadow='0 0 0 3px rgba(79, 70, 229, 0.1)'"
            onblur="this.style.borderColor='#e0e0e0'; this.style.boxShadow='none'"></textarea>
        </div>
      </div>

      <div class="sr-controls" style="margin-bottom: 24px;">
        <button id="srt-scan-existing" class="ts-btn ts-btn-accent" 
          style="width: 100%; height: 44px; font-weight: 600; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; cursor: pointer; transition: transform 0.1s; background: #4f46e5; border: none; color: white;"
          onmousedown="this.style.transform='scale(0.98)'"
          onmouseup="this.style.transform='scale(1)'">
          <span style="font-size: 16px;">🔍</span> Scan Chat Content
        </button>
      </div>

      <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; border: 1px solid #f0f0f0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
           <strong style="font-size: 14px; color: #333;">Collected SRTs</strong>
           <span id="srt-count-badge" style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 700;">0 files</span>
        </div>
        <div class="sr-queue-box" style="max-height: 180px; overflow-y: auto; padding-right: 5px;">
          <ul id="srt-list" class="sr-queue-list" style="margin: 0; padding: 0; list-style: none;"></ul>
        </div>
      </div>

      <div class="sr-controls" style="margin-top: 20px; display: flex; gap: 10px;">
        <button id="srt-download-zip" class="ts-btn ts-btn-accent" 
          style="flex: 2; height: 44px; font-weight: 600; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #10b981; border: none; color: white;">
          📥 Download ZIP
        </button>
        <button id="srt-clear" class="ts-btn" 
          style="flex: 1; height: 44px; font-weight: 600; border-radius: 12px; background: #fff; border: 1.5px solid #ef4444; color: #ef4444; font-size: 13px;">
          Clear
        </button>
      </div>
    `;

        this.el.innerHTML = html;

        ChatGPTHelper.mountPanel(this.el);
        ChatGPTHelper.makeDraggable(this.el, ".ts-title");
        ChatGPTHelper.addCloseButton(this.el, () => this.destroy());

        this._bindEvents();
        this._updateList();
    }

    _bindEvents() {
        const btnScan = this.el.querySelector('#srt-scan-existing');
        const btnDownload = this.el.querySelector('#srt-download-zip');
        const btnClear = this.el.querySelector('#srt-clear');
        const statusText = this.el.querySelector('#srt-status-text');

        btnScan.onclick = () => {
            const originalText = btnScan.textContent;
            btnScan.disabled = true;
            btnScan.textContent = 'Scanning...';
            statusText.textContent = 'Status: Scanning chat...';

            this._scanExisting();

            setTimeout(() => {
                btnScan.disabled = false;
                btnScan.textContent = originalText;
                statusText.textContent = 'Status: Standby (Scan ready)';
            }, 1000);
        };

        btnDownload.onclick = () => this._downloadZip();

        btnClear.onclick = () => {
            if (confirm('Clear all collected SRTs?')) {
                this.collectedSRTs = {};
                this._updateList();
            }
        };
    }

    _scanExisting() {
        console.log("� [SRTAutomation] Scanning existing content with manual labels...");

        // Parse labels
        const labelInput = this.el.querySelector('#srt-labels-input').value;
        if (!labelInput.trim()) {
            alert('Please enter at least one label in the "Manual Labels" field.');
            return;
        }

        const manualLabels = labelInput.split(/[,;\n]/).map(l => l.trim()).filter(l => l);

        if (manualLabels.length === 0) {
            alert('Please enter valid labels (e.g. Arabic, Chinese).');
            return;
        }

        // Find all SRT candidates
        const foundSRTs = [];
        const allPanels = document.querySelectorAll('mat-expansion-panel');

        allPanels.forEach(panel => {
            const body = panel.querySelector('.mat-expansion-panel-content') || panel.querySelector('.mat-expansion-panel-body');
            if (!body) return;
            const text = body.innerText.trim();
            if (text.length > 20 && (text.includes('-->') || text.includes('00:00'))) {
                foundSRTs.push({ panel, text });
            }
        });

        console.log(`📊 [SRTAutomation] Found ${foundSRTs.length} SRT blocks. manualLabels count: ${manualLabels.length}`);

        // Count validation
        if (foundSRTs.length !== manualLabels.length) {
            const msg = `Mismatch in count!\nDetected: ${foundSRTs.length} SRT blocks\nLabels provided: ${manualLabels.length}\n\nDo you want to continue mapping them sequentially?`;
            if (!confirm(msg)) return;
        }

        // Map them
        let mappedCount = 0;
        this.collectedSRTs = {}; // Reset list for a fresh scan? Or append? 
        // User's request implies a fresh scan mapping names to results in order.

        foundSRTs.forEach((item, index) => {
            if (index < manualLabels.length) {
                const label = manualLabels[index];
                this.collectedSRTs[label] = item.text;
                mappedCount++;
            }
        });

        this._updateList();
        console.log(`✅ [SRTAutomation] Scan complete. Mapped ${mappedCount} SRTs.`);
        alert(`Successfully scanned and mapped ${mappedCount} files.`);
    }

    _updateList() {
        const listEl = this.el.querySelector('#srt-list');
        const countBadge = this.el.querySelector('#srt-count-badge');
        const keys = Object.keys(this.collectedSRTs);

        if (countBadge) countBadge.textContent = `${keys.length} files`;

        listEl.innerHTML = '';
        keys.forEach(label => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.padding = '8px 4px';
            li.style.borderBottom = '1px solid #eee';
            li.innerHTML = `
                <span style="font-size: 13px; color: #333; display: flex; align-items: center; gap: 8px;">
                    <span style="color: #10b981;">✅</span> ${label}.srt
                </span> 
                <span style="font-size: 11px; color: #999;">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            `;
            listEl.appendChild(li);
        });

        const box = listEl.parentElement;
        box.scrollTop = box.scrollHeight;
    }

    async _downloadZip() {
        const count = Object.keys(this.collectedSRTs).length;
        if (count === 0) {
            alert('No SRTs collected.');
            return;
        }

        const LibZip = window.JSZip || (typeof JSZip !== 'undefined' ? JSZip : null);
        if (!LibZip) {
            alert('JSZip not found.');
            return;
        }

        try {
            const zip = new LibZip();
            Object.entries(this.collectedSRTs).forEach(([label, content]) => {
                zip.file(`${label}.srt`, content);
            });

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `srts_${count}_files_${new Date().getTime()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert("ZIP error: " + err.message);
        }
    }

    destroy() {
        this.el?.remove();
        this.onClose?.();
    }
};
