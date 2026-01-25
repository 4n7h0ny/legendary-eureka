# ChatGPT Audio Downloader (Chrome Extension)

This extension adds a **Download Audio** button to ChatGPT responses that use the **Read aloud** feature, making it easy to save synthesized audio locally.

## Installation (Chrome / Chromium)

1. Open **chrome://extensions** in your browser.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the folder that contains this extension (`/workspace/legendary-eureka` if you’re loading from this repo).
5. Confirm the extension appears in the extensions list.

## Usage

1. Open ChatGPT (https://chatgpt.com or https://chat.openai.com).
2. Trigger **Read aloud** on any assistant message.
3. A **Download Audio** button will appear next to the speaker icon.
4. Click **Download Audio** to save the audio file.

## How it works

- The content script listens for ChatGPT’s audio synthesis requests (`/backend-api/synthesize`).
- Once the audio is generated, the script creates a downloadable audio blob and adds a **Download Audio** button beside the **Read aloud** control.
- Downloads are initiated via the extension’s background service worker using the Chrome downloads API, with a fallback to a direct in-page download.

## Notes

- The extension only runs on ChatGPT domains.
- If you don’t see the **Download Audio** button, click **Read aloud** again to trigger audio generation.
