function insertHelperButton() {
  const chatInputContainer = document.querySelector("form textarea")?.closest(
      "form");
  if (!chatInputContainer || document.getElementById(
      "chatgpt-helper-button")) {
    return;
  }

  const button = document.createElement("button");
  button.id = "chatgpt-helper-button";
  button.textContent = "✏️ Content Helper";
  button.style.cssText = `
    margin-top: 8px;
    padding: 6px 12px;
    background-color: #10a37f;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  `;

  button.onclick = (event) => {
    event.preventDefault(); // ✅ Ngăn form gửi tin nhắn
    event.stopPropagation(); // ✅ Ngăn sự kiện lan ra ngoài (đề phòng)

    const existingBox = document.getElementById("scenario-builder");
    if (existingBox) {
      existingBox.remove();
      return;
    }
    showScenarioBuilderUI();
  };

  chatInputContainer.appendChild(button);
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
    const questions = Array.from(inputs).map(i => i.value.trim()).filter(
        Boolean);

    if (!name || questions.length === 0) {
      alert("Vui lòng nhập tên kịch bản và ít nhất một câu hỏi.");
      return;
    }

    const json = {[name]: questions};
    document.getElementById("json-preview").textContent = JSON.stringify(json,
        null, 2);
    return json;
  }

  document.getElementById("export-json").onclick = () => {
    const json = generateScenarioJSON();
    if (!json) {
      return;
    }
    const blob = new Blob([JSON.stringify(json, null, 2)],
        {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scenario-template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById("save-to-storage").onclick = () => {
    const json = generateScenarioJSON();
    if (!json) {
      return;
    }
    chrome.storage.local.set({scenarioTemplates: json}, () => {
      alert("Đã lưu kịch bản vào trình duyệt.");
    });
  };

  document.getElementById("import-json").onclick = () => {
    document.getElementById("json-file-input").click();
  };

  document.getElementById("json-file-input").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
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
        document.getElementById("json-preview").textContent = JSON.stringify(
            data, null, 2);
      } catch (err) {
        alert("Tệp JSON không hợp lệ.");
      }
    };
    reader.readAsText(file);
  };
}

const observer = new MutationObserver(() => insertHelperButton());
observer.observe(document.body, {childList: true, subtree: true});
