import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/lib/auth';
import { supabase, requireSupabase } from '@/lib/supabase';
import { 
  getMatchById, 
  getMatchPlayers, 
  getMatchEvents, 
  updateMatchScore, 
  updateMatchTimer, 
  updateMatchNotification 
} from '@/lib/supabase-queries';
import type { MatchData, MatchPlayerData, MatchEventData } from '@/lib/supabase-queries';
import { CompositingEngine } from '@/lib/compositing-engine';
import { RTMPRelayClient, getRelayServerUrl } from '@/lib/rtmp-relay-client';
import type { RelayStatus } from '@/lib/rtmp-relay-client';
import { 
  ArrowLeft, 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  RefreshCcw, 
  Settings, 
  Radio, 
  Video, 
  PlaySquare, 
  List, 
  Users, 
  Type, 
  Eye, 
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

export default function BroadcastStudio() {
  const { id } = useParams<{ id: string }>();
  const matchId = parseInt(id || '0', 10);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Match State
  const [match, setMatch] = useState<MatchData | null>(null);
  const [players, setPlayers] = useState<MatchPlayerData[]>([]);
  const [events, setEvents] = useState<MatchEventData[]>([]);

  // Camera State
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState('');

  // Stream State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<RelayStatus>('disconnected');
  const [streamDuration, setStreamDuration] = useState(0);
  const [streamError, setStreamError] = useState('');

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);

  // Layers State
  const [layers, setLayers] = useState({
    scoreboard: true,
    events: false,
    lineups: false,
    lowerThird: false,
  });
  const [lowerThirdText, setLowerThirdText] = useState('');

  // RTMP Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [rtmpUrl, setRtmpUrl] = useState('rtmp://a.rtmp.youtube.com/live2');
  const [streamKey, setStreamKey] = useState('');
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [relayUrl, setRelayUrl] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CompositingEngine | null>(null);
  const relayClientRef = useRef<RTMPRelayClient | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wakeLockRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Settings
  useEffect(() => {
    setRelayUrl(getRelayServerUrl());
    if (matchId) {
      const saved = localStorage.getItem(`rtmp_settings_${matchId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.rtmpUrl) setRtmpUrl(parsed.rtmpUrl);
          if (parsed.streamKey) setStreamKey(parsed.streamKey);
          if (parsed.relayUrl) setRelayUrl(parsed.relayUrl);
        } catch (e) {
          console.error('Error loading RTMP settings', e);
        }
      }
    }
  }, [matchId]);

  const saveSettings = () => {
    localStorage.setItem(`rtmp_settings_${matchId}`, JSON.stringify({ rtmpUrl, streamKey, relayUrl }));
  };

  useEffect(() => {
    saveSettings();
  }, [rtmpUrl, streamKey, relayUrl]);

  // Fetch Match Data
  const fetchMatchData = useCallback(async () => {
    if (!matchId) return;
    try {
      const m = await getMatchById(matchId);
      setMatch(m);
      if (m) {
        const p = await getMatchPlayers(matchId);
        setPlayers(p);
        const e = await getMatchEvents(matchId);
        setEvents(e);
      }
    } catch (err) {
      console.error('Error fetching match data', err);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMatchData();
  }, [fetchMatchData]);

  // Supabase Realtime
  useEffect(() => {
    if (!matchId) return;
    try {
      const sb = requireSupabase();
      
      const matchSub = sb
        .channel(`match-${matchId}-studio`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
          (payload) => {
            setMatch(payload.new as MatchData);
          }
        )
        .subscribe();

      const eventsSub = sb
        .channel(`match-events-${matchId}-studio`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` },
          () => {
            getMatchEvents(matchId).then(setEvents);
          }
        )
        .subscribe();

      return () => {
        sb.removeChannel(matchSub);
        sb.removeChannel(eventsSub);
      };
    } catch (e) {
      console.warn('Realtime sync skipped:', e);
    }
  }, [matchId]);

  // Camera Setup
  const initCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });

      streamRef.current = stream;
      
      // Apply initial mute/cam off states
      stream.getAudioTracks().forEach(t => t.enabled = !isMicMuted);
      stream.getVideoTracks().forEach(t => t.enabled = !isCamOff);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Video play error:", e));
      }

      setHasPermissions(true);
      setPermissionError('');

      // Init engine if canvas is ready
      if (canvasRef.current && !engineRef.current) {
        engineRef.current = new CompositingEngine(canvasRef.current, 1280, 720);
      }
      
      if (engineRef.current && videoRef.current) {
        engineRef.current.setVideoSource(videoRef.current);
        engineRef.current.setAudioStream(stream);
        engineRef.current.start();
        
        // Restore layer states
        Object.entries(layers).forEach(([key, val]) => {
          engineRef.current?.setLayerVisibility(key as any, val);
        });
        engineRef.current.setLowerThirdText(lowerThirdText);
      }
    } catch (err: any) {
      console.error('Camera init error', err);
      setHasPermissions(false);
      setPermissionError(err.message || 'Помилка доступу до камери/мікрофона');
    }
  }, [cameraFacingMode]); // Re-init on facing mode change

  useEffect(() => {
    initCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [initCamera]);

  // Tab Visibility Warning
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && relayClientRef.current?.isStreaming) {
        alert("⚠️ УВАГА! Якщо ви згорнули браузер або переключили вкладку, трансляція може обірватися! iOS та Android блокують доступ до камери у фоновому режимі.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Update Engine with Match Data
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateMatchData(match);
      engineRef.current.updatePlayers(players);
      engineRef.current.updateEvents(events);
    }
  }, [match, players, events]);

  // Wake Lock
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
    }
  };

  useEffect(() => {
    if (isStreaming || isRecording) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => releaseWakeLock();
  }, [isStreaming, isRecording]);

  // Controls Handlers
  const toggleCam = () => {
    const newState = !isCamOff;
    setIsCamOff(newState);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => t.enabled = !newState);
    }
  };

  const toggleMic = () => {
    const newState = !isMicMuted;
    setIsMicMuted(newState);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => t.enabled = !newState);
    }
  };

  const toggleFlip = () => {
    setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const toggleLayer = (layer: keyof typeof layers) => {
    const newState = !layers[layer];
    setLayers(prev => ({ ...prev, [layer]: newState }));
    if (engineRef.current) {
      engineRef.current.setLayerVisibility(layer, newState);
    }
  };

  const handleLowerThirdTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setLowerThirdText(text);
    if (engineRef.current) {
      engineRef.current.setLowerThirdText(text);
    }
  };

  const handleScoreUpdate = async (team: 1 | 2, change: 1 | -1) => {
    if (!match) return;
    const newScore1 = team === 1 ? Math.max(0, match.team1_score + change) : match.team1_score;
    const newScore2 = team === 2 ? Math.max(0, match.team2_score + change) : match.team2_score;
    
    // Optimistic update
    setMatch(prev => prev ? { ...prev, team1_score: newScore1, team2_score: newScore2 } : null);
    
    try {
      await updateMatchScore(match.id, newScore1, newScore2);
    } catch (e) {
      console.error('Score update error', e);
      // Revert on error
      fetchMatchData();
    }
  };

  // Streaming Handlers
  const startStreaming = async () => {
    if (!engineRef.current || !rtmpUrl || !streamKey || !relayUrl) {
      setStreamError('Заповніть всі налаштування RTMP');
      setShowSettings(true);
      return;
    }

    setStreamError('');
    try {
      const compositeStream = engineRef.current.getCompositeStream();
      
      relayClientRef.current = new RTMPRelayClient(relayUrl);
      
      relayClientRef.current.onStatusChange = (status) => {
        setStreamStatus(status);
        if (status === 'disconnected') {
          setIsStreaming(false);
          if (streamTimerRef.current) clearInterval(streamTimerRef.current);
        }
      };
      
      relayClientRef.current.onError = (error) => {
        setStreamError(error);
        setIsStreaming(false);
        if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      };

      await relayClientRef.current.connect();
      await relayClientRef.current.startStreaming({
        stream: compositeStream,
        rtmpUrl,
        streamKey
      });

      setIsStreaming(true);
      setStreamDuration(0);
      streamTimerRef.current = setInterval(() => setStreamDuration(d => d + 1), 1000);
      
    } catch (err: any) {
      console.error('Start streaming error', err);
      setStreamError(err.message || 'Помилка запуску трансляції');
      setIsStreaming(false);
    }
  };

  const stopStreaming = () => {
    if (relayClientRef.current) {
      relayClientRef.current.stopStreaming();
      relayClientRef.current.disconnect();
      relayClientRef.current = null;
    }
    setIsStreaming(false);
    setStreamStatus('disconnected');
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);
  };

  // Recording Handlers
  const startRecording = () => {
    if (!engineRef.current) return;
    
    try {
      const compositeStream = engineRef.current.getCompositeStream();
      chunksRef.current = [];
      
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      const recorder = new MediaRecorder(compositeStream, MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = `match_${matchId}_record_${new Date().toISOString().replace(/:/g, '-')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      
      setIsRecording(true);
      setRecordDuration(0);
      recordTimerRef.current = setInterval(() => setRecordDuration(d => d + 1), 1000);
    } catch (err) {
      console.error('Start recording error', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  // Format Time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Styles
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgGlass: 'rgba(255,255,255,0.04)',
    borderGlass: 'rgba(255,255,255,0.08)',
    textPrimary: '#f0f0f5',
    textSecondary: '#8b8b9e',
    accentPrimary: '#6366f1',
    accentSuccess: '#10b981',
    accentDanger: '#ef4444',
  };

  const glassStyle: React.CSSProperties = {
    backgroundColor: colors.bgGlass,
    border: `1px solid ${colors.borderGlass}`,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '16px',
  };

  const buttonStyle: React.CSSProperties = {
    ...glassStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    color: colors.textPrimary,
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
    boxShadow: `0 0 0 1px ${colors.borderGlass} inset`,
    transition: 'all 0.2s',
  };

  const activeButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    boxShadow: `0 0 0 1px ${colors.accentPrimary} inset`,
    color: colors.accentPrimary,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    border: `1px solid ${colors.borderGlass}`,
    borderRadius: '12px',
    padding: '12px 16px',
    color: colors.textPrimary,
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '14px'
  };

  if (!match) {
    return <div style={{ minHeight: '100vh', backgroundColor: colors.bgPrimary, color: colors.textPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Завантаження...</div>;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: colors.bgPrimary, 
      color: colors.textPrimary,
      fontFamily: "'Outfit', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden'
    }}>
      {/* Hidden Video element for source */}
      <video ref={videoRef} playsInline muted style={{ display: 'none' }} />

      {/* Header */}
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: `1px solid ${colors.borderGlass}`,
        backgroundColor: colors.bgSecondary,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate(`/match/${matchId}`)} style={{ background: 'none', border: 'none', color: colors.textPrimary, cursor: 'pointer', padding: '4px' }}>
            <ArrowLeft size={24} />
          </button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>СТУДІЯ LIVE</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', fontSize: '14px', fontWeight: 600 }}>
          {isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.accentDanger }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors.accentDanger, animation: 'pulse 2s infinite' }} />
              REC {formatTime(recordDuration)}
            </div>
          )}
          {isStreaming && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.accentDanger }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors.accentDanger, animation: 'pulse 2s infinite' }} />
              LIVE {formatTime(streamDuration)}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Error Banners */}
        {hasPermissions === false && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderBottom: `1px solid ${colors.accentDanger}`, color: colors.accentDanger, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: '14px' }}>{permissionError || 'Потрібен доступ до камери та мікрофона'}</span>
          </div>
        )}

        {streamError && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderBottom: `1px solid ${colors.accentDanger}`, color: colors.accentDanger, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: '14px' }}>{streamError}</span>
          </div>
        )}

        {/* Canvas Preview Container (16:9) */}
        <div style={{ 
          width: '100%', 
          aspectRatio: '16/9', 
          backgroundColor: '#000',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <canvas 
            ref={canvasRef} 
            width={1280} 
            height={720} 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain'
            }} 
          />
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Hardware Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <button style={buttonStyle} onClick={toggleCam}>
              {isCamOff ? <CameraOff size={20} color={colors.accentDanger} /> : <Camera size={20} />}
              <span style={{ fontSize: '14px' }}>Камера</span>
            </button>
            <button style={buttonStyle} onClick={toggleMic}>
              {isMicMuted ? <MicOff size={20} color={colors.accentDanger} /> : <Mic size={20} />}
              <span style={{ fontSize: '14px' }}>Мікрофон</span>
            </button>
            <button style={buttonStyle} onClick={toggleFlip}>
              <RefreshCcw size={20} />
              <span style={{ fontSize: '14px' }}>Обернути</span>
            </button>
          </div>

          {/* Layer Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: colors.textSecondary, fontWeight: 500, paddingLeft: '4px' }}>ГРАФІКА</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button style={layers.scoreboard ? activeButtonStyle : buttonStyle} onClick={() => toggleLayer('scoreboard')}>
                <PlaySquare size={18} /> Табло
              </button>
              <button style={layers.events ? activeButtonStyle : buttonStyle} onClick={() => toggleLayer('events')}>
                <List size={18} /> Події
              </button>
              <button style={layers.lineups ? activeButtonStyle : buttonStyle} onClick={() => toggleLayer('lineups')}>
                <Users size={18} /> Склади
              </button>
              <button style={layers.lowerThird ? activeButtonStyle : buttonStyle} onClick={() => toggleLayer('lowerThird')}>
                <Type size={18} /> Титри
              </button>
            </div>
            
            {layers.lowerThird && (
              <div style={{ marginTop: '4px' }}>
                <input 
                  type="text" 
                  placeholder="Текст для титрів..." 
                  value={lowerThirdText}
                  onChange={handleLowerThirdTextChange}
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          {/* Quick Score */}
          <div style={{ ...glassStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', color: colors.textSecondary, fontWeight: 500, textAlign: 'center' }}>ШВИДКЕ УПРАВЛІННЯ РАХУНКОМ</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, textAlign: 'center' }}>{match.team1_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => handleScoreUpdate(1, -1)} style={{ ...buttonStyle, padding: '8px 12px' }}>-1</button>
                  <span style={{ fontSize: '24px', fontWeight: 700, width: '30px', textAlign: 'center' }}>{match.team1_score}</span>
                  <button onClick={() => handleScoreUpdate(1, 1)} style={{ ...buttonStyle, padding: '8px 12px' }}>+1</button>
                </div>
              </div>
              
              <div style={{ fontSize: '20px', color: colors.textSecondary, padding: '0 16px' }}>:</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, textAlign: 'center' }}>{match.team2_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => handleScoreUpdate(2, -1)} style={{ ...buttonStyle, padding: '8px 12px' }}>-1</button>
                  <span style={{ fontSize: '24px', fontWeight: 700, width: '30px', textAlign: 'center' }}>{match.team2_score}</span>
                  <button onClick={() => handleScoreUpdate(2, 1)} style={{ ...buttonStyle, padding: '8px 12px' }}>+1</button>
                </div>
              </div>
              
            </div>
          </div>

          {/* RTMP Settings */}
          <div style={{ ...glassStyle, overflow: 'hidden' }}>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              style={{ 
                width: '100%', background: 'none', border: 'none', color: colors.textPrimary,
                padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                cursor: 'pointer', outline: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={18} />
                <span style={{ fontWeight: 500 }}>Налаштування трансляції (YouTube RTMP)</span>
              </div>
              {showSettings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {showSettings && (
              <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: `1px solid ${colors.borderGlass}` }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: colors.textSecondary, marginBottom: '6px' }}>RTMP URL</label>
                  <input type="text" value={rtmpUrl} onChange={e => setRtmpUrl(e.target.value)} style={inputStyle} placeholder="rtmp://a.rtmp.youtube.com/live2" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: colors.textSecondary, marginBottom: '6px' }}>Stream Key</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showStreamKey ? "text" : "password"} 
                      value={streamKey} 
                      onChange={e => setStreamKey(e.target.value)} 
                      style={{ ...inputStyle, paddingRight: '40px' }} 
                      placeholder="****-****-****-****" 
                    />
                    <button 
                      onClick={() => setShowStreamKey(!showStreamKey)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: colors.textSecondary, cursor: 'pointer' }}
                    >
                      {showStreamKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: colors.textSecondary, marginBottom: '6px' }}>Relay Server WebSocket URL</label>
                  <input type="text" value={relayUrl} onChange={e => setRelayUrl(e.target.value)} style={inputStyle} placeholder="ws://192.168.31.187:3001" />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <button 
                      type="button"
                      onClick={() => setRelayUrl('ws://192.168.31.187:3001')}
                      style={{ ...buttonStyle, padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.08)' }}
                    >
                      📱 Застосувати IP ПК (192.168.31.187:3001)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRelayUrl('ws://localhost:3001')}
                      style={{ ...buttonStyle, padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.08)' }}
                    >
                      💻 Localhost (для ПК)
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: colors.textSecondary, marginTop: '6px' }}>
                    💡 <b>Для смартфона:</b> телефон і ПК мають бути підключені до одного Wi-Fi роутера. Введіть <code>ws://192.168.31.187:3001</code> або натисніть кнопку вище.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', marginBottom: '32px' }}>
            <button 
              onClick={isStreaming ? stopStreaming : startStreaming}
              style={{
                flex: 2,
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '16px',
                fontWeight: 700,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                background: isStreaming 
                  ? `linear-gradient(135deg, ${colors.accentDanger}, #b91c1c)` 
                  : `linear-gradient(135deg, ${colors.accentSuccess}, #059669)`,
                boxShadow: isStreaming ? '0 4px 12px rgba(239, 68, 68, 0.4)' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              <Radio size={20} />
              {isStreaming ? 'ЗУПИНИТИ LIVE' : 'GO LIVE'}
            </button>

            <button 
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                flex: 1,
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: isRecording ? '#fff' : colors.textPrimary,
                border: `1px solid ${isRecording ? 'transparent' : colors.borderGlass}`,
                cursor: 'pointer',
                background: isRecording ? colors.accentDanger : colors.bgGlass,
                transition: 'all 0.2s'
              }}
            >
              <Video size={18} />
              {isRecording ? 'СТОП' : 'ЗАПИС'}
            </button>
          </div>
          
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}} />
    </div>
  );
}
