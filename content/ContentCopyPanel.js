window.ContentCopyPanel = class extends window.BasePanel {
  constructor(onClose) {
    const elements = window.ChatAdapter.getContentElements() || [];
    super({
      id: "content-copy-panel",
      title: "Copy Content",
      icon: "⎘",
      onClose: onClose,
      view: {
        render: () => window.ContentCopyView?.render?.(elements.length) || ""
      }
    });
    this.elements = elements;

    // Load saved custom filenames từ localStorage
    const savedFilenames = localStorage.getItem('ccp-filenames');
    if (savedFilenames) {
      const filenameInput = this.el.querySelector('#ccp-filenames');
      if (filenameInput) filenameInput.value = savedFilenames;
    }

    this._renderList();
    this._bindEvents();
  }

  _renderList() {
    const container = this.el.querySelector("#ccp-list");
    container.innerHTML = "";
    this.elements.forEach((el, idx) => {
      const row = document.createElement("div");
      row.className = "ts-item-row";

      // Checkbox chọn item
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "ts-item-row__check ccp-item-check";
      checkbox.dataset.idx = idx;
      checkbox.checked = true;
      checkbox.onclick = (e) => {
        e.stopPropagation();
        this._updateSelectAllState();
        this._updateSelectedCount();
      };

      const number = document.createElement("span");
      number.className = "ts-item-row__idx";
      number.textContent = `#${idx + 1}`;

      const preview = document.createElement("span");
      preview.className = "ts-item-row__text";
      const text = el.innerText.trim();
      preview.textContent = this._shorten(text);

      // Button Download
      const btnDownload = document.createElement("button");
      btnDownload.className = "ts-item-row__btn";
      btnDownload.title = `Download item #${idx + 1}`;
      btnDownload.innerHTML = "↓";
      btnDownload.onclick = (e) => {
        e.stopPropagation();
        ContentHelper.playHapticFeedback?.(8);
        const filenamesInput = this.el.querySelector('#ccp-filenames')?.value || '';
        const prefixCheckbox = this.el.querySelector('#ccp-prefix-part');
        const addPrefix = prefixCheckbox?.checked;
        let customNames = filenamesInput.trim() ? filenamesInput.split(',').map(n => n.trim()).filter(n => n) : [];
        let filename = customNames[idx] ? customNames[idx] : `${idx + 1}`;
        if (!filename.toLowerCase().endsWith('.txt')) filename += '.txt';
        let content = this._getText(el);
        if (addPrefix) content = `Part ${idx + 1}\n` + content;
        this._downloadFile(content, filename);
      };

      // Button Copy
      const btnCopy = document.createElement("button");
      btnCopy.className = "ts-item-row__btn";
      btnCopy.title = `Copy item #${idx + 1}`;
      btnCopy.innerHTML = "⎘";
      btnCopy.onclick = (e) => {
        e.stopPropagation();
        ContentHelper.playHapticFeedback?.(8);
        const prefixCheckbox = this.el.querySelector('#ccp-prefix-part');
        const addPrefix = prefixCheckbox?.checked;
        let content = this._getText(el);
        if (addPrefix) content = `Part ${idx + 1}\n` + content;
        this._copyToClipboard(content, `✓ Đã chép mục #${idx + 1}!`);
      };

      row.appendChild(checkbox);
      row.appendChild(number);
      row.appendChild(preview);
      row.appendChild(btnDownload);
      row.appendChild(btnCopy);
      container.appendChild(row);
    });

    this._updateSelectedCount();
  }

  _getCheckedIndices() {
    return [...this.el.querySelectorAll('.ccp-item-check:checked')].map(cb => parseInt(cb.dataset.idx));
  }

  _updateSelectedCount() {
    const total = this.elements.length;
    const checked = this._getCheckedIndices().length;
    const countEl = this.el.querySelector('#ccp-selected-count');
    if (countEl) {
      countEl.textContent = checked === total ? '' : `${checked}/${total} selected`;
      countEl.style.color = checked === 0 ? '#ef4444' : '';
    }
  }

  _updateSelectAllState() {
    const checkboxes = [...this.el.querySelectorAll('.ccp-item-check')];
    const checkedCount = checkboxes.filter(cb => cb.checked).length;
    const selectAll = this.el.querySelector('#ccp-select-all');
    if (!selectAll) return;
    selectAll.checked = checkedCount === checkboxes.length;
    selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
  }

  _shorten(text, maxLen = 80) {
    if (text.length <= maxLen) {
      return text;
    }
    const start = text.slice(0, 40).trim();
    const end = text.slice(-25).trim();
    return `${start} … ${end}`;
  }

  _getText(el) {
    if (!el) return '';
    const wrapper = document.createElement('div');
    // Clone node to avoid modifying original DOM
    const clone = el.cloneNode(true);
    wrapper.appendChild(clone);

    // Remove UI elements that shouldn't be copied
    wrapper.querySelectorAll('button, .sr-only, script, style').forEach(x => x.remove());

    // Replace <br> with newline
    wrapper.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

    // Block elements -> append \n\n (Start/End of block with spacing)
    // We want at least one empty line between paragraphs.
    wrapper.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(b => b.after('\n\n'));

    // Div, Li, Tr -> \n (Line break but no extra spacing)
    // This preserves structure without forcing huge gaps.
    wrapper.querySelectorAll('div, li, tr').forEach(b => b.after('\n'));

    let text = wrapper.textContent;

    // Normalize newlines: max 2 consecutive (\n\n = 1 empty line)
    // First, collapse spaces around newlines if needed, but safer to just handle regex
    return text.replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  _bindEvents() {
    // Lưu custom filenames vào localStorage khi thay đổi
    const filenamesEl = this.el.querySelector('#ccp-filenames');
    if (filenamesEl) {
      filenamesEl.addEventListener('input', () => {
        localStorage.setItem('ccp-filenames', filenamesEl.value);
      });
    }

    // Copy All
    this.el.querySelector("#ccp-copy-all").onclick = () => {
      const text = this.elements.map(el => this._getText(el)).join('\n\n');
      this._copyToClipboard(text, '✅ Copied all content!');
    };

    // Copy From
    this.el.querySelector("#ccp-copy-from").onclick = () => {
      const indexInput = this.el.querySelector("#ccp-index");
      const index = parseInt(indexInput.value || "0", 10);
      if (isNaN(index) || index < 0 || index > this.elements.length) {
        alert("Invalid index");
        return;
      }
      let start = index - 1;
      const text = this.elements.slice(start).map(el => this._getText(el)).join('\n\n');
      this._copyToClipboard(text, `✅ Copied from index ${index}`);
    };

    // Copy TXT
    this.el.querySelector("#ccp-copy-txt").onclick = () => {
      const content = this._getTxtContent();
      if (content !== null) {
        this._copyToClipboard(content, '✅ Copied TXT content!');
      }
    };

    // Download TXT
    this.el.querySelector("#ccp-download-txt").onclick = () => {
      const content = this._getTxtContent();
      if (content !== null) {
        this._downloadFile(content, 'content.txt');
      }
    };

    // Select All checkbox
    const selectAllEl = this.el.querySelector('#ccp-select-all');
    if (selectAllEl) {
      selectAllEl.onclick = () => {
        const checkboxes = this.el.querySelectorAll('.ccp-item-check');
        checkboxes.forEach(cb => cb.checked = selectAllEl.checked);
        this._updateSelectedCount();
      };
    }

    // Download ZIP
    this.el.querySelector("#ccp-download-zip").onclick = () => {
      this._downloadZip();
    };
  }

  _getTxtContent() {
    const indexInput = this.el.querySelector("#ccp-index");
    const prefixCheckbox = this.el.querySelector("#ccp-prefix-part");

    const index = parseInt(indexInput.value || "0", 10);

    if (indexInput.value && (!Number.isInteger(index) || index < 0 || index > this.elements.length)) {
      alert("Invalid index");
      return null;
    }

    const fromIndex = indexInput.value ? index - 1 : 0;
    const addPrefix = prefixCheckbox?.checked;

    return this.elements.slice(fromIndex).map((el, idx) => {
      const partLabel = `Part ${idx + 1}\n`;
      const txt = this._getText(el);
      return addPrefix ? partLabel + txt : txt;
    }).join('\n\n==========\n\n');
  }

  _copyToClipboard(text, successMessage) {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log(successMessage);
        ContentHelper.showToast(successMessage, "success");
      })
      .catch(err => {
        console.error('❌ Copy failed:', err);
        ContentHelper.showToast('❌ Failed to copy text.', "error");
      });
  }

  _downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Download ZIP - chỉ các item được tích checkbox
  _downloadZip() {
    const checkedIndices = this._getCheckedIndices();
    if (checkedIndices.length === 0) {
      ContentHelper.showToast('⚠️ Chưa chọn item nào để download.', "warning");
      return;
    }

    const LibZip = window.JSZip || (typeof JSZip !== 'undefined' ? JSZip : null);
    if (!LibZip) {
      ContentHelper.showToast('JSZip library not found.', "error");
      return;
    }

    try {
      const zip = new LibZip();
      const filenamesInput = this.el.querySelector('#ccp-filenames')?.value || '';
      const prefixCheckbox = this.el.querySelector('#ccp-prefix-part');
      const addPrefix = prefixCheckbox?.checked;

      // Parse custom filenames nếu có (ánh xạ theo index gốc)
      let customNames = [];
      if (filenamesInput.trim()) {
        customNames = filenamesInput.split(',').map(n => n.trim()).filter(n => n);
      }

      // Thêm từng file được chọn vào ZIP (map tên theo vị trí trong danh sách chọn)
      checkedIndices.forEach((origIdx, position) => {
        const el = this.elements[origIdx];
        let content = this._getText(el);
        if (addPrefix) content = `Part ${origIdx + 1}\n` + content;

        // Xác định tên file: ánh xạ theo position (thứ tự trong ds đã chọn)
        let filename = '';
        if (customNames[position]) {
          filename = customNames[position];
          if (!filename.toLowerCase().endsWith('.txt')) filename += '.txt';
        } else {
          filename = `${position + 1}.txt`;
        }

        zip.file(filename, content);
      });

      const count = checkedIndices.length;
      // Tạo và download ZIP
      zip.generateAsync({ type: 'blob' }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `content_${count}_files_${new Date().getTime()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        ContentHelper.showToast(`✅ Downloaded ZIP with ${count} files!`, "success");
      });

    } catch (err) {
      console.error('ZIP download error:', err);
      ContentHelper.showToast("❌ ZIP error: " + err.message, "error");
    }
  }

  destroy() {
    this.el?.remove();
    this.onClose?.();
  }
}