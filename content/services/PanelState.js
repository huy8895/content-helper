/* ========= PanelState (save / load) ========= */
window.PanelState =  class  {
  /* key = tên panel, data = object tuỳ ý */
  static save(key, data) {
    chrome.storage.local.set({ ['panelState__' + key]: data });
  }
  static load(key, cb) {
    chrome.storage.local.get('panelState__' + key, (res) =>
        cb(res['panelState__' + key] || null)
    );
  }
  static clear(key) {
    chrome.storage.local.remove('panelState__' + key);
  }
}