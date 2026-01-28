chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "download-audio") {
    return false;
  }

  const { url, filename, saveAs } = message;

  chrome.downloads.download(
    {
      url,
      filename: filename || "chatgpt-read-aloud.mp3",
      saveAs: Boolean(saveAs),
      conflictAction: "uniquify"
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      sendResponse({ ok: true, downloadId });
    }
  );

  return true;
});
