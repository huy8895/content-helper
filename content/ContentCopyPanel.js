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
          <button id="ccp-download" class="h-8 px-3 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold rounded-lg text-[10px] hover:bg-emerald-100 transition-all active:scale-95 shadow-sm ml-auto">
            <span>⬇️</span> Download
          </button>
        </div>

        <label class="flex items-center gap-2 cursor-pointer select-none group px-1">
          <input type="checkbox" id="ccp-prefix-part" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer transition-all" />
          <span class="text-[11px] text-gray-400 font-bold group-hover:text-gray-600 tracking-tight">Add "Part X" prefix when downloading/copying</span>
        </label>
      </div>

      <div class="bg-gray-50 rounded-xl p-3 border border-gray-100 flex-1 overflow-hidden flex flex-col">
        <strong class="text-[11px] font-bold text-gray-400 uppercase mb-2 block tracking-widest pl-1">Content Preview</strong>
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
      row.className = "mb-1 py-1.5 border-b border-gray-50 last:border-0 hover:bg-white hover:rounded hover:px-1.5 transition-all group cursor-default flex items-center";

      const number = document.createElement("span");
      number.className = "font-bold text-indigo-400 mr-2 text-[10px] w-6 flex-shrink-0 text-right";
      number.textContent = `#${idx + 1}`;

      const preview = document.createElement("span");
      preview.className = "text-[11px] text-gray-400 group-hover:text-gray-700 truncate font-medium";
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
