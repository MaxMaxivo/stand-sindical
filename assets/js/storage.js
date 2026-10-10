(function attachStorage(global) {
  const KEY = "stand-sindical-state-v1";

  function load() {
    try {
      return JSON.parse(global.localStorage.getItem(KEY));
    } catch (error) {
      return null;
    }
  }

  function save(state) {
    global.localStorage.setItem(KEY, JSON.stringify(state));
  }

  function downloadText(filename, text, mimeType) {
    const blob = new Blob([text], { type: mimeType || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function deviceId() {
    const deviceKey = "stand-sindical-device-id";
    let id = global.localStorage.getItem(deviceKey);
    if (!id) {
      id = global.crypto && global.crypto.randomUUID
        ? global.crypto.randomUUID()
        : `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      global.localStorage.setItem(deviceKey, id);
    }
    return id;
  }

  global.StandStorage = { load, save, downloadText, deviceId };
})(typeof window !== "undefined" ? window : globalThis);
