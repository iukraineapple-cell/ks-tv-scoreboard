import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { spawn } from 'child_process';
import { parse } from 'url';

const PORT = process.env.PORT || 3001;
const MAX_CONCURRENT_STREAMS = 5;
const API_KEY = process.env.API_KEY || null;

let activeStreams = 0;

// Print ASCII banner
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

// Check if FFmpeg is installed
const ffmpegCheck = spawn('ffmpeg', ['-version']);
ffmpegCheck.on('error', (err) => {
  console.error('❌ FFmpeg is not installed or not in PATH.');
  console.error('Please install FFmpeg and ensure it is available in your system PATH.');
  process.exit(1);
});
ffmpegCheck.stdout.once('data', (data) => {
  const versionLine = data.toString().split('\n')[0];
  console.log(`✅ FFmpeg found: ${versionLine}`);
  console.log(`✅ Connect from browser to ws://localhost:${PORT}`);
});

const server = createServer((req, res) => {
  // CORS headers
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
      activeStreams,
      maxStreams: MAX_CONCURRENT_STREAMS
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

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
  console.log(`📡 New WebSocket connection from ${ip}`);

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
        ffmpegProcess.stdin.end();
        ffmpegProcess.kill('SIGINT');
      } catch (e) {
        console.error('Error killing FFmpeg process:', e);
      }
      ffmpegProcess = null;
    }
    if (isStreaming) {
      activeStreams--;
      isStreaming = false;
    }
  };

  ws.on('message', (message, isBinary) => {
    if (isBinary) {
      if (ffmpegProcess && isStreaming) {
        // Write binary chunk to FFmpeg stdin
        if (ffmpegProcess.stdin.writable) {
          ffmpegProcess.stdin.write(message);
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

        const fullUrl = \`\${rtmpUrl.replace(/\\/$/, '')}/\${streamKey}\`;
        const maskedUrl = \`\${rtmpUrl}/****\`;

        console.log(`🎬 Starting stream to ${maskedUrl} (Current active: ${activeStreams + 1})`);

        const ffmpegArgs = [
          '-i', 'pipe:0',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-maxrate', '2500k',
          '-bufsize', '5000k',
          '-pix_fmt', 'yuv420p',
          '-g', '60',
          '-c:a', 'aac',
          '-ar', '44100',
          '-b:a', '128k',
          '-f', 'flv',
          fullUrl
        ];

        ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
        
        activeStreams++;
        isStreaming = true;
        sendStatus('streaming', 'FFmpeg process started');

        ffmpegProcess.on('error', (err) => {
          console.error(\`FFmpeg error for \${ip}:\`, err);
          sendStatus('error', \`FFmpeg error: \${err.message}\`);
          cleanup();
        });

        ffmpegProcess.on('close', (code, signal) => {
          console.log(\`FFmpeg process closed with code \${code} and signal \${signal}\`);
          sendStatus('stopped', 'FFmpeg process closed');
          cleanup();
        });

        ffmpegProcess.stderr.on('data', (data) => {
          const str = data.toString();
          // Log errors or specific keywords, ignore normal info to avoid noise
          if (str.toLowerCase().includes('error') || str.toLowerCase().includes('failed') || str.toLowerCase().includes('warn')) {
             console.log(\`[FFmpeg \${ip}] \${str.trim()}\`);
          }
        });

      } else if (data.type === 'stop') {
        console.log(`⏹️ Client requested stop for ${ip}`);
        cleanup();
        sendStatus('stopped', 'Stream stopped by client');
      }

    } catch (e) {
      console.error('Error parsing JSON message:', e);
      sendStatus('error', 'Invalid message format');
    }
  });

  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected from ${ip}`);
    cleanup();
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error from ${ip}:`, err);
    cleanup();
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
