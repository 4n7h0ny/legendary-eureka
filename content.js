const BUTTON_ATTR = "data-read-aloud-download";
const MENU_LABEL_MATCH = /more/i;
const READ_ALOUD_LABEL_MATCH = /read aloud/i;

const observer = new MutationObserver(() => {
  addDownloadButtons();
});

function startObserver() {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  addDownloadButtons();
}

function addDownloadButtons() {
  const menuButtons = Array.from(
    document.querySelectorAll('button[aria-haspopup="menu"]')
  ).filter((button) => MENU_LABEL_MATCH.test(button.getAttribute("aria-label") || ""));

  menuButtons.forEach((menuButton) => {
    const container = menuButton.parentElement;
    if (!container || container.querySelector(`[${BUTTON_ATTR}]`)) {
      return;
    }

    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.textContent = "Download read aloud";
    downloadButton.setAttribute(BUTTON_ATTR, "true");
    downloadButton.className = `${menuButton.className} chatgpt-read-aloud-download`;
    downloadButton.style.marginRight = "6px";
    downloadButton.addEventListener("click", () => handleDownloadClick(menuButton));

    container.insertBefore(downloadButton, menuButton);
  });
}

async function handleDownloadClick(menuButton) {
  const readAloudButton = await openMenuAndFindReadAloud(menuButton);
  if (!readAloudButton) {
    notifyUser("Read aloud button not found.");
    return;
  }

  readAloudButton.click();

  const audioSrc = await waitForAudioSrc();
  if (!audioSrc) {
    notifyUser("Could not find audio source.");
    return;
  }

  const { url, filename } = await prepareDownload(audioSrc);
  if (!url) {
    notifyUser("Unable to prepare audio download.");
    return;
  }

  chrome.runtime.sendMessage(
    {
      type: "download-audio",
      url,
      filename,
      saveAs: true
    },
    (response) => {
      if (!response?.ok) {
        notifyUser(response?.error || "Download failed.");
      }
    }
  );
}

async function openMenuAndFindReadAloud(menuButton) {
  menuButton.click();

  const menu = await waitForMenu();
  if (!menu) {
    return null;
  }

  const items = Array.from(menu.querySelectorAll("button, [role='menuitem']"));
  return items.find((item) => READ_ALOUD_LABEL_MATCH.test(item.textContent || "")) || null;
}

function waitForMenu() {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(null), 2000);
    const intervalId = setInterval(() => {
      const menu = document.querySelector("[role='menu']");
      if (menu) {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        resolve(menu);
      }
    }, 100);
  });
}

function waitForAudioSrc() {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(null), 10000);
    const intervalId = setInterval(() => {
      const audio = document.querySelector("audio");
      if (audio && audio.src) {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        resolve(audio.src);
      }
    }, 200);
  });
}

async function prepareDownload(audioSrc) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `chatgpt-read-aloud-${timestamp}.mp3`;

  if (audioSrc.startsWith("blob:")) {
    try {
      const response = await fetch(audioSrc);
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      return { url: dataUrl, filename };
    } catch (error) {
      return { url: null, filename };
    }
  }

  return { url: audioSrc, filename };
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function notifyUser(message) {
  const existing = document.querySelector(".chatgpt-read-aloud-toast");
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement("div");
  toast.className = "chatgpt-read-aloud-toast";
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "24px";
  toast.style.right = "24px";
  toast.style.padding = "12px 16px";
  toast.style.background = "#111";
  toast.style.color = "#fff";
  toast.style.borderRadius = "8px";
  toast.style.zIndex = "9999";
  toast.style.fontSize = "14px";

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

startObserver();
