window.ContentCopyPanel = class {
  constructor(onClose) {
    this.onClose = onClose;
    this.elements = window.ChatAdapter.getContentElements();
    console.log("ContentCopyPanel elements:", this.elements);
    this._render();
  }

  _render() {
    this.el = document.createElement("div");
    this.el.id = "content-copy-panel";
    this.el.className = "panel-box ts-panel w-[420px] p-4 rounded-xl shadow-2xl bg-white border border-gray-100 flex flex-col relative";
    this.el.style.maxHeight = "580px";

    const html = `
      <div class="ts-title flex items-center mb-4 cursor-move select-none">
        <span class="text-xl mr-2">📋</span>
        <div>
          <h3 class="m-0 text-base font-bold text-gray-900 leading-tight">Copy Content</h3>
          <div class="text-[10px] text-gray-500 font-medium tracking-tight">Found ${this.elements.length} message blocks</div>
        </div>
      </div>

      <!-- Custom Filenames Input -->
      <div class="mb-3">
        <label for="ccp-filenames" class="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-widest pl-1">
          Custom Filenames (optional, comma separated):
        </label>
        <div class="relative">
          <input type="text" id="ccp-filenames" 
            class="w-full h-9 text-xs p-2.5 border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-sans"
            placeholder="e.g. intro, chapter1, conclusion (leave empty for auto-numbering)"
          />
        </div>
      </div>

      <div class="flex flex-col gap-3 mb-4">
        <div class="flex items-center gap-2.5">
          <button id="ccp-copy-all" class="h-8 px-3 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px] hover:bg-indigo-100 transition-all active:scale-95 shadow-sm">
            Copy All
          </button>
          <div class="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-100">
            <input type="number" id="ccp-index" placeholder="Idx" min="1" 
              class="w-12 h-6 text-center text-[10px] border-none bg-transparent focus:ring-0 font-bold text-indigo-600" />
            <button id="ccp-copy-from" class="h-6 px-2 bg-white text-gray-500 text-[9px] font-bold rounded-md border border-gray-200 hover:bg-gray-50 hover:text-gray-700 shadow-sm transition-all active:scale-95">
              Copy From
            </button>
          </div>
          
          <!-- Download buttons group -->
          <div class="flex gap-1.5 ml-auto">
            <button id="ccp-download-txt" class="h-8 px-3 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold rounded-lg text-[10px] hover:bg-emerald-100 transition-all active:scale-95 shadow-sm">
              <span>📄</span> TXT
            </button>
            <button id="ccp-download-zip" class="h-8 px-3 flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-700 font-bold rounded-lg text-[10px] hover:bg-purple-100 transition-all active:scale-95 shadow-sm">
              <span>📦</span> ZIP
            </button>
          </div>
        </div>

        <label class="flex items-center gap-2 cursor-pointer select-none group px-1">
          <input type="checkbox" id="ccp-prefix-part" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer transition-all" />
          <span class="text-[11px] text-gray-400 font-bold group-hover:text-gray-600 tracking-tight">Add "Part X" prefix when downloading/copying</span>
        </label>
      </div>

      <div class="bg-gray-50 rounded-xl p-3 border border-gray-100 flex-1 overflow-hidden flex flex-col">
        <div class="flex items-center mb-2 pl-1">
          <label class="flex items-center gap-1.5 cursor-pointer select-none group">
            <input type="checkbox" id="ccp-select-all" class="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded cursor-pointer" checked />
            <strong class="text-[11px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">Content Preview</strong>
          </label>
          <span id="ccp-selected-count" class="ml-auto text-[10px] font-bold text-indigo-400"></span>
        </div>
        <div id="ccp-list" class="ts-results flex-1 overflow-y-auto pr-1 custom-scrollbar"></div>
      </div>
    `;

    this.el.innerHTML = html;

    ChatGPTHelper.mountPanel(this.el);
    ChatGPTHelper.makeDraggable(this.el, ".ts-title");
    ChatGPTHelper.addCloseButton(this.el, () => this.destroy());

    this._renderList();
    this._bindEvents();
  }

  _renderList() {
    const container = this.el.querySelector("#ccp-list");
    container.innerHTML = "";
    this.elements.forEach((el, idx) => {
      const row = document.createElement("div");
      row.className = "mb-1 py-1.5 border-b border-gray-50 last:border-0 hover:bg-white hover:rounded hover:px-1.5 transition-all group cursor-default flex items-center gap-1.5";

      // Checkbox chọn item
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "ccp-item-check flex-shrink-0 w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded cursor-pointer";
      checkbox.dataset.idx = idx;
      checkbox.checked = true;
      checkbox.onclick = (e) => {
        e.stopPropagation();
        this._updateSelectAllState();
        this._updateSelectedCount();
      };

      const number = document.createElement("span");
      number.className = "font-bold text-indigo-400 mr-1 text-[10px] w-6 flex-shrink-0 text-right";
      number.textContent = `#${idx + 1}`;

      const preview = document.createElement("span");
      preview.className = "text-[11px] text-gray-400 group-hover:text-gray-700 truncate font-medium flex-1 min-w-0";
      const text = el.innerText.trim();
      preview.textContent = this._shorten(text);

      // Button Download
      const btnDownload = document.createElement("button");
      btnDownload.className = "flex-shrink-0 h-6 px-1.5 flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold rounded text-[9px] hover:bg-emerald-100 transition-all active:scale-95 opacity-0 group-hover:opacity-100";
      btnDownload.title = `Download item #${idx + 1}`;
      btnDownload.innerHTML = "📄";
      btnDownload.onclick = (e) => {
        e.stopPropagation();
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
      btnCopy.className = "flex-shrink-0 h-6 px-1.5 flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded text-[9px] hover:bg-indigo-100 transition-all active:scale-95 opacity-0 group-hover:opacity-100";
      btnCopy.title = `Copy item #${idx + 1}`;
      btnCopy.innerHTML = "📋";
      btnCopy.onclick = (e) => {
        e.stopPropagation();
        const prefixCheckbox = this.el.querySelector('#ccp-prefix-part');
        const addPrefix = prefixCheckbox?.checked;
        let content = this._getText(el);
        if (addPrefix) content = `Part ${idx + 1}\n` + content;
        this._copyToClipboard(content, `✅ Copied item #${idx + 1}!`);
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

    // Download TXT
    this.el.querySelector("#ccp-download-txt").onclick = () => {
      const indexInput = this.el.querySelector("#ccp-index");
      const prefixCheckbox = this.el.querySelector("#ccp-prefix-part");

      const index = parseInt(indexInput.value || "0", 10);

      if (indexInput.value && (!Number.isInteger(index) || index < 0 || index > this.elements.length)) {
        alert("Invalid index");
        return;
      }

      const fromIndex = indexInput.value ? index - 1 : 0;
      const addPrefix = prefixCheckbox?.checked;

      const content = this.elements.slice(fromIndex).map((el, idx) => {
        const partLabel = `Part ${idx + 1}\n`;
        const txt = this._getText(el);
        return addPrefix ? partLabel + txt : txt;
      }).join('\n\n');

      this._downloadFile(content, 'content.txt');
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

  _copyToClipboard(text, successMessage) {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log(successMessage);
        ChatGPTHelper.showToast(successMessage, "success");
      })
      .catch(err => {
        console.error('❌ Copy failed:', err);
        ChatGPTHelper.showToast('❌ Failed to copy text.', "error");
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
      ChatGPTHelper.showToast('⚠️ Chưa chọn item nào để download.', "warning");
      return;
    }

    const LibZip = window.JSZip || (typeof JSZip !== 'undefined' ? JSZip : null);
    if (!LibZip) {
      ChatGPTHelper.showToast('JSZip library not found.', "error");
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

        ChatGPTHelper.showToast(`✅ Downloaded ZIP with ${count} files!`, "success");
      });

    } catch (err) {
      console.error('ZIP download error:', err);
      ChatGPTHelper.showToast("❌ ZIP error: " + err.message, "error");
    }
  }

  destroy() {
    this.el?.remove();
    this.onClose?.();
  }
}