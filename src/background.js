chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "download-audio") {
    return false;
  }

  chrome.downloads.download(
    {
      url: message.url,
      filename: message.filename,
      saveAs: true
    },
    (downloadId) => {
      sendResponse({ ok: Boolean(downloadId) });
    }
  );

  return true;
});
