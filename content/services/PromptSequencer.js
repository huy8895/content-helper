/****************************************
 * PromptSequencer – run prompts in order
 * --------------------------------------
 *  new PromptSequencer(list, sendFn, waitFn, onStep?)
 *      .start()   .pause()   .resume()   .stop()
 ****************************************/
window.PromptSequencer = class {
  constructor(prompts, send, wait, onStep = () => {
  }, scenarioName = "Unknown Scenario", silent = false) {
    this.prompts = prompts;
    this.send = send;
    this.wait = wait;
    this.onStep = onStep;
    this.scenarioName = scenarioName;  // 👈 lưu tên kịch bản
    this.silent = silent;

    this.idx = 0;
    this.paused = false;
    this.stopped = false;
  }

  async _run() {
    let wasStoppedManually = false;
    while (this.idx < this.prompts.length && !this.stopped) {
      if (this.paused) {
        await new Promise(r => (this._resume = r));
        continue;
      }
      try {
        console.log(`▶ [PromptSequencer] Đang gửi prompt #${this.idx + 1}/${this.prompts.length}:`, this.prompts[this.idx]);
        await this.send(this.prompts[this.idx]);
        console.log(`⏳ [PromptSequencer] Đang chờ phản hồi prompt #${this.idx + 1}...`);
        await this.wait();
        console.log(`✅ [PromptSequencer] Đã hoàn thành prompt #${this.idx + 1}`);
        this.idx++;
        this.onStep(this.idx, this.prompts.length);
      } catch (stepErr) {
        console.error(`❌ [PromptSequencer] Lỗi tại prompt #${this.idx + 1}:`, stepErr);
        ContentHelper.showToast(`Lỗi tại bước #${this.idx + 1}: ${stepErr.message || stepErr}`, "error");
        break;
      }
    }

    if (this.stopped) {
      wasStoppedManually = true;
    }

    if (!wasStoppedManually) {
      if (!this.silent) {
        console.log("🔔start Gửi thông báo")
        // Gửi thông báo kèm tên kịch bản/action
        chrome.runtime.sendMessage({
          type: "SHOW_NOTIFICATION",
          title: "Scenario Completed",
          message: `Scenario "${this.scenarioName}" has been completed!`
        });
        ContentHelper.showToast(`Scenario "${this.scenarioName}" has been completed!`, "success");
      }
      // QUAN TRỌNG: Đánh dấu là đã dừng để _isBusy() trả về false
      this.stopped = true;
    }
    
    return wasStoppedManually;
  }

  start(onDone) {
    this.stopped = false;
    this.paused = false;
    return this._run().then((wasStoppedManually) => {
      if (!wasStoppedManually) onDone?.();
    });
  }

  pause() {
    this.paused = true;
  }

  resume() {
    if (this.paused) {
      this.paused = false;
      this._resume?.();
    }
  }

  stop() {
    this.stopped = true;
  }
}