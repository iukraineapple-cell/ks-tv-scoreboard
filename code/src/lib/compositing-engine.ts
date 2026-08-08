import type { MatchData, MatchEventData, MatchPlayerData } from './supabase-queries';

export class CompositingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  
  private video: HTMLVideoElement | null = null;
  private audioStream: MediaStream | null = null;
  
  private match: MatchData | null = null;
  private events: MatchEventData[] = [];
  private players: MatchPlayerData[] = [];
  
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  
  private layers = {
    scoreboard: true,
    events: true,
    lineups: false,
    lowerThird: false,
  };
  
  private lowerThirdText: string = '';
  
  private activeEventIndex: number = -1;
  private lastEventSwitchTime: number = 0;
  private readonly EVENT_DISPLAY_DURATION = 5000;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2d context for canvas');
    }
    this.ctx = context;
  }

  public setVideoSource(video: HTMLVideoElement) {
    this.video = video;
  }

  public updateMatchData(match: MatchData | null) {
    this.match = match;
  }

  public updateEvents(events: MatchEventData[]) {
    this.events = events;
  }

  public updatePlayers(players: MatchPlayerData[]) {
    this.players = players;
  }

  public setLayerVisibility(layer: 'scoreboard' | 'events' | 'lineups' | 'lowerThird', visible: boolean) {
    this.layers[layer] = visible;
  }

  public setLowerThirdText(text: string) {
    this.lowerThirdText = text;
  }

  public getOutputStream(): MediaStream {
    return this.canvas.captureStream(30);
  }

  public getAudioStream(): MediaStream | null {
    return this.audioStream;
  }

  public setAudioStream(stream: MediaStream) {
    this.audioStream = stream;
  }

  public getCompositeStream(): MediaStream {
    const canvasStream = this.getOutputStream();
    const tracks = [...canvasStream.getVideoTracks()];
    
    const audioTracks = this.audioStream ? this.audioStream.getAudioTracks() : [];
    if (audioTracks.length > 0) {
      tracks.push(...audioTracks);
    } else {
      // Create a guaranteed silent audio track so YouTube RTMP never terminates
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          gain.gain.value = 0.0001; // minimal audible level to keep WebAudio engine actively producing samples
          osc.connect(gain);
          const dest = audioCtx.createMediaStreamDestination();
          gain.connect(dest);
          osc.start();
          const silentTrack = dest.stream.getAudioTracks()[0];
          if (silentTrack) {
            tracks.push(silentTrack);
          }
        }
      } catch (e) {
        console.warn('Silent audio generator error:', e);
      }
    }
    
    return new MediaStream(tracks);
  }

  public start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.renderLoop();
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy() {
    this.stop();
    this.video = null;
    this.audioStream = null;
    this.match = null;
    this.events = [];
    this.players = [];
  }

  private renderLoop = () => {
    if (!this.isRunning) return;

    this.render();
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  };

  private render() {
    const { ctx, width, height } = this;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Layer 0: Camera frame
    this.drawVideo();

    // Ensure we have match data for overlays
    if (!this.match) return;

    // Layer 3: Lineups (if visible, it covers everything else usually, but we draw it below scoreboard if needed, or above)
    // Requirements say full screen overlay
    if (this.layers.lineups) {
      this.drawLineups();
    }

    // Layer 1: Scoreboard
    if (this.layers.scoreboard) {
      this.drawScoreboard();
    }

    // Layer 2: Events
    if (this.layers.events) {
      this.drawEvents();
    }

    // Layer 4: Lower Third
    if (this.layers.lowerThird) {
      this.drawLowerThird();
    }
  }

  private drawVideo() {
    if (!this.video || this.video.readyState < 2) {
      // Draw a black background if no video
      this.ctx.fillStyle = '#0a0a0f';
      this.ctx.fillRect(0, 0, this.width, this.height);
      return;
    }

    const { ctx, width, height } = this;
    const videoWidth = this.video.videoWidth;
    const videoHeight = this.video.videoHeight;
    
    if (videoWidth === 0 || videoHeight === 0) return;

    const scale = Math.max(width / videoWidth, height / videoHeight);
    const x = (width / 2) - (videoWidth / 2) * scale;
    const y = (height / 2) - (videoHeight / 2) * scale;

    ctx.drawImage(this.video, x, y, videoWidth * scale, videoHeight * scale);
  }

  private calculateTimer(): string {
    if (!this.match) return '00:00';

    let elapsed = this.match.current_time;

    if (this.match.is_timer_running && this.match.timer_server_time) {
      const now = Date.now() / 1000;
      elapsed += (now - this.match.timer_server_time) * 1000;
    }

    let displayTime = elapsed;
    if (this.match.current_half === 2) {
      displayTime += (this.match.half_time_offset || 45 * 60 * 1000);
    }

    const totalSeconds = Math.floor(displayTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private drawScoreboard() {
    if (!this.match) return;

    const { ctx, width } = this;
    
    const boardWidth = 600;
    const boardHeight = 80;
    const x = (width - boardWidth) / 2;
    const y = 30;
    const radius = 16;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(x, y, boardWidth, boardHeight, radius);
    ctx.fill();
    
    // Glassmorphic border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const centerY = y + boardHeight / 2;

    // Score
    ctx.font = 'bold 48px Outfit, sans-serif';
    ctx.fillStyle = '#f0f0f5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const scoreText = `${this.match.team1_score} : ${this.match.team2_score}`;
    ctx.fillText(scoreText, width / 2, centerY - 10);

    // Team 1 Name
    ctx.font = '600 20px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(this.match.team1_name, width / 2 - 80, centerY - 10);
    
    // Team 1 Color Accent
    if (this.match.team1_color) {
      ctx.fillStyle = this.match.team1_color;
      ctx.beginPath();
      ctx.arc(x + 20, centerY - 10, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Team 2 Name
    ctx.fillStyle = '#f0f0f5';
    ctx.textAlign = 'left';
    ctx.fillText(this.match.team2_name, width / 2 + 80, centerY - 10);
    
    // Team 2 Color Accent
    if (this.match.team2_color) {
      ctx.fillStyle = this.match.team2_color;
      ctx.beginPath();
      ctx.arc(x + boardWidth - 20, centerY - 10, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Timer & Half
    const timerText = this.calculateTimer();
    const halfText = this.match.current_half === 1 ? "1-й тайм" : "2-й тайм";
    
    ctx.font = '500 18px "Space Grotesk", monospace';
    ctx.fillStyle = '#8b8b9e';
    ctx.textAlign = 'center';
    
    // Timer pulsing dot
    if (this.match.is_timer_running) {
      const time = Date.now();
      const alpha = (Math.sin(time / 200) + 1) / 2; // 0 to 1
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
      ctx.beginPath();
      ctx.arc(width / 2 - 50, centerY + 22, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.fillStyle = '#8b8b9e';
    ctx.fillText(`${halfText} | ${timerText}`, width / 2, centerY + 22);
  }

  private drawEvents() {
    const broadcastEvents = this.events.filter(e => e.is_broadcast);
    if (broadcastEvents.length === 0) return;

    const now = Date.now();
    if (now - this.lastEventSwitchTime > this.EVENT_DISPLAY_DURATION) {
      this.activeEventIndex = (this.activeEventIndex + 1) % broadcastEvents.length;
      this.lastEventSwitchTime = now;
    }

    if (this.activeEventIndex >= broadcastEvents.length) {
      this.activeEventIndex = 0;
    }

    const currentEvent = broadcastEvents[this.activeEventIndex];
    if (!currentEvent) return;

    const { ctx, width, height } = this;
    
    const bannerWidth = 500;
    const bannerHeight = 50;
    const x = (width - bannerWidth) / 2;
    const y = height - 120;
    const radius = 12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x, y, bannerWidth, bannerHeight, radius);
    ctx.fill();

    let text = '';
    let glowColor = '';

    const minStr = currentEvent.minute ? `${currentEvent.minute}'` : '';

    if (currentEvent.event_type === 'goal') {
      text = `⚽ ГОЛ! ${currentEvent.player_name || ''} (${currentEvent.team || ''}) ${minStr}`;
      glowColor = 'rgba(16, 185, 129, 0.5)'; // accent-success
    } else if (currentEvent.event_type === 'yellow_card') {
      text = `🟨 ${currentEvent.player_name || ''} ${minStr}`;
      glowColor = 'rgba(245, 158, 11, 0.5)'; // accent-warning
    } else if (currentEvent.event_type === 'red_card') {
      text = `🟥 ${currentEvent.player_name || ''} ${minStr}`;
      glowColor = 'rgba(239, 68, 68, 0.5)'; // accent-danger
    } else if (currentEvent.event_type === 'substitution') {
      text = `🔄 ${currentEvent.player_name || ''} ↔ ${currentEvent.substituted_player_name || ''} ${minStr}`;
      glowColor = 'rgba(99, 102, 241, 0.5)'; // accent-primary
    } else {
      text = `${currentEvent.description || ''} ${minStr}`;
      glowColor = 'rgba(255, 255, 255, 0.2)';
    }

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.shadowBlur = 0;

    ctx.font = '600 16px Outfit, sans-serif';
    ctx.fillStyle = '#f0f0f5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.trim(), width / 2, y + bannerHeight / 2);
  }

  private drawLineups() {
    if (!this.match) return;

    const { ctx, width, height } = this;
    
    // Background overlay
    ctx.fillStyle = 'rgba(10, 10, 15, 0.9)'; // --bg-primary with opacity
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#f0f0f5';
    ctx.font = 'bold 32px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("СКЛАДИ КОМАНД", width / 2, 80);

    const team1Players = this.players.filter(p => p.team === 1 && p.is_starter);
    const team2Players = this.players.filter(p => p.team === 2 && p.is_starter);

    const colWidth = 400;
    const startY = 150;
    const lineSpacing = 35;

    // Team 1
    ctx.textAlign = 'left';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillStyle = this.match.team1_color || '#6366f1';
    ctx.fillText(this.match.team1_name, width / 2 - colWidth, startY);
    
    ctx.font = '400 18px Outfit, sans-serif';
    ctx.fillStyle = '#f0f0f5';
    team1Players.forEach((p, idx) => {
      ctx.fillText(`${p.player_number || ''}\t ${p.player_name}`, width / 2 - colWidth, startY + 40 + (idx * lineSpacing));
    });

    // Team 2
    ctx.textAlign = 'right';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillStyle = this.match.team2_color || '#ef4444';
    ctx.fillText(this.match.team2_name, width / 2 + colWidth, startY);
    
    ctx.font = '400 18px Outfit, sans-serif';
    ctx.fillStyle = '#f0f0f5';
    team2Players.forEach((p, idx) => {
      ctx.fillText(`${p.player_name} \t${p.player_number || ''}`, width / 2 + colWidth, startY + 40 + (idx * lineSpacing));
    });
  }

  private drawLowerThird() {
    if (!this.lowerThirdText) return;

    const { ctx, width, height } = this;
    const barHeight = height * 0.15;
    const y = height - barHeight;

    const gradient = ctx.createLinearGradient(0, y, 0, height);
    gradient.addColorStop(0, 'rgba(10, 10, 15, 0.0)');
    gradient.addColorStop(0.5, 'rgba(10, 10, 15, 0.8)');
    gradient.addColorStop(1, 'rgba(10, 10, 15, 1.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, width, barHeight);

    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.lowerThirdText, width / 2, y + barHeight / 2);
  }
}
