window.ContentCopyPanel = class {
  constructor(onClose) {
    this.onClose = onClose;
    this.elements = Array.from(document.getElementsByClassName(
        'markdown prose dark:prose-invert w-full break-words light'));
    this._render();
  }

  _render() {
    this.el = document.createElement("div");
    this.el.className = "panel-box ts-panel";
    this.el.style.maxWidth = "500px";
    this.el.style.maxHeight = "500px";
    this.el.style.overflow = "auto";
    this.el.id = "content-copy-panel";

    const html = `
      <h3 class="ts-title">📋 Copy Content</h3>
      <div style="margin-bottom:8px;">
        <button id="ccp-copy-all" class="ts-btn ts-btn-accent">Copy All</button>
        <input type="number" id="ccp-index" placeholder="From index…" min="0" style="width:80px;margin-left:8px;" />
        <button id="ccp-copy-from" class="ts-btn">Copy From Index</button>
        <button id="ccp-download" class="ts-btn ts-btn-accent" style="margin-left:8px;">⬇️ Download File</button>
      </div>
      <div id="ccp-list" class="ts-results"></div>
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
      row.style.marginBottom = "6px";
      row.style.fontSize = "12px";
      row.style.borderBottom = "1px solid #ddd";
      row.style.paddingBottom = "4px";
      row.style.color = "#444";

      const number = document.createElement("strong");
      number.textContent = `#${idx + 1}: `;
      number.style.color = "#1e40af";

      const preview = document.createElement("span");
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
      const index = parseInt(indexInput.value || "0", 10);
      let content = '';

      if (indexInput.value && (!Number.isInteger(index) || index < 0 || index
          > this.elements.length)) {
        alert("Invalid index");
        return;
      }

      const fromIndex = indexInput.value ? index - 1 : 0;
      content = this.elements.slice(fromIndex).map(el => el.innerText).join(
          '\n\n');

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
    const blob = new Blob([content], {type: 'text/plain'});
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
