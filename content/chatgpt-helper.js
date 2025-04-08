function insertHelperButton() {
  const chatInputContainer = document.querySelector("form textarea")?.closest("form");
  if (!chatInputContainer || document.getElementById("chatgpt-helper-button")) return;

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

  button.onclick = () => {
    alert("You clicked the content helper!");
    // Or open a custom popup, insert text into textarea, etc.
  };

  chatInputContainer.appendChild(button);
}

// Wait for the page to load fully and DOM to be ready
const observer = new MutationObserver(() => insertHelperButton());
observer.observe(document.body, { childList: true, subtree: true });
