/**
 * SRTAutomationPanel.js
 * Quản lý logic quét và trích xuất file phụ đề SRT
 * Kế thừa BasePanel chuẩn hóa Lifecycle và Minimize Bubble.
 */

window.SRTAutomationPanel = class extends window.BasePanel {
    constructor(onClose) {
        super({
            id: "srt-automation-panel",
            title: "SRT Automation",
            icon: "⏱️",
            onClose: onClose,
            view: window.SRTAutomationView
        });
        this.collectedSRTs = {}; // languageLabel -> srtContent
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
            ContentHelper.playHapticFeedback?.(8);

            this._scanExisting();

            setTimeout(() => {
                btnScan.disabled = false;
                btnScan.textContent = originalText;
                statusText.textContent = 'Status: Standby (Scan ready)';
            }, 1000);
        };

        btnDownload.onclick = () => {
            ContentHelper.playHapticFeedback?.(8);
            this._downloadZip();
        };

        btnClear.onclick = () => {
            if (confirm('Clear all collected SRTs?')) {
                ContentHelper.playHapticFeedback?.(8);
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
        console.log(`✓ [SRTAutomation] Scan complete. Mapped ${mappedCount} SRTs.`);
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
            li.className = "ts-item-row";
            li.innerHTML = `
                <span class="ts-item-row__text flex items-center gap-1.5 font-medium">
                    <span style="color: var(--ch-success); font-size: 11px;">✓</span> ${label}.srt
                </span> 
                <span class="ts-item-row__idx font-mono font-bold" style="color: var(--ch-text-muted); font-size: 9.5px;">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            `;
            listEl.appendChild(li);
        });

        const box = listEl.parentElement;
        box.scrollTop = box.scrollHeight;

        // Cập nhật badge bong bóng Messenger nếu đang thu nhỏ
        if (this._minimizeCtrl && this._minimizeCtrl.isMinimized) {
            this._minimizeCtrl.updateBadge(keys.length > 0 ? `${keys.length}` : '−', keys.length > 0 ? 'running' : 'idle');
        }
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
        const btnScan = this.el?.querySelector('#srt-scan-existing');
        return btnScan ? btnScan.disabled : false;
    }

    _getBubbleBadgeInfo() {
        const count = Object.keys(this.collectedSRTs || {}).length;
        return {
            text: count > 0 ? `${count}` : '−',
            status: count > 0 ? 'running' : 'idle'
        };
    }
};
