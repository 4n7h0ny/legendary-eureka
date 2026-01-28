const BUTTON_CLASS = "cgd-download-read-aloud";
const BUTTON_LABEL = "Download read aloud";
const AUDIO_SELECTOR = "audio[src]";

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

  const toolbar = event.currentTarget.closest("[data-testid]") || event.currentTarget.parentElement;
  const moreButton = findMoreButton(toolbar);

  if (moreButton) {
    moreButton.click();
    await waitForMenuAndClickReadAloud();
  }

  observeAudioAndDownload();
};

const findMoreButton = (scope) => {
  if (!scope) return null;
  const candidates = scope.querySelectorAll("button");
  return (
    Array.from(candidates).find((button) =>
      /more|options|menu/i.test(button.getAttribute("aria-label") || "")
    ) || null
  );
};

const waitForMenuAndClickReadAloud = async () => {
  const menu = await waitForElement("[role='menu']", 2000);
  if (!menu) return;

  const menuItems = menu.querySelectorAll("[role='menuitem'], button, div");
  const readAloudItem = Array.from(menuItems).find((item) =>
    /read aloud/i.test(item.textContent || "")
  );

  if (readAloudItem) {
    readAloudItem.click();
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

const observeAudioAndDownload = () => {
  const existingAudio = document.querySelector(AUDIO_SELECTOR);
  if (existingAudio && existingAudio.src && existingAudio.src !== lastDownloadedUrl) {
    triggerDownload(existingAudio.src);
    return;
  }

  const audioObserver = new MutationObserver(() => {
    const audio = document.querySelector(AUDIO_SELECTOR);
    if (audio && audio.src && audio.src !== lastDownloadedUrl) {
      audioObserver.disconnect();
      triggerDownload(audio.src);
    }
  });

  audioObserver.observe(document.body, { childList: true, subtree: true });
};

const triggerDownload = (url) => {
  lastDownloadedUrl = url;
  chrome.runtime.sendMessage({
    type: "download-audio",
    url,
    filename: getTimestampName()
  });
};

const addButtonsToToolbars = () => {
  const toolbars = document.querySelectorAll("[data-testid='message-actions']");
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
