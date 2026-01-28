# ChatGPT Read Aloud Downloader (Chrome Extension)

This Chrome extension adds a **Download audio** button next to ChatGPT's three-dot menu. Clicking it runs the Read Aloud action and prompts you to pick where the audio file should be saved.

## Features

- Adds a Download audio button next to the existing three-dot menu.
- Clicks the Read aloud action for the same message.
- Saves the audio file locally with a timestamped filename.
- Prompts you with Chrome's **Save As** dialog each time so you can pick where to save.

## Install (Load Unpacked)

1. Open **Chrome** and navigate to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder (`/workspace/legendary-eureka`).
4. Visit `https://chatgpt.com` or `https://chat.openai.com`.

## Usage

1. Open a ChatGPT conversation.
2. Locate the **Download audio** button next to the three-dot menu on any assistant message.
3. Click it and choose a save location when the dialog appears.

## Notes

- The extension listens for buttons labeled **Read aloud**. If the UI changes, update the selectors in `content.js`.
- Downloads are saved with filenames like `chatgpt-read-aloud-2024-01-01T12-00-00-000Z-1.mp3`.
- Chrome always asks you where to save because the extension sets `saveAs: true` in the downloads API.

## Development

- `manifest.json` contains the extension metadata and permissions.
- `content.js` runs in the ChatGPT page and handles button injection plus audio detection.
- `background.js` handles the download request using the Chrome downloads API.

## Testing

This repository does not include automated tests. To validate:

1. Load the extension in Chrome (see Install).
2. Click **Download audio** next to an assistant message.
3. Confirm Chrome prompts for a download location and the `.mp3` file appears.
