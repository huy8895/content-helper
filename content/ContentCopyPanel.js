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
    this.el.className = "panel-box ts-panel w-[480px] p-6 rounded-2xl shadow-2xl bg-white border border-gray-100 flex flex-col";
    this.el.style.maxHeight = "600px";

    const html = `
      <div class="ts-title flex items-center mb-5 cursor-move select-none">
        <span class="text-2xl mr-3">📋</span>
        <div>
          <h3 class="m-0 text-lg font-bold text-gray-900 leading-tight">Copy Content</h3>
          <div class="text-xs text-gray-500 mt-0.5">Found ${this.elements.length} message blocks</div>
        </div>
      </div>

      <div class="flex flex-col gap-4 mb-6">
        <div class="flex items-center gap-3">
          <button id="ccp-copy-all" class="ts-btn ts-btn-accent h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all active:scale-95 shadow-sm">
            Copy All
          </button>
          <div class="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
            <input type="number" id="ccp-index" placeholder="Idx" min="1" 
              class="w-16 h-8 text-center text-sm border-none bg-transparent focus:ring-0 font-medium" />
            <button id="ccp-copy-from" class="h-8 px-3 bg-white text-gray-700 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50 shadow-sm transition-all active:scale-95">
              Copy From
            </button>
          </div>
          <button id="ccp-download" class="h-10 px-4 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all active:scale-95 shadow-sm ml-auto">
            <span>⬇️</span> Download
          </button>
        </div>

        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" id="ccp-prefix-part" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
          <span class="text-[13px] text-gray-600 font-medium">Add "Part X" prefix when downloading/copying</span>
        </label>
      </div>

      <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 flex-1 overflow-hidden flex flex-col">
        <strong class="text-sm text-gray-800 mb-3 block">Content Preview</strong>
        <div id="ccp-list" class="ts-results flex-1 overflow-y-auto pr-2 custom-scrollbar"></div>
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
      row.className = "mb-2 py-2 border-b border-gray-100 last:border-0 hover:bg-white hover:rounded-lg hover:px-2 transition-all group cursor-default";

      const number = document.createElement("span");
      number.className = "font-bold text-indigo-700 mr-2 text-[13px]";
      number.textContent = `#${idx + 1}`;

      const preview = document.createElement("span");
      preview.className = "text-[13px] text-gray-600 group-hover:text-gray-900";
      const text = el.innerText.trim();
      preview.textContent = this._shorten(text);

      row.appendChild(number);
      row.appendChild(preview);
      container.appendChild(row);
    });
  }

  // 👇 Thêm vào trong class
  _shorten(text, maxLen = 80) {
    if (text.length <= maxLen) {
      return text;
    }
    const start = text.slice(0, 40).trim();
    const end = text.slice(-25).trim();
    return `${start} … ${end}`;
  }

  _bindEvents() {
    this.el.querySelector("#ccp-copy-all").onclick = () => {
      const text = this.elements.map(el => el.innerText).join('\n\n');
      this._copyToClipboard(text, '✅ Copied all content!');
    };

    this.el.querySelector("#ccp-copy-from").onclick = () => {
      const indexInput = this.el.querySelector("#ccp-index");
      const index = parseInt(indexInput.value || "0", 10);
      if (isNaN(index) || index < 0 || index >= this.elements.length) {
        alert("Invalid index");
        return;
      }
      let start = index - 1;
      const text = this.elements.slice(start).map(el => el.innerText).join(
        '\n\n');
      this._copyToClipboard(text, `✅ Copied from index ${index}`);
    };

    this.el.querySelector("#ccp-download").onclick = () => {
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
        return addPrefix ? partLabel + el.innerText : el.innerText;
      }).join('\n\n');

      this._downloadFile(content, 'content.txt');
    };

  }

  _copyToClipboard(text, successMessage) {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log(successMessage);
        alert(successMessage);
      })
      .catch(err => {
        console.error('❌ Copy failed:', err);
        alert('❌ Failed to copy text.');
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


  destroy() {
    this.el?.remove();
    this.onClose?.();
  }
}
