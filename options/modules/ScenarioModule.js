/**
 * ScenarioModule – Quản lý Scenario Templates trên trang Options.
 * Kế thừa BaseModule. Hỗ trợ: danh sách + phân trang + tìm kiếm + editor modal.
 */
class ScenarioModule extends BaseModule {
  constructor() {
    super('main-content', 'scenarioTemplates', 'configs');
    this.scenarios = {};
    this.filteredNames = [];
    this.currentPage = 1;
    this.perPage = 8;
    this.searchKeyword = '';
    this.selectedGroup = '';
    this.editingName = null; // null = tạo mới, string = đang sửa
  }

  /**
   * Render giao diện module Scenario.
   */
  async render() {
    this.scenarios = await this.loadFromStorage();
    this.filteredNames = Object.keys(this.scenarios);
    this.currentPage = 1;

    const html = `
      <div class="module-section">
        <div class="page-header">
          <h2>📝 Quản lý Kịch bản</h2>
          <p>Tạo, chỉnh sửa và quản lý các scenario template cho AI chat.</p>
        </div>

        <div class="card">
          <div class="scenario-list-header">
            <div style="display:flex;gap:12px;flex:1;max-width:480px">
              <div class="search-box" style="max-width:none;flex:1">
                <span class="search-icon">🔍</span>
                <input type="text" id="sc-search" placeholder="Tìm kịch bản...">
              </div>
              <select id="sc-group-filter" class="form-select" style="width:160px;height:36px;font-size:12px;padding:0 10px;color:var(--color-text-secondary)">
                <option value="">Tất cả các nhóm</option>
                ${this._buildGroupOptions()}
              </select>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" id="sc-create-btn">➕ Tạo mới</button>
              <button class="btn btn-secondary btn-sm" id="sc-export-btn">📤 Export JSON</button>
              <label class="btn btn-ghost btn-sm" style="cursor:pointer">
                📥 Import
                <input type="file" id="sc-import-file" accept=".json" style="display:none">
              </label>
            </div>
          </div>

          <div id="sc-table-wrapper"></div>
          <div id="sc-pagination"></div>
        </div>
      </div>
    `;

    this.containerEl.innerHTML = html;
    this._renderTable();
    this._bindEvents();
  }

  /**
   * Render bảng danh sách scenario + phân trang.
   */
  _renderTable() {
    // Refresh group filter (nếu có nhóm mới được tạo/xóa)
    this._refreshGroupFilter();

    // Lọc theo keyword & group
    const keyword = this.searchKeyword.toLowerCase();
    const filterGroup = this.selectedGroup;

    this.filteredNames = Object.keys(this.scenarios).filter(name => {
      const scenario = this.scenarios[name];
      const group = (typeof scenario === 'object' && !Array.isArray(scenario)) ? (scenario.group || '') : '';
      
      if (filterGroup && group !== filterGroup) return false;
      if (!keyword) return true;
      
      return name.toLowerCase().includes(keyword) || group.toLowerCase().includes(keyword);
    });

    // Phân trang
    const totalPages = Math.max(1, Math.ceil(this.filteredNames.length / this.perPage));
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * this.perPage;
    const pageItems = this.filteredNames.slice(startIdx, startIdx + this.perPage);

    const wrapper = this.containerEl.querySelector('#sc-table-wrapper');

    if (this.filteredNames.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <h4>Chưa có kịch bản nào</h4>
          <p>Bấm "Tạo mới" để bắt đầu hoặc Import từ file JSON.</p>
        </div>
      `;
      this.containerEl.querySelector('#sc-pagination').innerHTML = '';
      return;
    }

    let tableHTML = `
      <table class="scenario-table">
        <thead>
          <tr>
            <th style="width:40%">Tên kịch bản</th>
            <th style="width:15%">Nhóm</th>
            <th style="width:15%">Số câu hỏi</th>
            <th style="width:30%;text-align:right">Hành động</th>
          </tr>
        </thead>
        <tbody>
    `;

    pageItems.forEach(name => {
      const raw = this.scenarios[name];
      const group = (typeof raw === 'object' && !Array.isArray(raw)) ? (raw.group || '') : '';
      const questions = Array.isArray(raw) ? raw : (raw.questions || []);

      tableHTML += `
        <tr>
          <td><span class="sc-name" data-name="${this._escapeHTML(name)}">${this._escapeHTML(name)}</span></td>
          <td>${group ? `<span class="sc-group">${this._escapeHTML(group)}</span>` : '<span style="color:var(--color-text-muted)">—</span>'}</td>
          <td style="font-weight:600">${questions.length}</td>
          <td>
            <div class="sc-actions">
              <button class="btn btn-secondary btn-xs sc-edit-btn" data-name="${this._escapeHTML(name)}">✏️ Sửa</button>
              <button class="btn btn-danger btn-xs sc-delete-btn" data-name="${this._escapeHTML(name)}">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    });

    tableHTML += '</tbody></table>';
    wrapper.innerHTML = tableHTML;

    // Render phân trang
    this._renderPagination(totalPages);
    this._bindTableEvents();
  }

  /**
   * Render nút phân trang.
   * @param {number} totalPages
   */
  _renderPagination(totalPages) {
    const el = this.containerEl.querySelector('#sc-pagination');
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
        <span class="pagination-info">Hiển thị ${start}–${end} / ${total} kịch bản</span>
        <div class="pagination-btns">${btnsHTML}</div>
      </div>
    `;

    // Bind pagination events
    el.querySelectorAll('[data-page]').forEach(btn => {
      btn.onclick = () => {
        this.currentPage = parseInt(btn.dataset.page);
        this._renderTable();
      };
    });
  }

  /**
   * Mở editor modal (tạo mới hoặc chỉnh sửa).
   * @param {string|null} name - null = tạo mới
   */
  _openEditor(name = null) {
    this.editingName = name;
    const overlay = document.getElementById('scenario-editor-overlay');
    const titleEl = document.getElementById('editor-title');
    const body = document.getElementById('editor-body');

    titleEl.textContent = name ? `✏️ Sửa: ${name}` : '➕ Tạo kịch bản mới';

    // Lấy dữ liệu
    let scenarioName = name || '';
    let group = '';
    let questions = [];
    if (name && this.scenarios[name]) {
      const raw = this.scenarios[name];
      group = (typeof raw === 'object' && !Array.isArray(raw)) ? (raw.group || '') : '';
      questions = Array.isArray(raw) ? raw : (raw.questions || []);
    }

    body.innerHTML = `
      <!-- Cột trái: Metadata -->
      <div class="editor-sidebar">
        <div class="meta-section-title">Thông tin</div>
        <div class="form-group">
          <label class="form-label">Tên kịch bản</label>
          <input type="text" class="form-input" id="ed-name" value="${this._escapeHTML(scenarioName)}"
            placeholder="Tên kịch bản" ${name ? 'readonly style="opacity:0.6;cursor:not-allowed"' : ''}>
        </div>
        <div class="form-group">
          <label class="form-label">Nhóm</label>
          <input type="text" class="form-input" id="ed-group" value="${this._escapeHTML(group)}"
            placeholder="podcast / video / blog">
        </div>
        <div class="meta-section-title" style="margin-top:8px">Thống kê</div>
        <div class="meta-stat">
          <span>Số câu hỏi</span>
          <strong id="ed-question-count">${questions.length}</strong>
        </div>
      </div>

      <!-- Cột phải: Danh sách câu hỏi -->
      <div class="editor-main">
        <div class="editor-main-header">
          <div class="form-label">Danh sách câu hỏi</div>
          <button class="btn btn-ghost btn-xs" id="ed-add-question" style="height:26px;font-size:11px;gap:4px">
            <span style="font-size:13px">+</span> Thêm
          </button>
        </div>
        <div class="editor-questions custom-scroll" id="ed-questions"></div>
      </div>
    `;

    // Render questions
    const qContainer = body.querySelector('#ed-questions');
    questions.forEach(q => this._addQuestionToEditor(qContainer, q));

    // Bind thêm câu hỏi
    body.querySelector('#ed-add-question').onclick = () => {
      this._addQuestionToEditor(qContainer, { text: '', type: 'text' });
      this._updateQuestionCount();
      // Auto-scroll xuống cuối
      qContainer.scrollTop = qContainer.scrollHeight;
    };

    overlay.classList.add('show');
  }

  /**
   * Thêm một question item vào editor.
   * @param {HTMLElement} container
   * @param {Object} q - {text, type, loopKey}
   */
  _addQuestionToEditor(container, q) {
    const div = document.createElement('div');
    div.className = 'question-item-opt';

    const loopHidden = (q.type === 'loop' || q.type === 'list') ? '' : 'hidden';

    div.innerHTML = `
      <textarea placeholder="Câu hỏi... (VD: \${topic|AI,Tech} hoặc \${name})">${this._escapeHTML(q.text || '')}</textarea>
      <div class="question-controls">
        <select>
          <option value="text" ${q.type === 'text' ? 'selected' : ''}>TEXT</option>
          <option value="variable" ${q.type === 'variable' ? 'selected' : ''}>VARIABLE</option>
          <option value="loop" ${q.type === 'loop' ? 'selected' : ''}>LOOP</option>
          <option value="list" ${q.type === 'list' ? 'selected' : ''}>LIST</option>
        </select>
        <input type="text" class="ed-loopkey ${loopHidden}"
          placeholder="Loop key" value="${this._escapeHTML(q.loopKey || '')}"
          style="height:24px;font-size:10px;padding:0 6px;flex:1;border:1px solid var(--color-border);border-radius:4px;outline:none;background:var(--color-bg);font-family:inherit">
        <button class="btn btn-ghost btn-xs ed-remove-q" style="height:22px;width:22px;padding:0;color:var(--color-text-muted);font-size:11px;border:none" title="Xóa">✕</button>
      </div>
    `;

    // Toggle loopKey visibility
    div.querySelector('select').onchange = (e) => {
      const lk = div.querySelector('.ed-loopkey');
      if (e.target.value === 'loop' || e.target.value === 'list') {
        lk.classList.remove('hidden');
      } else {
        lk.classList.add('hidden');
      }
    };

    // Xóa question
    div.querySelector('.ed-remove-q').onclick = () => {
      div.remove();
      this._updateQuestionCount();
    };

    container.appendChild(div);
  }

  /**
   * Cập nhật số câu hỏi hiển thị trên sidebar.
   */
  _updateQuestionCount() {
    const countEl = document.getElementById('ed-question-count');
    if (countEl) {
      const items = document.querySelectorAll('#ed-questions .question-item-opt');
      countEl.textContent = items.length;
    }
  }

  /**
   * Thu thập dữ liệu từ editor modal.
   * @returns {Object|null}
   */
  _collectEditor() {
    const name = document.getElementById('ed-name').value.trim();
    const group = document.getElementById('ed-group').value.trim();

    if (!name) {
      BaseModule.showToast('Vui lòng nhập tên kịch bản.', 'warning');
      return null;
    }

    const items = document.querySelectorAll('#ed-questions .question-item-opt');
    const questions = Array.from(items).map(div => {
      const text = div.querySelector('textarea').value.trim();
      const type = div.querySelector('select').value;
      const loopKey = div.querySelector('.ed-loopkey')?.value.trim() || undefined;
      return { text, type, loopKey };
    }).filter(q => q.text);

    if (!questions.length) {
      BaseModule.showToast('Cần ít nhất một câu hỏi.', 'warning');
      return null;
    }

    return { name, data: { group, questions } };
  }

  /**
   * Lưu + sync toàn bộ scenario.
   */
  async _saveAll() {
    await this.saveToStorage(this.scenarios);
    await this.syncToFirestore(this.scenarios);
  }

  /**
   * Export toàn bộ scenarios ra file JSON.
   */
  _exportAll() {
    const blob = new Blob([JSON.stringify(this.scenarios, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenarios_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    BaseModule.showToast('Đã export file JSON.', 'success');
  }

  /**
   * Import scenarios từ file JSON.
   * @param {File} file
   */
  _importFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (typeof imported !== 'object' || Array.isArray(imported)) {
          throw new Error('File JSON không hợp lệ.');
        }

        const count = Object.keys(imported).length;
        if (!confirm(`Import ${count} kịch bản? Các kịch bản trùng tên sẽ bị ghi đè.`)) return;

        this.scenarios = { ...this.scenarios, ...imported };
        await this._saveAll();
        this._renderTable();
        BaseModule.showToast(`Đã import ${count} kịch bản.`, 'success');
      } catch (err) {
        BaseModule.showToast('Lỗi: File JSON không hợp lệ.', 'error');
        console.error('Import error:', err);
      }
    };
    reader.readAsText(file);
  }

  /**
   * Escape HTML entities.
   * @param {string} str
   * @returns {string}
   */
  _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /** Bind events cho bảng (sau mỗi lần render) */
  _bindTableEvents() {
    // Click tên → mở editor
    this.containerEl.querySelectorAll('.sc-name, .sc-edit-btn').forEach(el => {
      el.onclick = () => this._openEditor(el.dataset.name);
    });

    // Xóa
    this.containerEl.querySelectorAll('.sc-delete-btn').forEach(btn => {
      btn.onclick = () => {
        const name = btn.dataset.name;
        if (confirm(`Xóa kịch bản "${name}"?`)) {
          delete this.scenarios[name];
          this._saveAll();
          this._renderTable();
          BaseModule.showToast(`Đã xóa "${name}"`, 'success');
        }
      };
    });
  }

  /** Bind events chính */
  _bindEvents() {
    // Search
    this.containerEl.querySelector('#sc-search').oninput = (e) => {
      this.searchKeyword = e.target.value;
      this.currentPage = 1;
      this._renderTable();
    };

    // Filter Group
    this.containerEl.querySelector('#sc-group-filter').onchange = (e) => {
      this.selectedGroup = e.target.value;
      this.currentPage = 1;
      this._renderTable();
    };

    // Tạo mới
    this.containerEl.querySelector('#sc-create-btn').onclick = () => this._openEditor(null);

    // Export
    this.containerEl.querySelector('#sc-export-btn').onclick = () => this._exportAll();

    // Import
    this.containerEl.querySelector('#sc-import-file').onchange = (e) => {
      if (e.target.files[0]) this._importFile(e.target.files[0]);
      e.target.value = ''; // reset
    };

    // Editor: Close / Cancel
    document.getElementById('editor-close').onclick = () => {
      document.getElementById('scenario-editor-overlay').classList.remove('show');
    };
    document.getElementById('editor-cancel').onclick = () => {
      document.getElementById('scenario-editor-overlay').classList.remove('show');
    };

    // Editor: Save
    document.getElementById('editor-save').onclick = () => {
      const result = this._collectEditor();
      if (!result) return;

      // Nếu đang sửa tên cũ khác tên mới → xóa cũ
      if (this.editingName && this.editingName !== result.name) {
        delete this.scenarios[this.editingName];
      }

      this.scenarios[result.name] = result.data;
      this._saveAll();
      this._renderTable();

      document.getElementById('scenario-editor-overlay').classList.remove('show');
      BaseModule.showToast(`Đã lưu kịch bản "${result.name}"`, 'success');
    };

    // Click overlay background → đóng
    document.getElementById('scenario-editor-overlay').onclick = (e) => {
      if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove('show');
      }
    };
  }

  /**
   * Trả về HTML options cho thẻ select lọc nhóm.
   */
  _buildGroupOptions() {
    const groups = new Set();
    Object.values(this.scenarios).forEach(sc => {
      const g = (typeof sc === 'object' && !Array.isArray(sc)) ? (sc.group || '') : '';
      if (g) groups.add(g);
    });
    return Array.from(groups).sort().map(g => `<option value="${this._escapeHTML(g)}">${this._escapeHTML(g)}</option>`).join('');
  }

  /**
   * Cập nhật danh sách nhóm trong dropdown (dùng khi vừa thêm/sửa/xóa).
   */
  _refreshGroupFilter() {
    const select = this.containerEl.querySelector('#sc-group-filter');
    if (select) {
      const currentVal = this.selectedGroup;
      // Tránh việc ghi đè HTML gây mất focus nếu người dùng đang thao tác
      if (document.activeElement === select) return; 
      
      select.innerHTML = `<option value="">Tất cả các nhóm</option>` + this._buildGroupOptions();
      // Phục hồi lại giá trị đang được chọn
      select.value = currentVal;
    }
  }
}
