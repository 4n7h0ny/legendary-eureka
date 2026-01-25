chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "DOWNLOAD_AUDIO") {
    const { url, filename, fallbackUrl } = message.payload || {};
    if (!url) {
      sendResponse({ ok: false });
      return true;
    }
    chrome.downloads.download(
      {
        url,
        filename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError || !downloadId) {
          if (fallbackUrl) {
            chrome.downloads.download({ url: fallbackUrl, filename });
          }
          sendResponse({ ok: false });
          return;
        }
        sendResponse({ ok: true, downloadId });
      }
    );
    return true;
  }

  if (message.type === "AUDIO_READY" && sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, {
      type: "AUDIO_READY",
      payload: message.payload,
    });
  }
});
