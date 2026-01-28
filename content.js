(() => {
  const state = {
    pendingDownload: false,
    lastClickedAt: 0,
    audioCounter: 0,
    observer: null
  };

  const READ_ALOUD_TEXT = "Read aloud";
  const READ_ALOUD_LABELS = [
    "Read aloud",
    "Read Aloud",
    "Read Aloud message",
    "Read message aloud",
    "Listen"
  ];

  const MORE_BUTTON_SELECTORS = [
    'button[aria-label="More"]',
    'button[aria-label="More options"]',
    'button[aria-label="More actions"]',
    'button[data-testid="more-button"]',
    'button[data-testid="conversation-menu-button"]'
  ];

  const READ_ALOUD_BUTTON_SELECTORS = [
    'button[aria-label="Read aloud"]',
    'button[aria-label="Read Aloud"]',
    'button[aria-label="Read message aloud"]',
    'button[data-testid="audio-button"]'
  ];

  const DOWNLOAD_BUTTON_CLASS = "chatgpt-download-audio-button";

  const isReadAloudButton = (button) => {
    if (!button || button.tagName !== "BUTTON") {
      return false;
    }

    const label = button.getAttribute("aria-label") || button.getAttribute("title") || "";
    const normalized = label.trim();

    if (READ_ALOUD_LABELS.includes(normalized)) {
      return true;
    }

    return READ_ALOUD_BUTTON_SELECTORS.some((selector) => button.matches(selector));
  };

  const findMoreButtons = () => {
    const buttons = [];
    MORE_BUTTON_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((button) => {
        if (button instanceof HTMLButtonElement) {
          buttons.push(button);
        }
      });
    });
    return buttons;
  };

  const buildFilename = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    state.audioCounter += 1;
    return `chatgpt-read-aloud-${timestamp}-${state.audioCounter}.mp3`;
  };

  const requestDownload = (src) => {
    if (!src || !chrome?.runtime?.sendMessage) {
      return;
    }

    chrome.runtime.sendMessage({
      type: "downloadAudio",
      url: src,
      filename: buildFilename()
    });
  };

  const triggerDownload = (audioElement) => {
    if (!audioElement) {
      return;
    }

    const src = audioElement.currentSrc || audioElement.src;
    if (!src) {
      return;
    }

    requestDownload(src);
  };

  const onReadAloudClick = () => {
    state.pendingDownload = true;
    state.lastClickedAt = Date.now();
  };

  const shouldDownload = () => {
    if (!state.pendingDownload) {
      return false;
    }

    const elapsed = Date.now() - state.lastClickedAt;
    if (elapsed > 15000) {
      state.pendingDownload = false;
      return false;
    }

    return true;
  };

  const handleAudioElement = (audioElement) => {
    if (!shouldDownload()) {
      return;
    }

    state.pendingDownload = false;
    triggerDownload(audioElement);
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

  const findClosestMessageContainer = (button) =>
    button?.closest("article") ||
    button?.closest("div[data-message-id]") ||
    button?.closest("div[class*='message']");

  const openMenuAndClickReadAloud = (moreButton, container) => {
    if (!moreButton) {
      return;
    }

    moreButton.click();

    setTimeout(() => {
      const menuItemCandidates = Array.from(
        document.querySelectorAll("[role='menuitem'], button, div")
      );
      const menuItem = menuItemCandidates.find((item) => {
        if (!(item instanceof HTMLElement)) {
          return false;
        }
        const text = item.textContent?.trim() || "";
        return text === READ_ALOUD_TEXT || text === "Read Aloud";
      });

      if (menuItem) {
        menuItem.click();
        return;
      }

      if (container) {
        const directButton = container.querySelector(
          READ_ALOUD_BUTTON_SELECTORS.join(",")
        );
        if (directButton instanceof HTMLButtonElement) {
          directButton.click();
        }
      }
    }, 150);
  };

  const handleDownloadButtonClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const container = findClosestMessageContainer(button);
    const moreButton = container
      ? container.querySelector(MORE_BUTTON_SELECTORS.join(","))
      : findMoreButtons()[0];

    onReadAloudClick();
    openMenuAndClickReadAloud(moreButton, container);
  };

  const createDownloadButton = () => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = DOWNLOAD_BUTTON_CLASS;
    button.textContent = "Download audio";
    button.style.marginLeft = "6px";
    button.style.padding = "4px 8px";
    button.style.borderRadius = "6px";
    button.style.border = "1px solid rgba(0, 0, 0, 0.15)";
    button.style.background = "transparent";
    button.style.fontSize = "12px";
    button.style.cursor = "pointer";
    button.addEventListener("click", handleDownloadButtonClick);
    return button;
  };

  const ensureDownloadButtons = () => {
    findMoreButtons().forEach((moreButton) => {
      const parent = moreButton.parentElement;
      if (!parent) {
        return;
      }

      if (parent.querySelector(`.${DOWNLOAD_BUTTON_CLASS}`)) {
        return;
      }

      const downloadButton = createDownloadButton();
      parent.insertBefore(downloadButton, moreButton.nextSibling);
    });
  };

  const setupMutationObserver = () => {
    if (state.observer) {
      return;
    }

    state.observer = new MutationObserver(() => {
      observeAudioPlayback();
      ensureDownloadButtons();
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true
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
        onReadAloudClick();
      }
    });
  };

  const init = () => {
    setupClickListener();
    setupMutationObserver();
    observeAudioPlayback();
    ensureDownloadButtons();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
