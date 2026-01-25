const statusEl = document.getElementById("status");

chrome.runtime.sendMessage({ type: "PING" }, (response) => {
  if (chrome.runtime.lastError) {
    statusEl.textContent = "Extension active.";
    return;
  }

  if (response && response.ok) {
    statusEl.querySelector("span:last-child").textContent = "Listening for audio…";
  }
});
