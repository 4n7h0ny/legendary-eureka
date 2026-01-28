chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "downloadAudio") {
    return;
  }

  const url = message.url;
  if (!url) {
    return;
  }

  chrome.downloads.download(
    {
      url,
      filename: message.filename || "chatgpt-read-aloud.mp3",
      saveAs: true
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Download failed", chrome.runtime.lastError);
      }
    }
  );
});
