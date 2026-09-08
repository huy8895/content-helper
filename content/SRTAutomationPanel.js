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

        this.el.innerHTML = window.SRTAutomationView?.render?.() || "";

        ContentHelper.mountPanel(this.el);
        ContentHelper.makeDraggable(this.el, ".ts-title");
        ContentHelper.addCloseButton(this.el, () => this.destroy());

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
            ContentHelper.showToast('Please enter at least one label in the "Manual Labels" field.', "warning");
            return;
        }

        const manualLabels = labelInput.split(/[,;\n]/).map(l => l.trim()).filter(l => l);

        if (manualLabels.length === 0) {
            ContentHelper.showToast('Please enter valid labels (e.g. Arabic, Chinese).', "warning");
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
        ContentHelper.showToast(`Successfully scanned and mapped ${mappedCount} files.`, "success");
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
            ContentHelper.showToast('No SRTs collected.', "warning");
            return;
        }

        const LibZip = window.JSZip || (typeof JSZip !== 'undefined' ? JSZip : null);
        if (!LibZip) {
            ContentHelper.showToast('JSZip not found.', "error");
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
            ContentHelper.showToast("ZIP error: " + err.message, "error");
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
