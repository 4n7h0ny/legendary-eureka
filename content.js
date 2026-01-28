(() => {
  const DB_NAME = "chatgpt-audio-downloader";
  const STORE_NAME = "handles";
  const DIRECTORY_KEY = "directory";
  const SAVE_BUTTON_CLASS = "chatgpt-audio-downloader-button";

  const state = {
    pendingDownload: false,
    lastClickedAt: 0,
    audioCounter: 0,
    observer: null,
    directoryHandle: null
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

  const MENU_BUTTON_SELECTORS = [
    'button[aria-label="More"]',
    'button[aria-label="More options"]',
    'button[aria-label="More actions"]',
    'button[data-testid="more-button"]'
  ];

  const openDatabase = () =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  const getStoredDirectoryHandle = async () => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(DIRECTORY_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  };

  const saveDirectoryHandle = async (handle) => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(handle, DIRECTORY_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  const ensureDirectoryPermission = async (handle) => {
    if (!handle) {
      return false;
    }

    const permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission === "granted") {
      return true;
    }

    if (permission === "prompt") {
      const requested = await handle.requestPermission({ mode: "readwrite" });
      return requested === "granted";
    }

    return false;
  };

  const ensureDirectoryHandle = async () => {
    if (state.directoryHandle) {
      const hasPermission = await ensureDirectoryPermission(state.directoryHandle);
      if (hasPermission) {
        return true;
      }
    }

    let storedHandle = null;
    try {
      storedHandle = await getStoredDirectoryHandle();
    } catch (error) {
      console.warn("ChatGPT audio downloader: unable to read saved directory", error);
    }

    if (storedHandle) {
      const hasPermission = await ensureDirectoryPermission(storedHandle);
      if (hasPermission) {
        state.directoryHandle = storedHandle;
        return true;
      }
    }

    if (typeof window.showDirectoryPicker !== "function") {
      return false;
    }

    try {
      const handle = await window.showDirectoryPicker({
        mode: "readwrite"
      });
      const hasPermission = await ensureDirectoryPermission(handle);
      if (!hasPermission) {
        return false;
      }
      state.directoryHandle = handle;
      await saveDirectoryHandle(handle);
      return true;
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.warn("ChatGPT audio downloader: directory selection failed", error);
      }
      return false;
    }
  };

  const isReadAloudButton = (element) => {
    if (!element || !(element instanceof Element)) {
      return false;
    }

    const label =
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      element.textContent ||
      "";
    const normalized = label.trim();

    if (READ_ALOUD_LABELS.includes(normalized)) {
      return true;
    }

    return BUTTON_SELECTORS.some((selector) => element.matches?.(selector));
  };

  const buildFilename = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    state.audioCounter += 1;
    return `chatgpt-read-aloud-${timestamp}-${state.audioCounter}.mp3`;
  };

  const writeBlobToDirectory = async (blob, filename) => {
    if (!state.directoryHandle) {
      return false;
    }

    const fileHandle = await state.directoryHandle.getFileHandle(filename, {
      create: true
    });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  };

  const fallbackDownload = (blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildFilename();
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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
      if (!response.ok) {
        throw new Error(`Audio request failed: ${response.status}`);
      }
      const blob = await response.blob();
      const filename = buildFilename();
      const saved = await writeBlobToDirectory(blob, filename);
      if (!saved) {
        fallbackDownload(blob);
      }
    } catch (error) {
      console.error("ChatGPT audio download failed", error);
    }
  };

  const onReadAloudClick = () => {
    if (!state.directoryHandle) {
      return;
    }
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
      injectDownloadButtons();
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  const waitForReadAloudMenuItem = async (attempts = 10) => {
    for (let i = 0; i < attempts; i += 1) {
      const candidates = Array.from(
        document.querySelectorAll('button,[role="menuitem"]')
      );
      const match = candidates.find((element) => isReadAloudButton(element));
      if (match) {
        return match;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return null;
  };

  const clickReadAloudForToolbar = async (menuButton) => {
    const toolbar = menuButton?.closest('[role="toolbar"]') || menuButton?.parentElement;
    if (!toolbar) {
      return;
    }

    const inlineButton = toolbar.querySelector(BUTTON_SELECTORS.join(","));
    if (inlineButton) {
      inlineButton.click();
      return;
    }

    menuButton.click();
    const menuItem = await waitForReadAloudMenuItem();
    if (menuItem) {
      menuItem.click();
    }
  };

  const handleSaveAudioClick = async (menuButton) => {
    const ready = await ensureDirectoryHandle();
    if (!ready) {
      return;
    }
    state.pendingDownload = true;
    state.lastClickedAt = Date.now();
    await clickReadAloudForToolbar(menuButton);
  };

  const createSaveButton = (menuButton) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = SAVE_BUTTON_CLASS;
    button.textContent = "Save audio";
    button.setAttribute("aria-label", "Save read aloud audio");
    button.addEventListener("click", () => handleSaveAudioClick(menuButton));
    return button;
  };

  const injectDownloadButtons = () => {
    const menuButtons = document.querySelectorAll(MENU_BUTTON_SELECTORS.join(","));
    menuButtons.forEach((menuButton) => {
      const toolbar =
        menuButton.closest('[role="toolbar"]') || menuButton.parentElement;
      if (!toolbar || toolbar.querySelector(`.${SAVE_BUTTON_CLASS}`)) {
        return;
      }
      const button = createSaveButton(menuButton);
      menuButton.parentElement?.insertBefore(button, menuButton);
    });
  };

  const setupStyles = () => {
    if (document.getElementById("chatgpt-audio-downloader-style")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "chatgpt-audio-downloader-style";
    style.textContent = `
      .${SAVE_BUTTON_CLASS} {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        line-height: 1;
        background: rgba(255, 255, 255, 0.9);
        color: inherit;
        cursor: pointer;
        margin-right: 6px;
      }
      .${SAVE_BUTTON_CLASS}:hover {
        background: rgba(0, 0, 0, 0.05);
      }
    `;
    document.head.appendChild(style);
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

  const init = async () => {
    setupStyles();
    setupClickListener();
    setupMutationObserver();
    observeAudioPlayback();
    injectDownloadButtons();
    try {
      const storedHandle = await getStoredDirectoryHandle();
      if (storedHandle) {
        state.directoryHandle = storedHandle;
      }
    } catch (error) {
      console.warn("ChatGPT audio downloader: unable to load saved directory", error);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
