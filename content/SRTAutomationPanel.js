window.SRTAutomationPanel = class {
    constructor(onClose) {
        this.onClose = onClose;
        this.collectedSRTs = {}; // languageLabel -> srtContent
        this._render();
    }

    _render() {
        this.el = document.createElement("div");
        this.el.id = "srt-automation-panel";
        // Tailwind classes for the main panel
        this.el.className = "panel-box ts-panel w-[420px] p-5 rounded-2xl shadow-2xl bg-white border border-gray-100";

        const html = `
      <!-- Header / Draggable Area -->
      <div class="ts-title flex items-center mb-5 cursor-move select-none">
        <span class="text-2xl mr-3">🤖</span>
        <div>
          <h3 class="m-0 text-lg font-bold text-gray-900 leading-tight">SRT Automation</h3>
          <div id="srt-status-text" class="text-xs text-gray-500 mt-0.5">Status: Standby (Scan ready)</div>
        </div>
      </div>
      
      <!-- Label Input Area -->
      <div class="mb-5">
        <label for="srt-labels-input" class="text-[13px] font-bold text-gray-700 block mb-2">Manual Labels (comma separated):</label>
        <div class="relative">
          <textarea id="srt-labels-input" 
            class="w-full h-20 text-sm p-3 border border-gray-200 rounded-xl resize-vertical outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-sans leading-relaxed" 
            placeholder="e.g. Arabic, Chinese, English, French"></textarea>
        </div>
      </div>

      <!-- Action Button -->
      <div class="sr-controls mb-6">
        <button id="srt-scan-existing" class="ts-btn ts-btn-accent w-full h-11 font-bold rounded-xl flex items-center justify-center gap-2 text-sm cursor-pointer transition-all active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-sm h-11">
          <span class="text-base">🔍</span> Scan Chat Content
        </button>
      </div>

      <!-- Result List Area -->
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div class="flex justify-between items-center mb-3">
           <strong class="text-sm text-gray-800">Collected SRTs</strong>
           <span id="srt-count-badge" class="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm">0 files</span>
        </div>
        <div class="sr-queue-box max-height-[180px] overflow-y-auto pr-1">
          <ul id="srt-list" class="sr-queue-list m-0 p-0 list-none"></ul>
        </div>
      </div>

      <!-- Bottom Controls -->
      <div class="sr-controls mt-5 flex gap-3">
        <button id="srt-download-zip" class="ts-btn ts-btn-accent flex-[2] h-11 font-bold rounded-xl flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm transition-all active:scale-95">
          📥 Download ZIP
        </button>
        <button id="srt-clear" class="ts-btn flex-1 h-11 font-bold rounded-xl bg-white border-[1.5px] border-rose-500 text-rose-500 text-[13px] hover:bg-rose-50 transition-all active:scale-95">
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
        console.log("🔍 [SRTAutomation] Scanning existing content with manual labels...");

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
        this.collectedSRTs = {};

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
            li.className = "flex justify-between items-center py-2 border-b border-gray-100 last:border-0";
            li.innerHTML = `
                <span class="text-[13px] text-gray-700 flex items-center gap-2">
                    <span class="text-emerald-500">✅</span> ${label}.srt
                </span> 
                <span class="text-[11px] text-gray-400">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
