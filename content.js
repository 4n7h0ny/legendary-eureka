(() => {
  const AUDIO_ENDPOINT_MATCH = "/backend-api/synthesize";
  const audioStore = new Map();
  let pendingMessageElement = null;
  let pendingButtonElement = null;
  let lastAudioData = null;

  const ensureStyles = () => {
    if (document.getElementById("cgpt-audio-download-style")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "cgpt-audio-download-style";
    style.textContent = `
      .cgpt-audio-download-button {
        margin-left: 6px;
        padding: 4px 8px;
        font-size: 12px;
        border-radius: 6px;
        border: 1px solid rgba(15, 23, 42, 0.2);
        background: #ffffff;
        color: #0f172a;
        cursor: pointer;
      }
      .cgpt-audio-download-button:hover {
        background: #f1f5f9;
      }
      .cgpt-audio-download-button[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
  };

  const generateFilename = (messageId) => {
    const time = new Date();
    const stamp = time.toISOString().replace(/[:.]/g, "-");
    const suffix = messageId ? `-${messageId}` : "";
    return `chatgpt-audio-${stamp}${suffix}.mp3`;
  };

  const getMessageElement = (fromElement) => {
    if (!fromElement) {
      return null;
    }
    return (
      fromElement.closest("[data-message-id]") ||
      fromElement.closest("article") ||
      fromElement.closest("div[data-message-author-role]") ||
      fromElement.closest("div[class*='group']")
    );
  };

  const getMessageId = (messageElement) => {
    if (!messageElement) {
      return null;
    }
    if (messageElement.dataset.messageId) {
      return messageElement.dataset.messageId;
    }
    if (!messageElement.dataset.audioDownloadId) {
      messageElement.dataset.audioDownloadId = `msg-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
    }
    return messageElement.dataset.audioDownloadId;
  };

  const recordAudioData = (data) => {
    if (!data) {
      return;
    }
    lastAudioData = data;
    if (data.messageId) {
      audioStore.set(data.messageId, data);
    }
  };

  const resolveAudioForMessage = (messageId) => {
    if (messageId && audioStore.has(messageId)) {
      return audioStore.get(messageId);
    }
    return lastAudioData;
  };

  const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

  const createDownloadButton = (messageElement, referenceButton) => {
    if (!messageElement || !referenceButton) {
      return;
    }
    const existing = messageElement.querySelector(
      ".cgpt-audio-download-button"
    );
    if (existing) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "cgpt-audio-download-button";
    button.textContent = "Download Audio";

    button.addEventListener("click", () => {
      const messageId = getMessageId(messageElement);
      const audioData = resolveAudioForMessage(messageId);
      if (!audioData) {
        button.textContent = "Audio not ready";
        button.disabled = true;
        setTimeout(() => {
          button.textContent = "Download Audio";
          button.disabled = false;
        }, 2000);
        return;
      }

      button.disabled = true;
      chrome.runtime.sendMessage(
        {
          type: "DOWNLOAD_AUDIO",
          payload: {
            url: audioData.dataUrl,
            filename: audioData.filename,
            fallbackUrl: audioData.objectUrl,
          },
        },
        (response) => {
          if (!response?.ok) {
            const anchor = document.createElement("a");
            anchor.href = audioData.objectUrl;
            anchor.download = audioData.filename;
            anchor.click();
          }
          setTimeout(() => {
            button.disabled = false;
          }, 1000);
        }
      );
    });

    referenceButton.insertAdjacentElement("afterend", button);
  };

  const scanForReadAloudButtons = (root = document) => {
    const buttons = root.querySelectorAll(
      "button[aria-label*='Read aloud'], button[aria-label*='read aloud']"
    );
    buttons.forEach((button) => {
      const messageElement = getMessageElement(button);
      if (!messageElement) {
        return;
      }
      createDownloadButton(messageElement, button);
    });
  };

  const handleReadAloudClick = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("button");
    if (!button) {
      return;
    }
    const label = button.getAttribute("aria-label") || "";
    if (!/read aloud/i.test(label)) {
      return;
    }
    pendingButtonElement = button;
    pendingMessageElement = getMessageElement(button);
  };

  const interceptFetch = () => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const requestInfo = args[0];
        const urlString =
          typeof requestInfo === "string"
            ? requestInfo
            : requestInfo?.url || "";
        if (urlString.includes(AUDIO_ENDPOINT_MATCH)) {
          const cloned = response.clone();
          const blob = await cloned.blob();
          const objectUrl = URL.createObjectURL(blob);
          const dataUrl = await blobToDataUrl(blob);
          const messageId = getMessageId(pendingMessageElement);
          const data = {
            objectUrl,
            dataUrl,
            messageId,
            filename: generateFilename(messageId),
            createdAt: Date.now(),
          };
          recordAudioData(data);

          if (pendingMessageElement && pendingButtonElement) {
            createDownloadButton(pendingMessageElement, pendingButtonElement);
          }
        }
      } catch (error) {
        console.warn("ChatGPT Audio Downloader: fetch intercept failed", error);
      }
      return response;
    };
  };

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "AUDIO_REQUEST_DETECTED") {
      if (pendingMessageElement && pendingButtonElement) {
        createDownloadButton(pendingMessageElement, pendingButtonElement);
      }
    }
  });

  ensureStyles();
  scanForReadAloudButtons();
  interceptFetch();

  document.addEventListener("click", handleReadAloudClick, true);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) {
          return;
        }
        scanForReadAloudButtons(node);
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
