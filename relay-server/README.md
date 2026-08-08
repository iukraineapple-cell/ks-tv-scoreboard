# KS TV RTMP Relay Server

This is a standalone Node.js server that accepts WebSocket connections from the browser, receives `MediaRecorder` video chunks (binary data), and pipes them through FFmpeg to a user-specified RTMP endpoint (like YouTube Live).

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Install FFmpeg:**
   You must have FFmpeg installed on your system and available in your `PATH`.
   - Download from [ffmpeg.org](https://ffmpeg.org/download.html)
   - On Windows, you can use a package manager like `winget` or download the binaries directly.

3. **Run the Server:**
   ```bash
   npm start
   ```

4. **Connect from Browser:**
   The server will run on port `3001` by default (configurable via `PORT` environment variable).
   Your browser application should connect to `ws://localhost:3001`.

## Protocol

- **Start Stream:**
  Client sends a JSON message to start the stream:
  ```json
  {
    "type": "start",
    "rtmpUrl": "rtmp://a.rtmp.youtube.com/live2",
    "streamKey": "your-stream-key"
  }
  ```
- **Send Media:**
  Client sends binary WebSocket frames containing video chunks (e.g., from `MediaRecorder`).
- **Stop Stream:**
  Client sends a JSON message to stop the stream:
  ```json
  {
    "type": "stop"
  }
  ```

## Server Status
The server provides a health check endpoint at `http://localhost:3001/` that returns the current number of active streams.
