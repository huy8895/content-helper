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
        this.el.className = "panel-box ts-panel w-[380px] p-4 rounded-xl shadow-2xl bg-white border border-gray-100 flex flex-col relative animate-in";

        const html = `
      <!-- Header / Draggable Area -->
      <div class="ts-title flex items-center mb-4 cursor-move select-none">
        <span class="text-xl mr-2">🤖</span>
        <div>
          <h3 class="m-0 text-base font-bold text-gray-900 leading-tight">SRT Automation</h3>
          <div id="srt-status-text" class="text-[10px] text-gray-500 font-medium tracking-tight">Status: Standby (Scan ready)</div>
        </div>
      </div>
      
      <!-- Label Input Area -->
      <div class="mb-3">
        <label for="srt-labels-input" class="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest pl-1">Manual Labels (comma separated):</label>
        <div class="relative">
          <textarea id="srt-labels-input" 
            class="w-full h-16 text-xs p-2.5 border border-gray-300 rounded-lg resize-y outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-sans leading-snug" 
            placeholder="e.g. Arabic, Chinese, English, French"></textarea>
        </div>
      </div>

      <!-- Action Button -->
      <div class="sr-controls mb-4">
        <button id="srt-scan-existing" class="w-full h-9 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg flex items-center justify-center gap-2 text-[11px] cursor-pointer transition-all active:scale-95 hover:bg-indigo-100 shadow-sm">
          <span class="text-sm">🔍</span> Scan Chat Content
        </button>
      </div>

      <!-- Result List Area -->
      <div class="bg-gray-50 rounded-xl p-3 border border-gray-100">
        <div class="flex justify-between items-center mb-2 px-1">
           <strong class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Collected SRTs</strong>
           <span id="srt-count-badge" class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm">0 files</span>
        </div>
        <div class="sr-queue-box max-h-32 overflow-y-auto pr-1 custom-scrollbar">
          <ul id="srt-list" class="sr-queue-list m-0 p-0 list-none space-y-0.5"></ul>
        </div>
      </div>

      <!-- Bottom Controls -->
      <div class="sr-controls mt-4 flex gap-2.5">
        <button id="srt-download-zip" class="flex-[2] h-9 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-100 shadow-sm transition-all active:scale-95 text-[11px]">
          📥 Download ZIP
        </button>
        <button id="srt-clear" class="flex-1 h-9 font-bold rounded-lg bg-white border border-rose-100 text-rose-400 text-[10px] hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-95">
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
            ChatGPTHelper.showToast('Please enter at least one label in the "Manual Labels" field.', "warning");
            return;
        }

        const manualLabels = labelInput.split(/[,;\n]/).map(l => l.trim()).filter(l => l);

        if (manualLabels.length === 0) {
            ChatGPTHelper.showToast('Please enter valid labels (e.g. Arabic, Chinese).', "warning");
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
        ChatGPTHelper.showToast(`Successfully scanned and mapped ${mappedCount} files.`, "success");
    }

    _updateList() {
        const listEl = this.el.querySelector('#srt-list');
        const countBadge = this.el.querySelector('#srt-count-badge');
        const keys = Object.keys(this.collectedSRTs);

        if (countBadge) countBadge.textContent = `${keys.length} files`;

        listEl.innerHTML = '';
        keys.forEach(label => {
            const li = document.createElement('li');
            li.className = "flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0 hover:bg-white px-1 rounded transition-all";
            li.innerHTML = `
                <span class="text-[11px] text-gray-700 flex items-center gap-1.5 font-medium">
                    <span class="text-emerald-500 text-[10px]">✅</span> ${label}.srt
                </span> 
                <span class="text-[9px] text-gray-400 font-bold">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            `;
            listEl.appendChild(li);
        });

        const box = listEl.parentElement;
        box.scrollTop = box.scrollHeight;
    }

    async _downloadZip() {
        const count = Object.keys(this.collectedSRTs).length;
        if (count === 0) {
            ChatGPTHelper.showToast('No SRTs collected.', "warning");
            return;
        }

        const LibZip = window.JSZip || (typeof JSZip !== 'undefined' ? JSZip : null);
        if (!LibZip) {
            ChatGPTHelper.showToast('JSZip not found.', "error");
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
            ChatGPTHelper.showToast("ZIP error: " + err.message, "error");
        }
    }

    _isBusy() {
        // Kiểm tra xem nút scan có đang disabled không (trạng thái đang quét)
        const btnScan = this.el?.querySelector('#srt-scan-existing');
        return btnScan ? btnScan.disabled : false;
    }

    destroy() {
        this.el?.remove();
        this.onClose?.();
    }
};
