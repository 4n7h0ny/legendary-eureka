# ChatGPT Read Aloud Downloader (Chrome Extension)

This Chrome extension adds a **Download audio** button next to the three-dot menu on ChatGPT messages. Clicking it triggers **Read aloud** and saves the audio file.

## Features

- Adds a **Download audio** button beside the three-dot menu.
- Opens the **Read aloud** action automatically.
- Prompts you for a save location (Chrome download dialog).
- Saves the audio file locally with a timestamped filename.

## Install (Load Unpacked)

1. Open **Chrome** and navigate to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder (`/workspace/legendary-eureka`).
4. Visit `https://chatgpt.com` or `https://chat.openai.com`.

## Usage

1. Open a ChatGPT conversation.
2. Click **Download audio** next to the three-dot menu.
3. Choose where to save the file when prompted.
4. ChatGPT will read the message aloud, and the audio will download automatically.

## Notes

- The extension looks for the three-dot menu button and inserts the new download button beside it.
- If ChatGPT changes its UI labels, update the selectors in `content.js`.
- Downloads are saved with filenames like `chatgpt-read-aloud-2024-01-01T12-00-00-000Z-1.mp3`.

## Development

- `manifest.json` contains the extension metadata and download permission.
- `content.js` runs in the ChatGPT page and handles UI + audio detection.
- `background.js` handles the Chrome download prompt.

## Testing

This repository does not include automated tests. To validate:

1. Load the extension in Chrome (see Install).
2. Click **Download audio** on a ChatGPT message.
3. Confirm Chrome prompts you for a save location and then downloads the `.mp3`.

