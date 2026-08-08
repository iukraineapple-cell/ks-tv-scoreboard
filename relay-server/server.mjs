import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { spawn, execSync } from 'child_process';
import { parse } from 'url';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 3001;
const MAX_CONCURRENT_STREAMS = 5;
const API_KEY = process.env.API_KEY || null;

// Search for FFmpeg path
function findFFmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  // Check PATH
  try {
    const whereOut = execSync('where.exe ffmpeg', { encoding: 'utf8', timeout: 2000 }).trim().split(/\r?\n/)[0];
    if (whereOut && fs.existsSync(whereOut)) return whereOut;
  } catch (e) {}

  // Check WinGet Packages
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\KSTV', 'AppData', 'Local');
  const wingetPkgDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
  
  if (fs.existsSync(wingetPkgDir)) {
    try {
      const dirs = fs.readdirSync(wingetPkgDir);
      for (const d of dirs) {
        if (d.toLowerCase().includes('ffmpeg')) {
          const candidateBin = path.join(wingetPkgDir, d, 'ffmpeg-9.0-full_build', 'bin', 'ffmpeg.exe');
          if (fs.existsSync(candidateBin)) return candidateBin;

          const subdirs = fs.readdirSync(path.join(wingetPkgDir, d));
          for (const sub of subdirs) {
            const nestedBin = path.join(wingetPkgDir, d, sub, 'bin', 'ffmpeg.exe');
            if (fs.existsSync(nestedBin)) return nestedBin;
            const directBin = path.join(wingetPkgDir, d, sub, 'ffmpeg.exe');
            if (fs.existsSync(directBin)) return directBin;
          }
        }
      }
    } catch (e) {}
  }

  const wingetLinks = path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe');
  if (fs.existsSync(wingetLinks)) return wingetLinks;

  return 'ffmpeg';
}

const FFMPEG_PATH = findFFmpeg();

console.log(`
██╗  ██╗███████╗    ████████╗██╗   ██╗
██║ ██╔╝██╔════╝    ╚══██╔══╝██║   ██║
█████╔╝ ███████╗       ██║   ██║   ██║
██╔═██╗ ╚════██║       ██║   ╚██╗ ██╔╝
██║  ██╗███████║       ██║    ╚████╔╝ 
╚═╝  ╚═╝╚══════╝       ╚═╝     ╚═══╝  
                                      
    ██████╗ ███████╗██╗      █████╗ ██╗   ██╗
    ██╔══██╗██╔════╝██║     ██╔══██╗╚██╗ ██╔╝
    ██████╔╝█████╗  ██║     ███████║ ╚████╔╝ 
    ██╔══██╗██╔══╝  ██║     ██╔══██║  ╚██╔╝  
    ██║  ██║███████╗███████╗██║  ██║   ██║   
    ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝   
`);
console.log(`Starting KS TV Relay Server on port ${PORT}...`);
console.log(`Resolved FFmpeg binary: ${FFMPEG_PATH}`);

// Verify FFmpeg
try {
  const ffmpegCheck = spawn(FFMPEG_PATH, ['-version']);
  ffmpegCheck.stdout.once('data', (data) => {
    const versionLine = data.toString().split('\n')[0];
    console.log(`✅ FFmpeg active: ${versionLine}`);
    console.log(`✅ Ready! Connect from mobile studio at ws://localhost:${PORT}`);
    console.log('');
  });
  ffmpegCheck.on('error', (err) => {
    console.error(`⚠️ Notice: FFmpeg test returned: ${err.message}`);
  });
} catch (e) {
  console.error('Error testing FFmpeg:', e.message);
}

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'ks-tv-relay',
      activeStreams,
      maxStreams: MAX_CONCURRENT_STREAMS
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

let activeStreams = 0;
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const { query } = parse(request.url, true);
  
  if (API_KEY && query.apiKey !== API_KEY && request.headers['x-api-key'] !== API_KEY) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`📡 New studio WebSocket connection from ${ip}`);

  let ffmpegProcess = null;
  let isStreaming = false;

  const sendStatus = (status, message) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'status', status, message }));
    }
  };

  const cleanup = () => {
    if (ffmpegProcess) {
      console.log(`Stopping FFmpeg process for ${ip}...`);
      try {
        if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
          ffmpegProcess.stdin.end();
        }
        ffmpegProcess.kill('SIGINT');
      } catch (e) {}
      ffmpegProcess = null;
    }
    if (isStreaming) {
      activeStreams = Math.max(0, activeStreams - 1);
      isStreaming = false;
    }
  };

  ws.on('message', (message, isBinary) => {
    if (isBinary) {
      if (ffmpegProcess && isStreaming) {
        if (ffmpegProcess.stdin && ffmpegProcess.stdin.writable && !ffmpegProcess.stdin.destroyed) {
          try {
            ffmpegProcess.stdin.write(message);
          } catch (writeErr) {
            // ignore write error during stream teardown
          }
        }
      }
      return;
    }

    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'start') {
        if (isStreaming) {
          sendStatus('error', 'Already streaming');
          return;
        }

        if (activeStreams >= MAX_CONCURRENT_STREAMS) {
          sendStatus('error', 'Maximum concurrent streams reached');
          return;
        }

        const { rtmpUrl, streamKey } = data;
        
        if (!rtmpUrl || !streamKey) {
          sendStatus('error', 'Missing rtmpUrl or streamKey');
          return;
        }

        const fullUrl = `${rtmpUrl.replace(/\/$/, '')}/${streamKey}`;
        const maskedKey = streamKey.slice(0, 4) + '****';

        console.log(`🎬 [STUDIO LIVE] Streaming to ${rtmpUrl}/${maskedKey} (Active: ${activeStreams + 1})`);

        const ffmpegArgs = [
          '-f', 'webm',
          '-i', 'pipe:0',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-pix_fmt', 'yuv420p',
          '-r', '30',
          '-g', '60',
          '-keyint_min', '30',
          '-sc_threshold', '0',
          '-b:v', '2500k',
          '-maxrate', '2500k',
          '-bufsize', '5000k',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ar', '44100',
          '-ac', '2',
          '-af', 'aresample=async=1000:min_hard_comp=0.100000:first_pts=0',
          '-flvflags', 'no_duration_filesize',
          '-f', 'flv',
          fullUrl
        ];

        ffmpegProcess = spawn(FFMPEG_PATH, ffmpegArgs);
        
        // Prevent unhandled error on stdin pipe
        if (ffmpegProcess.stdin) {
          ffmpegProcess.stdin.on('error', (err) => {
            // Handle EPIPE or EOF gracefully
          });
        }

        activeStreams++;
        isStreaming = true;
        sendStatus('streaming', 'FFmpeg started, transmitting to YouTube Live');

        ffmpegProcess.on('error', (err) => {
          console.error(`FFmpeg error for ${ip}:`, err.message);
          sendStatus('error', `FFmpeg error: ${err.message}`);
          cleanup();
        });

        ffmpegProcess.on('close', (code, signal) => {
          console.log(`FFmpeg closed: code=${code} signal=${signal}`);
          sendStatus('stopped', 'FFmpeg stream finished');
          cleanup();
        });

        ffmpegProcess.stderr.on('data', (data) => {
          const str = data.toString();
          if (str.toLowerCase().includes('error') || str.toLowerCase().includes('failed') || str.toLowerCase().includes('aborted')) {
            console.log(`[FFmpeg Info]: ${str.trim()}`);
          }
        });

      } else if (data.type === 'stop') {
        console.log(`⏹️ Client requested stop for ${ip}`);
        cleanup();
        sendStatus('stopped', 'Stream stopped by studio');
      }

    } catch (e) {
      console.error('Error parsing JSON message:', e.message);
      sendStatus('error', 'Invalid message format');
    }
  });

  ws.on('close', () => {
    console.log(`🔌 Studio WebSocket disconnected from ${ip}`);
    cleanup();
  });

  ws.on('error', (err) => {
    console.error(`Studio WebSocket error from ${ip}:`, err.message);
    cleanup();
  });
});

server.listen(PORT, () => {
  console.log(`KS TV Relay Server running on http://localhost:${PORT}`);
});
