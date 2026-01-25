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

  const isReadAloudButton = (button) => {
    if (!button) {
      return false;
    }
    const label = button.getAttribute("aria-label") || "";
    const title = button.getAttribute("title") || "";
    const testId = button.getAttribute("data-testid") || "";
    const text = button.textContent || "";
    return /read aloud/i.test(`${label} ${title} ${testId} ${text}`);
  };

  const getLatestAssistantMessage = () => {
    const messages = document.querySelectorAll(
      "[data-message-author-role='assistant']"
    );
    return messages.length ? messages[messages.length - 1] : null;
  };

  const findReadAloudButton = (messageElement) => {
    if (!messageElement) {
      return null;
    }
    const buttons = messageElement.querySelectorAll("button, [role='button']");
    for (const button of buttons) {
      if (isReadAloudButton(button)) {
        return button;
      }
    }
    return null;
  };

  const findToolbarContainer = (messageElement) => {
    if (!messageElement) {
      return null;
    }
    const readAloudButton = findReadAloudButton(messageElement);
    if (readAloudButton?.parentElement) {
      return readAloudButton.parentElement;
    }
    return (
      messageElement.querySelector("[role='group']") ||
      messageElement.querySelector("div[class*='items-center']") ||
      messageElement
    );
  };

  const createDownloadButton = (messageElement, referenceButton) => {
    const container =
      referenceButton?.parentElement || findToolbarContainer(messageElement);
    if (!container) {
      return;
    }
    const existing = container.querySelector(
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

    if (referenceButton?.parentElement === container) {
      referenceButton.insertAdjacentElement("afterend", button);
    } else {
      container.appendChild(button);
    }
  };

  const scanForReadAloudButtons = (root = document) => {
    const buttons = root.querySelectorAll(
      "button, [role='button']"
    );
    buttons.forEach((button) => {
      if (!isReadAloudButton(button)) {
        return;
      }
      const messageElement = getMessageElement(button);
      createDownloadButton(messageElement, button);
    });
  };

  const handleReadAloudClick = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest("button, [role='button']");
    if (!button || !isReadAloudButton(button)) {
      return;
    }
    pendingButtonElement = button;
    pendingMessageElement = getMessageElement(button);
  };

  const handleAudioBlob = async (blob) => {
    const objectUrl = URL.createObjectURL(blob);
    const dataUrl = await blobToDataUrl(blob);
    const resolvedMessageElement =
      pendingMessageElement ||
      getMessageElement(pendingButtonElement) ||
      getLatestAssistantMessage();
    const messageId = getMessageId(resolvedMessageElement);
    const data = {
      objectUrl,
      dataUrl,
      messageId,
      filename: generateFilename(messageId),
      createdAt: Date.now(),
    };
    recordAudioData(data);

    createDownloadButton(resolvedMessageElement, pendingButtonElement);
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
          await handleAudioBlob(blob);
        }
      } catch (error) {
        console.warn("ChatGPT Audio Downloader: fetch intercept failed", error);
      }
      return response;
    };
  };

  const interceptXHR = () => {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function open(method, url, ...rest) {
      this.__cgptAudioUrl = url;
      return originalOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function send(...args) {
      this.addEventListener("load", () => {
        try {
          if (!this.__cgptAudioUrl?.includes(AUDIO_ENDPOINT_MATCH)) {
            return;
          }
          let blob = null;
          if (this.response instanceof Blob) {
            blob = this.response;
          } else if (this.response instanceof ArrayBuffer) {
            blob = new Blob([this.response]);
          }
          if (blob) {
            handleAudioBlob(blob);
          }
        } catch (error) {
          console.warn("ChatGPT Audio Downloader: XHR intercept failed", error);
        }
      });
      return originalSend.apply(this, args);
    };
  };

  ensureStyles();
  scanForReadAloudButtons();
  interceptFetch();
  interceptXHR();

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
