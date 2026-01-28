(() => {
  const state = {
    pendingDownload: false,
    lastClickedAt: 0,
    audioCounter: 0,
    observer: null,
    lastAudioSrc: null,
    pendingMessage: null
  };

  const READ_ALOUD_LABELS = [
    "Read aloud",
    "Read Aloud",
    "Read Aloud message",
    "Read message aloud",
    "Listen"
  ];

  const BUTTON_SELECTORS = [
    'button[aria-label="Read aloud"]',
    'button[aria-label="Read Aloud"]',
    'button[aria-label="Read message aloud"]',
    'button[data-testid="audio-button"]'
  ];

  const MORE_BUTTON_SELECTORS = [
    'button[aria-label="More options"]',
    'button[data-testid="more-button"]'
  ];

  const DOWNLOAD_BUTTON_CLASS = "chatgpt-audio-download-button";

  const isReadAloudButton = (button) => {
    if (!button || button.tagName !== "BUTTON") {
      return false;
    }

    const label = button.getAttribute("aria-label") || button.getAttribute("title") || "";
    const normalized = label.trim();

    if (READ_ALOUD_LABELS.includes(normalized)) {
      return true;
    }

    return BUTTON_SELECTORS.some((selector) => button.matches(selector));
  };

  const buildFilename = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    state.audioCounter += 1;
    return `chatgpt-read-aloud-${timestamp}-${state.audioCounter}.mp3`;
  };

  const requestDownload = (src) => {
    if (!src || src === state.lastAudioSrc) {
      return;
    }

    state.lastAudioSrc = src;
    chrome.runtime.sendMessage({
      type: "downloadAudio",
      src,
      filename: buildFilename()
    });
  };

  const onReadAloudClick = (messageElement) => {
    state.pendingDownload = true;
    state.lastClickedAt = Date.now();
    state.pendingMessage = messageElement || null;
  };

  const shouldDownload = () => {
    if (!state.pendingDownload) {
      return false;
    }

    const elapsed = Date.now() - state.lastClickedAt;
    if (elapsed > 20000) {
      state.pendingDownload = false;
      state.pendingMessage = null;
      return false;
    }

    return true;
  };

  const handleAudioElement = (audioElement) => {
    if (!shouldDownload()) {
      return;
    }

    const src = audioElement.currentSrc || audioElement.src;
    if (!src) {
      return;
    }

    state.pendingDownload = false;
    state.pendingMessage = null;
    requestDownload(src);
  };

  const observeAudioPlayback = () => {
    const audioElements = document.querySelectorAll("audio");
    audioElements.forEach((audio) => {
      if (audio.dataset.chatgptDownloaderBound) {
        return;
      }
      audio.dataset.chatgptDownloaderBound = "true";
      audio.addEventListener("play", () => handleAudioElement(audio));
      audio.addEventListener("loadeddata", () => handleAudioElement(audio));
    });
  };

  const setupMutationObserver = () => {
    if (state.observer) {
      return;
    }

    state.observer = new MutationObserver(() => {
      injectDownloadButtons();
      observeAudioPlayback();
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  const findMessageContainer = (element) => {
    if (!element) {
      return null;
    }

    return element.closest('[data-message-author-role="assistant"]');
  };

  const findReadAloudButton = (messageElement) => {
    if (!messageElement) {
      return null;
    }

    const directButton = messageElement.querySelector(BUTTON_SELECTORS.join(","));
    if (directButton) {
      return directButton;
    }

    const buttons = messageElement.querySelectorAll("button");
    for (const button of buttons) {
      if (isReadAloudButton(button)) {
        return button;
      }
    }

    return null;
  };

  const clickReadAloudFromMenu = async (messageElement) => {
    const moreButton = messageElement.querySelector(MORE_BUTTON_SELECTORS.join(","));
    if (!moreButton) {
      return false;
    }

    moreButton.click();

    await new Promise((resolve) => setTimeout(resolve, 150));

    const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], button'));
    const readAloudItem = menuItems.find((item) => {
      const text = (item.textContent || "").trim();
      return READ_ALOUD_LABELS.some((label) => text === label || text.includes(label));
    });

    if (readAloudItem) {
      readAloudItem.click();
      return true;
    }

    return false;
  };

  const handleDownloadButtonClick = async (event) => {
    const button = event.currentTarget;
    if (!(button instanceof Element)) {
      return;
    }

    const messageElement = findMessageContainer(button);
    onReadAloudClick(messageElement);

    const readAloudButton = findReadAloudButton(messageElement);
    if (readAloudButton) {
      readAloudButton.click();
      return;
    }

    await clickReadAloudFromMenu(messageElement);
  };

  const createDownloadButton = (templateButton) => {
    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.className = templateButton.className;
    downloadButton.classList.add(DOWNLOAD_BUTTON_CLASS);
    downloadButton.setAttribute("aria-label", "Download read aloud audio");
    downloadButton.setAttribute("title", "Download read aloud audio");
    downloadButton.style.display = "inline-flex";
    downloadButton.style.alignItems = "center";
    downloadButton.style.gap = "6px";
    downloadButton.innerHTML =
      '<span style="font-size: 12px; line-height: 1;">Download audio</span>';
    downloadButton.addEventListener("click", handleDownloadButtonClick);
    return downloadButton;
  };

  const injectDownloadButtons = () => {
    const moreButtons = document.querySelectorAll(MORE_BUTTON_SELECTORS.join(","));
    moreButtons.forEach((moreButton) => {
      const messageElement = findMessageContainer(moreButton);
      if (!messageElement) {
        return;
      }

      const actionContainer = moreButton.parentElement;
      if (!actionContainer) {
        return;
      }

      if (actionContainer.querySelector(`.${DOWNLOAD_BUTTON_CLASS}`)) {
        return;
      }

      const downloadButton = createDownloadButton(moreButton);
      actionContainer.insertBefore(downloadButton, moreButton);
    });
  };

  const setupClickListener = () => {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const button = target.closest("button");
      if (isReadAloudButton(button)) {
        onReadAloudClick(findMessageContainer(button));
      }
    });
  };

  const init = () => {
    setupClickListener();
    setupMutationObserver();
    injectDownloadButtons();
    observeAudioPlayback();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
