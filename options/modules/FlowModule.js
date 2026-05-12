/**
 * FlowModule – Quản lý cấu hình Flow (Kịch bản liên hoàn) trên trang Options.
 * Kế thừa BaseModule. Hỗ trợ: danh sách + tìm kiếm + editor modal với Drag & Drop (Vanilla JS).
 */
class FlowModule extends BaseModule {
  constructor() {
    super('main-content', 'flowConfigs', 'flow_configs');
    this.flows = {};
    this.allScenarios = {}; // Để lấy danh sách scenario
    this.filteredNames = [];
    this.currentPage = 1;
    this.perPage = 8;
    this.searchKeyword = '';
    this.editingName = null; // null = tạo mới, string = đang sửa
    
    // Trạng thái cho drag & drop
    this.draggedItem = null;
  }

  /**
   * Render giao diện module Flow.
   */
  async render() {
    // Load flows
    this.flows = await this.loadFromStorage();
    this.filteredNames = Object.keys(this.flows);
    this.currentPage = 1;

    // Load tất cả scenario để lọc ra những cái có 1 câu hỏi
    const scenarioData = await new Promise(resolve => {
      chrome.storage.local.get(['scenarioTemplates'], resolve);
    });
    this.allScenarios = scenarioData.scenarioTemplates || {};

    const html = `
      <div class="module-section">
        <div class="page-header">
          <h2>🔗 Quản lý Flow (Luồng kịch bản)</h2>
          <p>Tạo và cấu hình các chuỗi kịch bản liên hoàn. Mỗi bước là một scenario độc lập.</p>
        </div>

        <div class="card">
          <div class="scenario-list-header">
            <div style="display:flex;gap:12px;flex:1;max-width:480px">
              <div class="search-box" style="max-width:none;flex:1">
                <span class="search-icon">🔍</span>
                <input type="text" id="flow-search" placeholder="Tìm flow...">
              </div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" id="flow-create-btn">➕ Tạo Flow mới</button>
            </div>
          </div>

          <div id="flow-table-wrapper"></div>
          <div id="flow-pagination"></div>
        </div>
      </div>
    `;

    this.containerEl.innerHTML = html;
    this._renderTable();
    this._bindEvents();
  }

  /**
   * Render bảng danh sách flow.
   */
  _renderTable() {
    const keyword = this.searchKeyword.toLowerCase();

    this.filteredNames = Object.keys(this.flows).filter(name => {
      if (!keyword) return true;
      return name.toLowerCase().includes(keyword);
    });

    const totalPages = Math.max(1, Math.ceil(this.filteredNames.length / this.perPage));
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * this.perPage;
    const pageItems = this.filteredNames.slice(startIdx, startIdx + this.perPage);

    const wrapper = this.containerEl.querySelector('#flow-table-wrapper');

    if (this.filteredNames.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔗</div>
          <h4>Chưa có Flow nào</h4>
          <p>Bấm "Tạo Flow mới" để bắt đầu kết nối các kịch bản.</p>
        </div>
      `;
      this.containerEl.querySelector('#flow-pagination').innerHTML = '';
      return;
    }

    let tableHTML = `
      <table class="scenario-table">
        <thead>
          <tr>
            <th style="width:50%">Tên Flow</th>
            <th style="width:20%">Số bước (Steps)</th>
            <th style="width:30%;text-align:right">Hành động</th>
          </tr>
        </thead>
        <tbody>
    `;

    pageItems.forEach(name => {
      const flowData = this.flows[name];
      const steps = flowData.steps || [];

      tableHTML += `
        <tr>
          <td><span class="sc-name" data-name="${this._escapeHTML(name)}">${this._escapeHTML(name)}</span></td>
          <td style="font-weight:600">${steps.length} steps</td>
          <td>
            <div class="sc-actions">
              <button class="btn btn-secondary btn-xs flow-edit-btn" data-name="${this._escapeHTML(name)}">✏️ Sửa</button>
              <button class="btn btn-danger btn-xs flow-delete-btn" data-name="${this._escapeHTML(name)}">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    });

    tableHTML += '</tbody></table>';
    wrapper.innerHTML = tableHTML;

    this._renderPagination(totalPages);
    this._bindTableEvents();
  }

  _renderPagination(totalPages) {
    const el = this.containerEl.querySelector('#flow-pagination');
    if (totalPages <= 1) { el.innerHTML = ''; return; }

    const total = this.filteredNames.length;
    const start = (this.currentPage - 1) * this.perPage + 1;
    const end = Math.min(this.currentPage * this.perPage, total);

    let btnsHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      btnsHTML += `<button class="${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    el.innerHTML = `
      <div class="pagination">
        <span class="pagination-info">Hiển thị ${start}–${end} / ${total} flow</span>
        <div class="pagination-btns">${btnsHTML}</div>
      </div>
    `;

    el.querySelectorAll('[data-page]').forEach(btn => {
      btn.onclick = () => {
        this.currentPage = parseInt(btn.dataset.page);
        this._renderTable();
      };
    });
  }

  /**
   * Mở editor tạo/sửa flow. Tái sử dụng HTML cấu trúc của Scenario editor.
   */
  _openEditor(name = null) {
    this.editingName = name;
    
    // Tái sử dụng overlay từ options.html (id="scenario-editor-overlay")
    const overlay = document.getElementById('scenario-editor-overlay');
    const titleEl = document.getElementById('editor-title');
    const body = document.getElementById('editor-body');

    titleEl.textContent = name ? `✏️ Sửa Flow: ${name}` : '➕ Tạo Flow mới';

    let flowName = name || '';
    let steps = [];
    if (name && this.flows[name]) {
      steps = this.flows[name].steps || [];
    }

    // Lọc các scenario có 1 câu hỏi
    const singleQScenarios = [];
    Object.keys(this.allScenarios).forEach(scName => {
      const raw = this.allScenarios[scName];
      const questions = Array.isArray(raw) ? raw : (raw.questions || []);
      if (questions.length === 1) {
        singleQScenarios.push(scName);
      }
    });

    let scOptionsHTML = '<option value="">-- Chọn Scenario (1 câu hỏi) --</option>';
    singleQScenarios.forEach(sc => {
      scOptionsHTML += `<option value="${this._escapeHTML(sc)}">${this._escapeHTML(sc)}</option>`;
    });

    // Cấu trúc editor
    body.innerHTML = `
      <div class="editor-sidebar">
        <div class="meta-section-title">Thông tin Flow</div>
        <div class="form-group">
          <label class="form-label">Tên Flow</label>
          <input type="text" class="form-input" id="flow-ed-name" value="${this._escapeHTML(flowName)}"
            placeholder="Tên Flow" ${name ? 'readonly style="opacity:0.6;cursor:not-allowed"' : ''}>
        </div>
        <div class="meta-section-title" style="margin-top:8px">Thống kê</div>
        <div class="meta-stat">
          <span>Số bước (steps)</span>
          <strong id="flow-ed-step-count">${steps.length}</strong>
        </div>
      </div>

      <div class="editor-main" style="display:flex; flex-direction:column; gap:12px;">
        <div class="editor-main-header">
          <div class="form-label">Danh sách Bước (Kéo thả để sắp xếp)</div>
          <button class="btn btn-ghost btn-xs" id="flow-ed-add-step" style="height:26px;font-size:11px;gap:4px">
            <span style="font-size:13px">+</span> Thêm bước
          </button>
        </div>
        <!-- Vùng chứa các steps (drag drop) -->
        <div class="editor-questions custom-scroll" id="flow-ed-steps" style="flex:1; overflow-y:auto; gap:8px; display:flex; flex-direction:column; padding-right:4px;"></div>
      </div>
      <!-- Lưu trữ html options để dùng khi add step -->
      <template id="sc-options-template">${scOptionsHTML}</template>
    `;

    const sContainer = body.querySelector('#flow-ed-steps');
    steps.forEach(step => this._addStepToEditor(sContainer, step));

    body.querySelector('#flow-ed-add-step').onclick = () => {
      this._addStepToEditor(sContainer, { scenarioName: '', defaultValues: {} });
      this._updateStepCount();
      sContainer.scrollTop = sContainer.scrollHeight;
    };

    // Override lại sự kiện save của editor dùng chung
    const saveBtn = document.getElementById('editor-save');
    saveBtn.onclick = () => this._handleSaveFlow();

    // Sửa lỗi không bấm hủy được modal
    const closeOverlay = () => {
      document.getElementById('scenario-editor-overlay').classList.remove('show');
    };
    document.getElementById('editor-close').onclick = closeOverlay;
    document.getElementById('editor-cancel').onclick = closeOverlay;
    document.getElementById('scenario-editor-overlay').onclick = (e) => {
      if (e.target === e.currentTarget) {
        closeOverlay();
      }
    };

    overlay.classList.add('show');
  }

  _addStepToEditor(container, stepData) {
    const div = document.createElement('div');
    div.className = 'flow-step-item';
    div.setAttribute('draggable', 'true');
    // Styling cơ bản cho step (có thể bổ sung ở CSS)
    div.style.cssText = `
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      cursor: grab;
      position: relative;
    `;

    const optionsTemplate = document.getElementById('sc-options-template').innerHTML;

    div.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <div style="cursor:grab; padding:4px; opacity:0.5;">☰</div>
        <select class="form-select flow-sc-select" style="flex:1; height:32px; font-size:12px; font-weight:bold;">
          ${optionsTemplate}
        </select>
        <button class="btn btn-ghost btn-xs flow-remove-step" style="color:var(--color-text-muted); font-size:16px;">✕</button>
      </div>
      <div class="flow-step-vars" style="display:flex; flex-direction:column; gap:6px; margin-top:4px; padding-left:24px;">
        <!-- Vùng render input config biến -->
      </div>
    `;

    const selectEl = div.querySelector('.flow-sc-select');
    if (stepData.scenarioName) {
      selectEl.value = stepData.scenarioName;
    }

    const varsContainer = div.querySelector('.flow-step-vars');

    // Hàm render biến khi chọn scenario
    const renderVars = (scName) => {
      varsContainer.innerHTML = '';
      if (!scName || !this.allScenarios[scName]) return;
      
      const raw = this.allScenarios[scName];
      const q = Array.isArray(raw) ? raw[0] : (raw.questions || [])[0];
      if (!q) return;

      // Tìm các biến (ví dụ: \${topic|A,B} hoặc \${name})
      const matches = [...q.text.matchAll(/\\$\\{([^}|]+)(?:\\|([^}]+))?\\}/g)];
      
      if (matches.length > 0) {
        varsContainer.innerHTML = '<div style="font-size:10px; color:var(--color-text-muted); font-weight:bold; text-transform:uppercase;">Giá trị mặc định:</div>';
      }

      const shown = new Set();
      matches.forEach(match => {
        const varName = match[1];
        if (shown.has(varName)) return;
        shown.add(varName);

        const val = stepData.defaultValues[varName] || '';
        
        const inputWrap = document.createElement('div');
        inputWrap.style.cssText = 'display:flex; align-items:center; gap:8px;';
        inputWrap.innerHTML = `
          <span style="font-size:11px; font-weight:600; width:60px; text-align:right;">\${${this._escapeHTML(varName)}}</span>
          <input type="text" class="form-input flow-var-input" data-var="${this._escapeHTML(varName)}" value="${this._escapeHTML(val)}" placeholder="Mặc định..." style="height:26px; font-size:11px; flex:1;">
        `;
        varsContainer.appendChild(inputWrap);
      });
    };

    renderVars(selectEl.value);

    // Khi đổi scenario, render lại input biến
    selectEl.addEventListener('change', (e) => {
      stepData.defaultValues = {}; // Reset vars
      renderVars(e.target.value);
    });

    // Nút xóa
    div.querySelector('.flow-remove-step').onclick = () => {
      div.remove();
      this._updateStepCount();
    };

    // ----- Drag and Drop logic -----
    div.addEventListener('dragstart', (e) => {
      this.draggedItem = div;
      e.dataTransfer.effectAllowed = 'move';
      div.style.opacity = '0.5';
    });

    div.addEventListener('dragend', (e) => {
      this.draggedItem = null;
      div.style.opacity = '1';
    });

    div.addEventListener('dragover', (e) => {
      e.preventDefault(); // Cho phép drop
      e.dataTransfer.dropEffect = 'move';
      
      const target = e.target.closest('.flow-step-item');
      if (target && target !== this.draggedItem) {
        const bounding = target.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        if (e.clientY - offset > 0) {
          target.style.borderBottom = '2px solid var(--color-primary)';
          target.style.borderTop = '';
        } else {
          target.style.borderTop = '2px solid var(--color-primary)';
          target.style.borderBottom = '';
        }
      }
    });

    div.addEventListener('dragleave', (e) => {
      const target = e.target.closest('.flow-step-item');
      if (target) {
        target.style.borderTop = '';
        target.style.borderBottom = '';
      }
    });

    div.addEventListener('drop', (e) => {
      e.preventDefault();
      const target = e.target.closest('.flow-step-item');
      if (target && target !== this.draggedItem) {
        target.style.borderTop = '';
        target.style.borderBottom = '';
        
        const bounding = target.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        if (e.clientY - offset > 0) {
          target.after(this.draggedItem);
        } else {
          target.before(this.draggedItem);
        }
      }
    });

    container.appendChild(div);
  }

  _updateStepCount() {
    const countEl = document.getElementById('flow-ed-step-count');
    if (countEl) {
      const items = document.querySelectorAll('#flow-ed-steps .flow-step-item');
      countEl.textContent = items.length;
    }
  }

  _handleSaveFlow() {
    const name = document.getElementById('flow-ed-name').value.trim();
    if (!name) {
      BaseModule.showToast('Vui lòng nhập tên Flow.', 'warning');
      return;
    }

    const items = document.querySelectorAll('#flow-ed-steps .flow-step-item');
    const steps = [];
    
    let hasError = false;
    items.forEach(div => {
      const scName = div.querySelector('.flow-sc-select').value;
      if (!scName) {
        hasError = true;
        return;
      }
      
      const defaultValues = {};
      div.querySelectorAll('.flow-var-input').forEach(input => {
        defaultValues[input.dataset.var] = input.value.trim();
      });

      steps.push({ scenarioName: scName, defaultValues });
    });

    if (hasError || steps.length === 0) {
      BaseModule.showToast('Flow phải có ít nhất 1 bước và mỗi bước phải chọn 1 scenario.', 'warning');
      return;
    }

    if (this.editingName && this.editingName !== name) {
      delete this.flows[this.editingName];
    }

    this.flows[name] = { steps };
    this._saveAll();
    this._renderTable();

    document.getElementById('scenario-editor-overlay').classList.remove('show');
    BaseModule.showToast(`Đã lưu Flow "${name}"`, 'success');
  }

  async _saveAll() {
    await this.saveToStorage(this.flows);
    await this.syncToFirestore(this.flows);
  }

  _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  _bindTableEvents() {
    this.containerEl.querySelectorAll('.sc-name, .flow-edit-btn').forEach(el => {
      el.onclick = () => this._openEditor(el.dataset.name);
    });

    this.containerEl.querySelectorAll('.flow-delete-btn').forEach(btn => {
      btn.onclick = () => {
        const name = btn.dataset.name;
        if (confirm(`Xóa Flow "${name}"?`)) {
          delete this.flows[name];
          this._saveAll();
          this._renderTable();
          BaseModule.showToast(`Đã xóa "${name}"`, 'success');
        }
      };
    });
  }

  _bindEvents() {
    this.containerEl.querySelector('#flow-search').oninput = (e) => {
      this.searchKeyword = e.target.value;
      this.currentPage = 1;
      this._renderTable();
    };

    this.containerEl.querySelector('#flow-create-btn').onclick = () => this._openEditor(null);
  }
}
