(() => {
  const state = {
    pendingDownload: false,
    lastClickedAt: 0,
    audioCounter: 0,
    observer: null
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

  const triggerDownload = async (audioElement) => {
    if (!audioElement) {
      return;
    }

    const src = audioElement.currentSrc || audioElement.src;
    if (!src) {
      return;
    }

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildFilename();
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("ChatGPT audio download failed", error);
    }
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

  const setupMutationObserver = () => {
    if (state.observer) {
      return;
    }

    state.observer = new MutationObserver(() => {
      observeAudioPlayback();
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
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
