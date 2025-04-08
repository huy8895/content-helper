function insertHelperButton() {
  const chatInputContainer = document.querySelector("form textarea")?.closest("form");
  if (!chatInputContainer || document.getElementById("chatgpt-helper-button")) return;

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "6px";

  const button1 = document.createElement("button");
  button1.id = "chatgpt-helper-button";
  button1.textContent = "🛠 Soạn kịch bản";
  button1.style.cssText = `
    margin-top: 8px;
    padding: 6px 12px;
    background-color: #10a37f;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  `;

  const button2 = document.createElement("button");
  button2.id = "chatgpt-run-button";
  button2.textContent = "📤 Chạy kịch bản";
  button2.style.cssText = `
    padding: 6px 12px;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  `;

  button1.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const existingBox = document.getElementById("scenario-builder");
    if (existingBox) {
      existingBox.remove();
      return;
    }
    showScenarioBuilderUI();
  };

  button2.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const existingBox = document.getElementById("scenario-runner");
    if (existingBox) {
      existingBox.remove();
      return;
    }
    showScenarioRunnerUI();
  };

  container.appendChild(button1);
  container.appendChild(button2);
  chatInputContainer.appendChild(container);
}

function showScenarioBuilderUI() {
  const container = document.createElement("div");
  container.id = "scenario-builder";
  container.innerHTML = `
    <div class="helper-box">
      <h2>Tạo kịch bản mới 🎬</h2>
      <input type="text" id="scenario-name" placeholder="Tên kịch bản" />
      <div id="questions-container"></div>
      <button id="add-question">+ Thêm câu hỏi</button>
      <br/><br/>
      <button id="export-json">📦 Xuất JSON</button>
      <button id="save-to-storage">💾 Lưu vào trình duyệt</button>
      <button id="import-json">📂 Nhập JSON</button>
      <input type="file" id="json-file-input" accept=".json" style="display:none;" />
      <pre id="json-preview"></pre>
    </div>
  `;
  document.body.appendChild(container);

  document.getElementById("add-question").onclick = () => {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Câu hỏi...";
    input.className = "question-input";
    document.getElementById("questions-container").appendChild(input);
  };

  function generateScenarioJSON() {
    const name = document.getElementById("scenario-name").value.trim();
    const inputs = document.querySelectorAll(".question-input");
    const questions = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
    if (!name || questions.length === 0) {
      alert("Vui lòng nhập tên kịch bản và ít nhất một câu hỏi.");
      return;
    }
    const json = { [name]: questions };
    document.getElementById("json-preview").textContent = JSON.stringify(json, null, 2);
    return json;
  }

  document.getElementById("export-json").onclick = () => {
    const json = generateScenarioJSON();
    if (!json) return;
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenario-template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById("save-to-storage").onclick = () => {
    const json = generateScenarioJSON();
    if (!json) return;
    chrome.storage.local.set({ scenarioTemplates: json }, () => {
      alert("Đã lưu kịch bản vào trình duyệt.");
    });
  };

  document.getElementById("import-json").onclick = () => {
    document.getElementById("json-file-input").click();
  };

  document.getElementById("json-file-input").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const data = JSON.parse(event.target.result);
        const name = Object.keys(data)[0];
        const questions = data[name];
        document.getElementById("scenario-name").value = name;
        const container = document.getElementById("questions-container");
        container.innerHTML = "";
        questions.forEach(q => {
          const input = document.createElement("input");
          input.type = "text";
          input.placeholder = "Câu hỏi...";
          input.className = "question-input";
          input.value = q;
          container.appendChild(input);
        });
        document.getElementById("json-preview").textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        alert("Tệp JSON không hợp lệ.");
      }
    };
    reader.readAsText(file);
  };
}

function showScenarioRunnerUI() {
  const existing = document.getElementById("scenario-runner");
  if (existing) existing.remove();

  const div = document.createElement("div");
  div.id = "scenario-runner";
  div.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: white;
    border: 1px solid #ccc;
    padding: 12px;
    border-radius: 10px;
    z-index: 9999;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;

  div.innerHTML = `
    <label for="scenario-select">Chọn kịch bản:</label>
    <select id="scenario-select"></select>
    <button id="start-scenario">▶️ Bắt đầu</button>
  `;

  document.body.appendChild(div);

  const select = document.getElementById("scenario-select");
  chrome.storage.local.get(null, (items) => {
    const templates = items["scenarioTemplates"] || {};
    Object.entries(templates).forEach(([name]) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
  });

  document.getElementById("start-scenario").onclick = () => {
    const selected = select.value;
    alert("Bạn chọn kịch bản: " + selected + " (Gửi từng câu sẽ thêm ở bước sau)");
  };
}

const observer = new MutationObserver(() => insertHelperButton());
observer.observe(document.body, { childList: true, subtree: true });
