/**
 * FlowSequencer.js
 * Quản lý việc thực thi một luồng (flow) tuần tự.
 * Hỗ trợ các tính năng tạm dừng, tiếp tục, báo lỗi, thử lại (retry), và bỏ qua (skip).
 */
window.FlowSequencer = class {
  constructor(steps, fnSend, fnWait, onProgress, onError, logPrefix = "FlowSequencer") {
    this.steps = steps; // Mảng các object chứa text, label
    this.fnSend = fnSend;
    this.fnWait = fnWait;
    this.onProgress = onProgress;
    this.onError = onError;
    this.logPrefix = logPrefix;

    this.currentIndex = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.stopped = true;
  }

  /**
   * Bắt đầu thực thi flow.
   * @param {Function} onComplete Callback gọi khi toàn bộ flow hoàn thành.
   * @param {number} startIndex Bước bắt đầu (tùy chọn)
   */
  async start(onComplete, startIndex = 0) {
    if (this.steps.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    this.onComplete = onComplete;
    this.stopped = false;
    this.isRunning = true;
    this.isPaused = false;
    this.currentIndex = startIndex;
    
    console.log(`🚀 [${this.logPrefix}] Bắt đầu thực thi ${this.steps.length} steps từ vị trí ${this.currentIndex}.`);
    this._runLoop();
  }

  /** Tạm dừng quá trình thực thi */
  pause() {
    console.log(`⏸ [${this.logPrefix}] Tạm dừng.`);
    this.isPaused = true;
  }

  /** Tiếp tục thực thi sau khi đã pause */
  resume() {
    if (this.stopped) return;
    console.log(`▶️ [${this.logPrefix}] Tiếp tục.`);
    this.isPaused = false;
    if (!this.isRunning) {
      this.isRunning = true;
      this._runLoop();
    }
  }

  /** Dừng hẳn việc thực thi, không thể resume */
  stop() {
    console.log(`🛑 [${this.logPrefix}] Dừng hẳn.`);
    this.stopped = true;
    this.isRunning = false;
    this.isPaused = false;
  }

  /** Bỏ qua step hiện tại đang bị lỗi và đi tiếp */
  skip() {
    if (this.stopped) return;
    console.log(`⏭ [${this.logPrefix}] Bỏ qua step ${this.currentIndex}.`);
    
    // Đánh dấu step hiện tại là skipped
    if (this.onProgress) {
      this.onProgress(this.currentIndex, this.steps.length, 'skipped');
    }
    
    this.currentIndex++;
    this.resume();
  }

  /** Thử lại step hiện tại đang bị lỗi */
  retry() {
    if (this.stopped) return;
    console.log(`🔄 [${this.logPrefix}] Thử lại step ${this.currentIndex}.`);
    this.resume();
  }

  /** Vòng lặp chính xử lý từng bước của flow */
  async _runLoop() {
    while (this.currentIndex < this.steps.length) {
      if (this.stopped) return;
      if (this.isPaused) {
        this.isRunning = false;
        return; // Thoát vòng lặp, chờ resume() gọi lại _runLoop()
      }

      const step = this.steps[this.currentIndex];
      
      try {
        console.log(`⏳ [${this.logPrefix}] Gửi step ${this.currentIndex}:`, step.label || step.text.substring(0, 30));
        
        // Gọi callback cập nhật trạng thái
        if (this.onProgress) {
          this.onProgress(this.currentIndex, this.steps.length, 'running');
        }
        
        // Gửi nội dung
        await this.fnSend(step.text);
        
        // Chờ phản hồi từ AI
        await this.fnWait();
        
        // Thành công
        if (this.onProgress) {
          this.onProgress(this.currentIndex, this.steps.length, 'success');
        }
        
        this.currentIndex++;
      } catch (err) {
        console.error(`❌ [${this.logPrefix}] Lỗi tại step ${this.currentIndex}:`, err);
        
        // Tạm dừng để chờ quyết định (retry/skip) từ UI
        this.isPaused = true;
        this.isRunning = false;
        
        if (this.onProgress) {
          this.onProgress(this.currentIndex, this.steps.length, 'error');
        }
        
        if (this.onError) {
          this.onError(this.currentIndex, err);
        }
        
        return; // Dừng vòng lặp chờ user action
      }
    }

    // Xử lý khi hoàn thành tất cả
    console.log(`✅ [${this.logPrefix}] Đã hoàn thành tất cả steps.`);
    this.stopped = true;
    this.isRunning = false;
    
    if (this.onProgress) {
      this.onProgress(this.currentIndex, this.steps.length, 'done');
    }
    
    if (this.onComplete) {
      this.onComplete();
    }
  }
};
