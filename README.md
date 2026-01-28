# ChatGPT Read Aloud Downloader (Windows)

This is a Chromium/Edge extension that adds a "Download read aloud" button next to the message action menu (the three dots) in ChatGPT. Clicking the button:

1. Opens the existing menu and triggers **Read Aloud**.
2. Detects the audio stream ChatGPT generates.
3. Prompts you for a save location and downloads the audio file.

## Install (Microsoft Edge on Windows)

1. Open **Edge** and navigate to `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.

## Usage

- Open ChatGPT and hover a message.
- Click the new **🔊⬇** button next to the three dots.
- Choose where to save the file when prompted.

## Notes

- The download prompt appears as soon as the read-aloud audio URL is available.
- The extension targets `chat.openai.com` and `chatgpt.com`.
- If the menu layout changes, reload the extension and refresh ChatGPT.
- If the download prompt does not appear, click the built-in **Read Aloud** once to ensure audio is available, then try the download button again.
