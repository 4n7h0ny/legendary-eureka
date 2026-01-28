chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "downloadAudio") {
    return undefined;
  }

  const { src, filename } = message;
  if (!src) {
    sendResponse({ ok: false, error: "Missing audio source." });
    return true;
  }

  chrome.downloads.download(
    {
      url: src,
      filename: filename || "chatgpt-read-aloud.mp3",
      saveAs: true
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true, downloadId });
      }
    }
  );

  return true;
});
