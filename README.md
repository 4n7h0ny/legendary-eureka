# ChatGPT Read Aloud Downloader (Chrome Extension)

This Chrome extension downloads the ChatGPT read-aloud audio automatically whenever you click the **Read aloud** button.

## Features

- Watches for the read-aloud button click.
- Captures the audio element ChatGPT injects.
- Saves the audio file locally with a timestamped filename.

## Install (Load Unpacked)

1. Open **Chrome** and navigate to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder (`/workspace/legendary-eureka`).
4. Visit `https://chatgpt.com` or `https://chat.openai.com`.

## Usage

1. Open a ChatGPT conversation.
2. Click **Read aloud** on any assistant message.
3. The audio file will download automatically.

## Notes

- The extension listens for buttons labeled **Read aloud**. If the UI changes, update the selectors in `content.js`.
- Downloads are saved with filenames like `chatgpt-read-aloud-2024-01-01T12-00-00-000Z-1.mp3`.

## Development

- `manifest.json` contains the extension metadata.
- `content.js` runs in the ChatGPT page and handles click + audio detection.

## Testing

This repository does not include automated tests. To validate:

1. Load the extension in Chrome (see Install).
2. Click **Read aloud** on a ChatGPT message.
3. Confirm a `.mp3` download appears.

