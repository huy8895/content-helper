/****************************************
 * PromptSequencer – run prompts in order
 * --------------------------------------
 *  new PromptSequencer(list, sendFn, waitFn, onStep?)
 *      .start()   .pause()   .resume()   .stop()
 ****************************************/
window.PromptSequencer = class {
  constructor(prompts, send, wait, onStep = () => {
  }, scenarioName = "Unknown Scenario") {
    this.prompts = prompts;
    this.send = send;
    this.wait = wait;
    this.onStep = onStep;
    this.scenarioName = scenarioName;  // 👈 lưu tên kịch bản

    this.idx = 0;
    this.paused = false;
    this.stopped = false;
  }

  async _run() {
    while (this.idx < this.prompts.length && !this.stopped) {
      if (this.paused) {
        await new Promise(r => (this._resume = r));
        continue;
      }
      this.currentLabel = this.prompts[this.idx]?.label;
      await this.send(this.prompts[this.idx]);
      await this.wait();
      this.lastLabel = this.currentLabel;
      this.idx++;
      this.currentLabel = null;
      this.onStep(this.idx, this.prompts.length);
    }

    if (!this.stopped) {
      console.log("🔔start Gửi thông báo")
      // Gửi thông báo kèm tên kịch bản/action
      chrome.runtime.sendMessage({
        type: "SHOW_NOTIFICATION",
        title: "Scenario Completed",
        message: `Scenario "${this.scenarioName}" has been completed!`
      });
    }
  }

  start(onDone) {
    this.stopped = false;
    this.paused = false;
    return this._run().then(() => {
      if (!this.stopped) onDone?.();
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