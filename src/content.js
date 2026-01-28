const BUTTON_CLASS = "cgd-download-read-aloud";
const BUTTON_LABEL = "Download read aloud";
const AUDIO_SELECTOR = "audio[src]";
const TOOLBAR_SELECTOR = "[data-testid='message-actions']";
const MENU_SELECTOR = "[role='menu']";
const READ_ALOUD_PATTERN = /read aloud/i;

const seenToolbars = new WeakSet();
let lastDownloadedUrl = "";

const createButton = () => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = BUTTON_CLASS;
  button.setAttribute("aria-label", BUTTON_LABEL);
  button.title = BUTTON_LABEL;
  button.textContent = "🔊⬇";
  button.addEventListener("click", handleDownloadClick);
  return button;
};

const getTimestampName = () => {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
  return `chatgpt-read-aloud-${stamp}.mp3`;
};

const handleDownloadClick = async (event) => {
  event.preventDefault();
  event.stopPropagation();

  const toolbar = event.currentTarget.closest(TOOLBAR_SELECTOR) || event.currentTarget.parentElement;
  const menuButton = findMenuButton(toolbar);

  if (menuButton) {
    menuButton.click();
  }

  const clicked = await clickReadAloudFromMenu();
  if (!clicked) {
    clickReadAloudFallback();
  }

  const audioUrl = await waitForAudioUrl(10000);
  if (!audioUrl) {
    console.warn("ChatGPT audio URL was not found after triggering Read Aloud.");
    return;
  }

  triggerDownload(audioUrl);
};

const findMenuButton = (scope) => {
  if (!scope) return null;
  const buttons = scope.querySelectorAll("button");
  return (
    Array.from(buttons).find((button) => {
      const label = button.getAttribute("aria-label") || "";
      return /more|options|menu/i.test(label) || button.getAttribute("aria-haspopup") === "menu";
    }) || null
  );
};

const clickReadAloudFromMenu = async () => {
  const menu = await waitForElement(MENU_SELECTOR, 2000);
  if (!menu) return false;

  const menuItems = menu.querySelectorAll("[role='menuitem'], button, div");
  const readAloudItem = Array.from(menuItems).find((item) => {
    const text = item.textContent || "";
    const testId = item.getAttribute?.("data-testid") || "";
    return READ_ALOUD_PATTERN.test(text) || /read-aloud/i.test(testId);
  });

  if (readAloudItem) {
    readAloudItem.click();
    return true;
  }

  return false;
};

const clickReadAloudFallback = () => {
  const candidates = document.querySelectorAll("button, div");
  const readAloudButton = Array.from(candidates).find((item) =>
    READ_ALOUD_PATTERN.test(item.textContent || "")
  );
  if (readAloudButton) {
    readAloudButton.click();
  }
};

const waitForElement = (selector, timeoutMs) =>
  new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    let timeoutId;
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(found);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    timeoutId = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });

const waitForAudioUrl = (timeoutMs) =>
  new Promise((resolve) => {
    const checkAudio = () => {
      const audio = document.querySelector(AUDIO_SELECTOR);
      if (audio?.src && audio.src !== lastDownloadedUrl) {
        resolve(audio.src);
        return true;
      }
      return false;
    };

    if (checkAudio()) return;

    const intervalId = window.setInterval(() => {
      if (checkAudio()) {
        clearInterval(intervalId);
      }
    }, 400);

    const observer = new MutationObserver(() => {
      if (checkAudio()) {
        observer.disconnect();
        clearInterval(intervalId);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.setTimeout(() => {
      observer.disconnect();
      clearInterval(intervalId);
      resolve(null);
    }, timeoutMs);
  });

const triggerDownload = (url) => {
  lastDownloadedUrl = url;
  chrome.runtime.sendMessage({
    type: "download-audio",
    url,
    filename: getTimestampName()
  });
};

const addButtonsToToolbars = () => {
  const toolbars = document.querySelectorAll(TOOLBAR_SELECTOR);
  toolbars.forEach((toolbar) => {
    if (seenToolbars.has(toolbar)) return;
    seenToolbars.add(toolbar);

    const button = createButton();
    toolbar.appendChild(button);
  });
};

const init = () => {
  addButtonsToToolbars();

  const observer = new MutationObserver(() => {
    addButtonsToToolbars();
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

init();
