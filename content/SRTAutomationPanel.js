window.SRTAutomationPanel = class {
    constructor(onClose) {
        this.onClose = onClose;
        this.isMonitoring = false;
        this.collectedSRTs = {}; // languageLabel -> srtContent
        this._observer = null;
        this._render();
    }

    _render() {
        this.el = document.createElement("div");
        this.el.id = "srt-automation-panel";
        this.el.className = "panel-box ts-panel";
        this.el.style.width = "400px";

        const html = `
      <h3 class="ts-title">🤖 SRT Automation <span id="srt-status-dot" style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#ccc; margin-left:10px;"></span></h3>
      <div id="srt-status-text" style="font-size: 11px; color: #888; margin-top: -10px; margin-bottom: 10px;">Status: Standby</div>
      
      <div style="margin-bottom: 10px;">
        <label style="font-size: 11px; color: #555; display: block; margin-bottom: 4px;">Manual Labels (comma separated) for Scan:</label>
        <textarea id="srt-labels-input" class="ts-input" style="width: 100%; height: 50px; font-size: 12px; resize: vertical;" 
          placeholder="e.g. Arabic, Chinese, English, French"></textarea>
      </div>

      <div class="sr-controls" style="margin-bottom: 10px; display: flex; gap: 5px;">
        <button id="srt-start-monitor" class="ts-btn ts-btn-accent" style="flex: 1;">START Listening</button>
        <button id="srt-stop-monitor" class="ts-btn" disabled>STOP</button>
        <button id="srt-scan-existing" class="ts-btn" title="Scan existing chat for SRTs">🔍 Scan Chat</button>
      </div>

      <div class="sr-queue-box" style="max-height: 200px; overflow-y: auto;">
        <strong>Collected SRTs:</strong>
        <ul id="srt-list" class="sr-queue-list"></ul>
      </div>

      <div class="sr-controls" style="margin-top: 10px; display: flex; gap: 5px;">
        <button id="srt-download-zip" class="ts-btn ts-btn-accent" style="flex: 1;">📥 Download ZIP</button>
        <button id="srt-clear" class="ts-btn" style="width: 80px;">Clear</button>
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
        const btnStart = this.el.querySelector('#srt-start-monitor');
        const btnStop = this.el.querySelector('#srt-stop-monitor');
        const btnScan = this.el.querySelector('#srt-scan-existing');
        const btnDownload = this.el.querySelector('#srt-download-zip');
        const btnClear = this.el.querySelector('#srt-clear');
        const statusText = this.el.querySelector('#srt-status-text');
        const statusDot = this.el.querySelector('#srt-status-dot');

        btnStart.onclick = () => {
            this.isMonitoring = true;
            btnStart.disabled = true;
            btnStop.disabled = false;
            btnStop.style.backgroundColor = '#ff4d4d';
            btnStop.style.color = 'white';

            statusText.textContent = 'Status: Listening...';
            statusText.style.color = '#4caf50';
            statusDot.style.background = '#4caf50';
            statusDot.classList.add('pulse');

            this._startObserving();
        };

        btnStop.onclick = () => {
            this.isMonitoring = false;
            btnStart.disabled = false;
            btnStop.disabled = true;
            btnStop.style.backgroundColor = '';
            btnStop.style.color = '';

            statusText.textContent = 'Status: Stopped';
            statusText.style.color = '#888';
            statusDot.style.background = '#ccc';
            statusDot.classList.remove('pulse');

            this._stopObserving();
        };

        btnScan.onclick = () => {
            const originalText = btnScan.textContent;
            btnScan.disabled = true;
            btnScan.textContent = 'Scanning...';
            this._scanExisting();
            setTimeout(() => {
                btnScan.disabled = false;
                btnScan.textContent = originalText;
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

    _startObserving() {
        console.log("👀 [SRTAutomation] Started observing...");
        if (this._observer) this._observer.disconnect();

        this._observer = new MutationObserver((mutations) => {
            if (!this.isMonitoring) return;

            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        const panels = node.tagName === 'MAT-EXPANSION-PANEL' ? [node] : node.querySelectorAll('mat-expansion-panel');
                        panels.forEach(panel => {
                            console.log("🧩 [SRTAutomation] Detected new expansion panel.");
                            this._processPanel(panel);
                        });
                    }
                }
            }
        });

        this._observer.observe(document.body, { childList: true, subtree: true });
    }

    _stopObserving() {
        console.log("🛑 [SRTAutomation] Stopped observing.");
        this._observer?.disconnect();
        this._observer = null;
    }

    _scanExisting() {
        console.log("🔍 [SRTAutomation] Scanning existing content with manual labels...");

        // Parse labels
        const labelInput = this.el.querySelector('#srt-labels-input').value;
        const manualLabels = labelInput.split(/[,;\n]/).map(l => l.trim()).filter(l => l);

        if (manualLabels.length === 0) {
            alert('Please enter at least one label in the "Manual Labels" field (e.g. Arabic, Chinese).');
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
        foundSRTs.forEach((item, index) => {
            const label = manualLabels[index] || `srt_extra_${index + 1}`;
            this._saveContent(item.text, label);
            item.panel.dataset.processed = "true";
            mappedCount++;
        });

        console.log(`✅ [SRTAutomation] Scan complete. Mapped ${mappedCount} SRTs.`);
        alert(`Successfully scanned and mapped ${mappedCount} files.`);
    }

    _processPanel(panel) {
        if (panel.dataset.processed || panel.dataset.waiting) return;
        panel.dataset.waiting = "true";

        let stableCount = 0;
        let lastContentLength = 0;

        const interval = setInterval(() => {
            if (!this.isMonitoring) {
                clearInterval(interval);
                return;
            }

            const adapterDone = window.ChatAdapter?.isDone();
            const body = panel.querySelector('.mat-expansion-panel-content') || panel.querySelector('.mat-expansion-panel-body');
            const currentContent = body ? body.innerText.trim() : '';

            if (adapterDone) {
                if (currentContent.length > 0 && currentContent.length === lastContentLength) {
                    stableCount++;
                } else {
                    stableCount = 0;
                    lastContentLength = currentContent.length;
                }

                if (stableCount >= 2) {
                    clearInterval(interval);
                    console.log("✅ [SRTAutomation] Stable and ready.");
                    this._extractContent(panel);
                }
            } else {
                stableCount = 0;
                lastContentLength = currentContent.length;
            }
        }, 1000);
    }

    _extractContent(panel) {
        if (panel.dataset.processed) return;

        const body = panel.querySelector('.mat-expansion-panel-content') || panel.querySelector('.mat-expansion-panel-body');
        if (body) {
            const srtText = body.innerText.trim();
            if (srtText.length > 20 && (srtText.includes('-->') || srtText.includes('00:00'))) {
                this._saveContent(srtText);
                panel.dataset.processed = "true";
            }
        }
    }

    _saveContent(content, suggestedLabel = null) {
        const runner = window.__helperInjected?.runner;
        const seq = runner?.sequencer;
        let label = suggestedLabel;

        // Normal monitoring uses ScenarioRunner labels
        if (!label && seq) {
            label = seq.currentLabel || seq.lastLabel;
        }

        if (!label) {
            label = `srt_${Object.keys(this.collectedSRTs).length + 1}`;
        }

        let entryLabel = label;
        let suffix = 1;
        while (this.collectedSRTs[entryLabel]) {
            entryLabel = `${label}_${suffix++}`;
        }

        console.log(`💾 [SRTAutomation] SAVING -> ${entryLabel}.srt`);
        this.collectedSRTs[entryLabel] = content;
        this._updateList();
    }

    _updateList() {
        const listEl = this.el.querySelector('#srt-list');
        listEl.innerHTML = '';
        Object.keys(this.collectedSRTs).forEach(label => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.padding = '4px 0';
            li.style.borderBottom = '1px solid #eee';
            li.innerHTML = `<span>✅ ${label}.srt</span> <span style="font-size: 10px; color: #999;">${new Date().toLocaleTimeString()}</span>`;
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
        this._stopObserving();
        this.el?.remove();
        this.onClose?.();
    }
};
