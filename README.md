# ChatGPT Read Aloud Downloader (Chrome Extension)

This Chrome extension downloads the ChatGPT read-aloud audio automatically whenever you click the new **Save audio** button.

## Features

- Adds a **Save audio** button next to the message menu (three dots).
- Prompts once for a save location and reuses it.
- Mimics the read-aloud action and stores the audio file locally.

## Install (Load Unpacked)

1. Open **Chrome** and navigate to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder (`/workspace/legendary-eureka`).
4. Visit `https://chatgpt.com` or `https://chat.openai.com`.

## Usage

1. Open a ChatGPT conversation.
2. Click **Save audio** next to the three dots menu on any assistant message.
3. Choose a download folder the first time.
4. The audio file will save automatically in that folder.

## Notes

- The extension injects a **Save audio** button beside the message menu. If the UI changes, update the selectors in `content.js`.
- Downloads are saved with filenames like `chatgpt-read-aloud-2024-01-01T12-00-00-000Z-1.mp3`.

## Development

- `manifest.json` contains the extension metadata.
- `content.js` runs in the ChatGPT page and handles click + audio detection.

## Testing

This repository does not include automated tests. To validate:

1. Load the extension in Chrome (see Install).
2. Click **Save audio** on a ChatGPT message and pick a folder.
3. Confirm a `.mp3` appears in the chosen directory.
