import { useAuth } from "@/lib/auth";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { 
  ArrowLeft, Play, Pause, RotateCcw, Plus, Minus, ExternalLink, 
  Eye, EyeOff, Clock, Settings, Users, Trophy, Timer, UserPlus,
  Activity, X, List, Save, Edit3, Trash2, CheckCircle, AlertCircle, 
  Download, Upload, FileSpreadsheet, Copy, Sparkles, Zap, Shield,
  Radio, RefreshCw, Volume2, HelpCircle, Palette, Flame, Award
} from "lucide-react";
import * as XLSX from 'xlsx';
import {
  getMatchById,
  updateMatchScore,
  updateMatchTimer,
  updateMatchVisibility,
  updateMatchTeam,
  updateMatchHalf,
  updateMatchNotification,
  updateMatchLineups,
  updateMatchSettings,
  getMatchPlayers,
  addPlayer as apiAddPlayer,
  updatePlayer as apiUpdatePlayer,
  deletePlayer as apiDeletePlayer,
  clearMatchPlayers,
  batchAddPlayers,
  getMatchEvents,
  addEvent as apiAddEvent,
  deleteEvent as apiDeleteEvent,
  updateEventBroadcast,
  updateBroadcastStatus,
  MatchData,
  MatchPlayerData,
  MatchEventData
} from "@/lib/supabase-queries";

export default function MatchControl() {
  const { user: mochaUser, isPending } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<MatchPlayerData[]>([]);
  const [events, setEvents] = useState<MatchEventData[]>([]);
  const [displayTime, setDisplayTime] = useState(0);

  const [activeTab, setActiveTab] = useState<'cockpit' | 'players' | 'events' | 'graphics' | 'settings' | 'streaming'>('cockpit');
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [youtubeKey, setYoutubeKey] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('rtmp://a.rtmp.youtube.com/live2');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [quickActionModal, setQuickActionModal] = useState<{
    type: 'goal' | 'yellow_card' | 'red_card' | 'substitution';
    team: 1 | 2;
  } | null>(null);

  // Form states
  const [newPlayer, setNewPlayer] = useState({ team: 1, name: '', number: '', position: '', isOnField: true });
  const [editingPlayer, setEditingPlayer] = useState<MatchPlayerData | null>(null);
  const [newEvent, setNewEvent] = useState({ type: 'goal', team: 1, player: '', minute: 0, description: '', substituted_player: '' });
  const [customBannerText, setCustomBannerText] = useState('');
  const [addedMinutes, setAddedMinutes] = useState<number | null>(null);

  // Debounce refs for team names and colors
  const team1NameTimer = useRef<NodeJS.Timeout | null>(null);
  const team2NameTimer = useRef<NodeJS.Timeout | null>(null);

  // Feedback state
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
  }, []);

  const calculateCurrentTime = useCallback((m: MatchData): number => {
    if (!m.is_timer_running || !m.timer_start_timestamp || m.timer_server_time === null || m.timer_server_time === undefined) {
      return m.current_time;
    }
    
    const now = Date.now() / 1000;
    const elapsed = now - m.timer_start_timestamp;
    const calculatedTime = Math.round(m.timer_server_time + elapsed);
    
    return Math.min(calculatedTime, m.timer_duration);
  }, []);

  const getDisplayTime = useCallback((m: MatchData): number => {
    const currentTime = calculateCurrentTime(m);
    
    if (m.current_half === 2) {
      return currentTime + (m.half_time_offset || m.timer_duration);
    }
    return currentTime;
  }, [calculateCurrentTime]);

  const fetchMatch = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getMatchById(id);
      if (data) {
        setMatch(data);
        setDisplayTime(getDisplayTime(data));
        if (data.youtube_stream_key) setYoutubeKey(data.youtube_stream_key);
        if (data.youtube_rtmp_url) setYoutubeUrl(data.youtube_rtmp_url);
        if (data.is_broadcasting !== undefined) setIsBroadcasting(data.is_broadcasting);
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching match:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, getDisplayTime]);

  const fetchPlayers = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getMatchPlayers(id);
      setPlayers(data);
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  }, [id]);

  const fetchEvents = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getMatchEvents(id);
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }, [id]);

  useEffect(() => {
    if (!isPending && !mochaUser) {
      navigate("/");
      return;
    }

    if (id) {
      fetchMatch();
      fetchPlayers();
      fetchEvents();
    }
  }, [mochaUser, isPending, navigate, id, fetchMatch, fetchPlayers, fetchEvents]);

  // Polling sync with page visibility awareness
  useEffect(() => {
    if (!id) return;
    const syncInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchMatch();
      }
    }, 2500);

    return () => {
      clearInterval(syncInterval);
    };
  }, [id, fetchMatch]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (match?.is_timer_running) {
      intervalId = setInterval(() => {
        if (match) setDisplayTime(getDisplayTime(match));
      }, 100);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [match, getDisplayTime]);

  const copyToClipboard = async (url: string, type: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showFeedback('success', `✨ Посилання на ${type} скопійовано!`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showFeedback('error', 'Не вдалося скопіювати посилання');
    }
  };

  const updateScore = async (team1Score: number, team2Score: number) => {
    if (!match) return;
    const safeT1 = Math.max(0, team1Score);
    const safeT2 = Math.max(0, team2Score);
    const success = await updateMatchScore(match.id, safeT1, safeT2);
    if (success) {
      setMatch(prev => prev ? { ...prev, team1_score: safeT1, team2_score: safeT2 } : null);
      showFeedback('success', `⚽ Рахунок оновлено: ${safeT1} - ${safeT2}`);
    } else {
      showFeedback('error', 'Помилка оновлення рахунку');
    }
  };

  const updateTimerState = async (currentTime: number, isRunning: boolean) => {
    if (!match) return;
    const now = Date.now() / 1000;
    const params = {
      current_time: currentTime,
      is_timer_running: isRunning,
      timer_start_timestamp: isRunning ? now : null,
      timer_server_time: isRunning ? currentTime : null
    };

    const success = await updateMatchTimer(match.id, params);
    if (success) {
      setMatch(prev => prev ? { 
        ...prev, 
        current_time: currentTime, 
        is_timer_running: isRunning,
        timer_start_timestamp: isRunning ? now : undefined,
        timer_server_time: isRunning ? currentTime : undefined
      } : null);
    } else {
      showFeedback('error', 'Помилка оновлення таймера');
    }
  };

  const updateVisibility = async (isVisible: boolean) => {
    if (!match) return;
    const success = await updateMatchVisibility(match.id, isVisible);
    if (success) {
      setMatch(prev => prev ? { ...prev, is_visible: isVisible } : null);
      showFeedback('success', isVisible ? '🔴 Табло В ЕФІРІ' : '⚪ Табло ПРИХОВАНО з ефіру');
    } else {
      showFeedback('error', 'Помилка зміни видимості');
    }
  };

  const updateTeamInfoDebounced = (team: 'team1' | 'team2', name: string, logoUrl: string) => {
    if (!match) return;
    const field1 = team === 'team1' ? 'team1_name' : 'team2_name';
    const field2 = team === 'team1' ? 'team1_logo_url' : 'team2_logo_url';
    setMatch(prev => prev ? { ...prev, [field1]: name, [field2]: logoUrl || null } : null);

    const ref = team === 'team1' ? team1NameTimer : team2NameTimer;
    if (ref.current) clearTimeout(ref.current);

    ref.current = setTimeout(async () => {
      await updateMatchTeam(match.id, { [field1]: name, [field2]: logoUrl || null });
    }, 600);
  };

  const switchHalf = async (half: number) => {
    if (!match) return;
    const halfTimeOffset = half === 2 ? match.timer_duration : 0;
    const success = await updateMatchHalf(match.id, half, halfTimeOffset);
    
    if (success) {
      setMatch(prev => prev ? { 
        ...prev, 
        current_half: half, 
        current_time: 0, 
        half_time_offset: halfTimeOffset, 
        is_timer_running: false 
      } : null);
      showFeedback('success', `⏱️ Переключено на ${half === 1 ? '1-й' : '2-й'} тайм`);
    } else {
      showFeedback('error', 'Помилка зміни тайму');
    }
  };

  const toggleTimer = () => {
    if (!match) return;
    const newRunning = !match.is_timer_running;
    updateTimerState(match.current_time, newRunning);
    showFeedback('success', newRunning ? '▶️ Таймер запущено' : '⏸️ Таймер на паузі');
  };

  const resetTimer = () => {
    if (!match) return;
    updateTimerState(0, false);
    showFeedback('success', '🔄 Таймер скинуто (00:00)');
  };

  const adjustTimer = (delta: number) => {
    if (!match) return;
    const currentTime = calculateCurrentTime(match);
    const newTime = Math.max(0, Math.min(match.timer_duration, currentTime + delta));
    updateTimerState(newTime, match.is_timer_running);
    showFeedback('success', `Час змінено на ${delta > 0 ? `+${delta/60}` : `${delta/60}`} хв`);
  };

  const showNotification = async (text: string) => {
    if (!match) return;
    const success = await updateMatchNotification(match.id, true, text);
    if (success) {
      setMatch(prev => prev ? { ...prev, show_notification: true, current_notification_text: text } : null);
      showFeedback('success', `📢 Титри показано: "${text}"`);
    } else {
      showFeedback('error', 'Помилка показу сповіщення');
    }
  };

  const hideNotification = async () => {
    if (!match) return;
    const success = await updateMatchNotification(match.id, false, null);
    if (success) {
      setMatch(prev => prev ? { ...prev, show_notification: false, current_notification_text: null } : null);
      showFeedback('success', 'Титри приховано з ефіру');
    } else {
      showFeedback('error', 'Помилка приховування сповіщення');
    }
  };

  const toggleLineups = async () => {
    if (!match) return;
    const newShow = !match.show_lineups;
    const success = await updateMatchLineups(match.id, newShow);
    if (success) {
      setMatch(prev => prev ? { ...prev, show_lineups: newShow } : null);
      showFeedback('success', newShow ? '👥 Склади показано в ефірі' : '👥 Склади приховано з ефіру');
    } else {
      showFeedback('error', 'Помилка керування складами');
    }
  };

  const handleUpdateGraphics = async (updates: Partial<MatchData>) => {
    if (!match) return;
    setMatch(prev => prev ? { ...prev, ...updates } : null);
    const success = await updateMatchSettings(match.id, updates);
    if (success) {
      showFeedback('success', '🎨 Графіку табло оновлено');
    } else {
      showFeedback('error', 'Помилка збереження графіки');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentMinute = (): number => {
    if (!match) return 0;
    const timeInMins = Math.floor(displayTime / 60);
    return Math.max(1, timeInMins + (match.current_half === 2 ? 45 : 0));
  };

  // Quick Action Submission (Goal, Card, Substitution)
  const handleQuickAction = async (playerName: string, customMinute?: number) => {
    if (!quickActionModal || !id) return;
    const { type, team } = quickActionModal;
    const minute = customMinute || getCurrentMinute();

    // If goal, auto-increment score
    if (type === 'goal' && match) {
      if (team === 1) {
        await updateScore(match.team1_score + 1, match.team2_score);
      } else {
        await updateScore(match.team1_score, match.team2_score + 1);
      }
      showNotification(`⚽ ГОЛ! ${playerName} (${minute}')`);
    }

    const created = await apiAddEvent(Number(id), {
      event_type: type,
      team,
      player_name: playerName.trim(),
      minute,
      description: type === 'goal' ? 'Гол' : type === 'yellow_card' ? 'Жовта картка' : 'Червона картка',
      substituted_player_name: null,
      is_visible: true,
      is_broadcast: true
    });

    if (created) {
      fetchEvents();
      showFeedback('success', `✅ Подію зафіксовано: ${type === 'goal' ? 'ГОЛ' : type === 'yellow_card' ? 'Жовта картка' : 'Червона картка'} (${playerName})`);
    }

    setQuickActionModal(null);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const activeElement = document.activeElement?.tagName.toLowerCase();
      if (activeElement === 'input' || activeElement === 'textarea' || activeElement === 'select') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      } else if (e.code === 'Digit1' && !e.shiftKey && match) {
        e.preventDefault();
        updateScore(match.team1_score + 1, match.team2_score);
      } else if (e.code === 'Digit1' && e.shiftKey && match) {
        e.preventDefault();
        updateScore(match.team1_score - 1, match.team2_score);
      } else if (e.code === 'Digit2' && !e.shiftKey && match) {
        e.preventDefault();
        updateScore(match.team1_score, match.team2_score + 1);
      } else if (e.code === 'Digit2' && e.shiftKey && match) {
        e.preventDefault();
        updateScore(match.team1_score, match.team2_score - 1);
      } else if (e.code === 'KeyV' && match) {
        e.preventDefault();
        updateVisibility(!match.is_visible);
      } else if (e.code === 'KeyH' && match) {
        e.preventDefault();
        switchHalf(match.current_half === 1 ? 2 : 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [match]);

  // Excel handlers
  const downloadExcelTemplate = () => {
    if (!match) return;
    const template = [
      { 'Команда (1 або 2)': 1, 'Номер гравця': 1, 'Ім\'я гравця': 'Іван Іваненко', 'Позиція': 'Воротар', 'На полі (ТАК/НІ)': 'ТАК' },
      { 'Команда (1 або 2)': 1, 'Номер гравця': 7, 'Ім\'я гравця': 'Петро Петренко', 'Позиція': 'Півзахисник', 'На полі (ТАК/НІ)': 'ТАК' },
      { 'Команда (1 або 2)': 2, 'Номер гравця': 10, 'Ім\'я гравця': 'Олександр Олександренко', 'Позиція': 'Нападник', 'На полі (ТАК/НІ)': 'ТАК' }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Склади команд');
    XLSX.writeFile(wb, `склади_${match.team1_name}_vs_${match.team2_name}.xlsx`);
    showFeedback('success', 'Шаблон Excel завантажено');
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    try {
      showFeedback('success', 'Обробка файлу Excel...');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error('Файл не містить даних');
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: false });
      if (jsonData.length < 2) throw new Error('Файл не містить даних про гравців');

      const headerRow = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);
      const getCol = (names: string[]) => headerRow.findIndex(h => names.some(n => String(h || '').toLowerCase().includes(n)));
      const teamIdx = getCol(['команда', 'team']);
      const nameIdx = getCol(['ім\'я', 'імя', 'name', 'гравець', 'player']);
      const numIdx = getCol(['номер', 'number']);
      const posIdx = getCol(['позиція', 'position', 'роль']);
      const fieldIdx = getCol(['поле', 'field', 'на полі']);

      const playerRows: Omit<MatchPlayerData, "id" | "match_id">[] = [];

      for (const row of dataRows) {
        const team = parseInt(String(row[teamIdx] || '').trim());
        const playerName = String(row[nameIdx] || '').trim();
        const playerNumber = parseInt(String(row[numIdx] || '').trim()) || null;
        const position = String(row[posIdx] || '').trim() || null;
        const onFieldText = String(row[fieldIdx] || '').trim().toUpperCase();
        const isOnField = onFieldText === 'ТАК' || onFieldText === 'YES' || onFieldText === 'TRUE' || onFieldText === '1' || onFieldText === '';

        if (playerName && [1, 2].includes(team)) {
          playerRows.push({
            team,
            player_name: playerName,
            player_number: playerNumber,
            position,
            is_starter: isOnField,
            is_on_field: isOnField
          });
        }
      }

      if (playerRows.length > 0) {
        const success = await batchAddPlayers(Number(id), playerRows);
        if (success) {
          fetchPlayers();
          showFeedback('success', `✅ Успішно додано ${playerRows.length} гравців`);
        }
      }
    } catch (error) {
      console.error('Excel upload error:', error);
      showFeedback('error', 'Помилка читання Excel файлу');
    } finally {
      event.target.value = '';
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayer.name.trim() || !id) {
      showFeedback('error', 'Введіть ім\'я гравця');
      return;
    }

    const created = await apiAddPlayer(Number(id), {
      team: newPlayer.team,
      player_name: newPlayer.name.trim(),
      player_number: newPlayer.number ? parseInt(newPlayer.number) : null,
      position: newPlayer.position.trim() || null,
      is_starter: newPlayer.isOnField,
      is_on_field: newPlayer.isOnField
    });

    if (created) {
      setNewPlayer({ team: 1, name: '', number: '', position: '', isOnField: true });
      fetchPlayers();
      showFeedback('success', 'Гравця додано');
    }
  };

  const handleDeletePlayer = async (playerId: number) => {
    if (!window.confirm('Видалити гравця?')) return;
    const success = await apiDeletePlayer(playerId);
    if (success) {
      fetchPlayers();
      showFeedback('success', 'Гравця видалено');
    }
  };

  const handleClearAllPlayers = async () => {
    if (!id || !window.confirm('Видалити всіх гравців з обох команд?')) return;
    const success = await clearMatchPlayers(Number(id));
    if (success) {
      setPlayers([]);
      showFeedback('success', 'Всіх гравців видалено');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!window.confirm('Видалити подію?')) return;
    const success = await apiDeleteEvent(eventId);
    if (success) {
      fetchEvents();
      showFeedback('success', 'Подію видалено');
    }
  };

  const handleToggleEventBroadcast = async (eventId: number, isBroadcast: boolean) => {
    const success = await updateEventBroadcast(eventId, !isBroadcast);
    if (success) {
      setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, is_broadcast: !isBroadcast } : ev));
      showFeedback('success', !isBroadcast ? '📺 ПОКАЗАНО В ЕФІРІ' : '⚪ ПРИХОВАНО З ЕФІРУ');
    }
  };

  if (loading || !match) {
    return (
      <div className="min-h-screen bg-[#06080F] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin"></div>
          <Flame className="w-6 h-6 text-blue-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-slate-400 font-medium text-sm">Завантаження кімнати керування...</p>
      </div>
    );
  }

  const scoreboardUrl = `${window.location.origin}/scoreboard?match=${match.id}`;
  const lineupsUrl = `${window.location.origin}/lineups?match=${match.id}`;
  const eventsUrl = `${window.location.origin}/events?match=${match.id}`;

  const team1Players = players.filter(p => p.team === 1);
  const team2Players = players.filter(p => p.team === 2);

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 pb-28 md:pb-12 selection:bg-blue-600 selection:text-white">
      {/* Toast feedback */}
      {feedback && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-xl text-white font-medium flex items-center space-x-3 transition-all animate-bounce ${
          feedback.type === 'success' ? 'bg-emerald-600/90 border border-emerald-400/30' : 'bg-rose-600/90 border border-rose-400/30'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-200" /> : <AlertCircle className="h-5 w-5 text-rose-200" />}
          <span className="text-sm">{feedback.message}</span>
        </div>
      )}

      {/* Top Luxury Live Bar */}
      <header className="sticky top-0 z-40 bg-[#0A0D18]/80 backdrop-blur-2xl border-b border-white/[0.08]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link 
              to="/dashboard" 
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all border border-white/[0.06]"
              title="До списку матчів"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Match Cockpit</span>
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                <button
                  onClick={() => updateVisibility(!match.is_visible)}
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
                    match.is_visible 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 glow-red' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${match.is_visible ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'}`}></span>
                  <span>{match.is_visible ? 'НАЖИВО' : 'ПРИХОВАНО'}</span>
                </button>
              </div>
              <h1 className="text-base sm:text-lg font-bold font-display tracking-tight text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {match.team1_name} vs {match.team2_name}
              </h1>
            </div>
          </div>

          {/* Quick Action Center */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-slate-300 border border-white/[0.06] transition-all"
              title="Гарячі клавіші"
            >
              <HelpCircle className="h-4 w-4 text-amber-400" />
              <span>Клавіші</span>
            </button>

            {/* Quick Live Studio Launch Button */}
            <Link
              to={`/studio/${match.id}`}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-lg transition-all transform active:scale-95"
              style={{
                background: match.is_broadcasting
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: match.is_broadcasting
                  ? '0 4px 20px rgba(239,68,68,0.3)'
                  : '0 4px 20px rgba(16,185,129,0.3)',
              }}
              title="Відкрити мобільну студію трансляції з накладанням графіки"
            >
              <Radio className={`h-4 w-4 ${match.is_broadcasting ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Студія Live</span>
              <span>{match.is_broadcasting ? '🔴' : '🎥'}</span>
            </Link>

            {/* Quick OBS Copy Pill */}
            <div className="relative group">
              <button
                onClick={() => copyToClipboard(scoreboardUrl, "табло OBS")}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-500/20 border border-blue-400/30 transition-all transform active:scale-95"
              >
                <Radio className="h-4 w-4 text-blue-200" />
                <span className="hidden sm:inline">Скопіювати</span>
                <span>OBS</span>
              </button>
            </div>

            <a
              href={scoreboardUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition-all"
              title="Відкрити табло в новому вікні"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        
        {/* ===================== HERO SCORE & TIMER ARENA ===================== */}
        <section className="relative glass-panel rounded-3xl p-6 sm:p-8 mb-8 overflow-hidden border border-white/[0.08] shadow-2xl">
          {/* Subtle Ambient Background Mesh */}
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Status & Half Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-white/[0.08]">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => switchHalf(1)}
                className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  match.current_half === 1
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400/40'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 border border-white/[0.06]'
                }`}
              >
                1-й тайм (0-45')
              </button>
              <button
                onClick={() => switchHalf(2)}
                className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  match.current_half === 2
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400/40'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 border border-white/[0.06]'
                }`}
              >
                2-й тайм (45-90')
              </button>
            </div>

            {/* Extra Time Stoppage Pills */}
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Доданий час:</span>
              {[1, 2, 3, 4, 5].map((mins) => (
                <button
                  key={mins}
                  onClick={() => {
                    if (addedMinutes === mins) {
                      setAddedMinutes(null);
                      hideNotification();
                    } else {
                      setAddedMinutes(mins);
                      showNotification(`+${mins}' ДОДАНИЙ ЧАС`);
                    }
                  }}
                  className={`w-8 h-8 rounded-lg text-xs font-bold font-mono transition-all ${
                    addedMinutes === mins
                      ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06]'
                  }`}
                >
                  +{mins}
                </button>
              ))}
            </div>
          </div>

          {/* Central Live Cockpit: Team 1 vs Team 2 + Central Digital Clock */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Team 1 Control Console */}
            <div className="lg:col-span-5 glass-card rounded-2xl p-5 sm:p-6 border border-white/[0.08]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border border-white/20 shadow-md"
                    style={{ backgroundColor: match.team1_color || '#2563eb' }}
                  >
                    {match.team1_logo_url ? (
                      <img src={match.team1_logo_url} alt="" className="w-8 h-8 rounded object-contain" />
                    ) : (
                      <span>{match.team1_name ? match.team1_name.slice(0, 1).toUpperCase() : '1'}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={match.team1_name}
                    onChange={(e) => updateTeamInfoDebounced('team1', e.target.value, match.team1_logo_url || '')}
                    className="bg-transparent border-b border-white/[0.1] focus:border-blue-500 text-lg sm:text-xl font-bold font-display text-white outline-none w-36 sm:w-44 px-1"
                    placeholder="Команда 1"
                  />
                </div>
                <span className="text-xs font-mono uppercase text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-md">ГОСПОДАРІ</span>
              </div>

              {/* Score Display + Big Tactile Buttons */}
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateScore(match.team1_score - 1, match.team2_score)}
                    className="w-12 h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-slate-300 hover:text-white flex items-center justify-center border border-white/[0.08] transition-all shadow"
                    title="Зменшити рахунок (-1)"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => updateScore(match.team1_score + 1, match.team2_score)}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-blue-500/25 border border-blue-400/40 transition-all"
                    title="Збільшити рахунок (+1)"
                  >
                    <Plus className="h-8 w-8 stroke-[3]" />
                  </button>
                </div>

                <div className="text-right">
                  <div className="text-6xl sm:text-7xl font-black font-display font-mono-tabular tracking-tighter text-white drop-shadow-md">
                    {match.team1_score}
                  </div>
                </div>
              </div>

              {/* Quick Actions (Goal, Yellow, Red, Sub) */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setQuickActionModal({ type: 'goal', team: 1 })}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all active:scale-95"
                >
                  <Trophy className="h-3.5 w-3.5" />
                  <span>+ Гол</span>
                </button>
                <button
                  onClick={() => setQuickActionModal({ type: 'yellow_card', team: 1 })}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold transition-all active:scale-95"
                >
                  <span className="w-2.5 h-3.5 bg-amber-400 rounded-sm"></span>
                  <span>Картка</span>
                </button>
                <button
                  onClick={() => setQuickActionModal({ type: 'substitution', team: 1 })}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs font-bold transition-all active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Заміна</span>
                </button>
              </div>
            </div>

            {/* Central Master Clock Console */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center glass-card rounded-2xl p-5 border border-white/[0.08] text-center">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">МАТЧ-ТАЙМЕР</span>
              
              <div className="text-4xl sm:text-5xl font-black font-mono-tabular tracking-tight text-amber-400 mb-3 drop-shadow-md">
                {formatTime(displayTime)}
              </div>

              {/* Master Play / Pause Button */}
              <button
                onClick={toggleTimer}
                className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm transition-all shadow-lg active:scale-95 mb-2.5 ${
                  match.is_timer_running
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20 font-black'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
                }`}
              >
                {match.is_timer_running ? (
                  <>
                    <Pause className="h-5 w-5 fill-current" />
                    <span>ПАУЗА (Space)</span>
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 fill-current" />
                    <span>СТАРТ (Space)</span>
                  </>
                )}
              </button>

              {/* Micro Time Adjusters */}
              <div className="grid grid-cols-3 gap-1.5 w-full">
                <button
                  onClick={() => adjustTimer(-60)}
                  className="py-1 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-xs font-mono transition-colors border border-white/[0.06]"
                  title="Відняти 1 хвилину"
                >
                  -1m
                </button>
                <button
                  onClick={() => adjustTimer(60)}
                  className="py-1 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-xs font-mono transition-colors border border-white/[0.06]"
                  title="Додати 1 хвилину"
                >
                  +1m
                </button>
                <button
                  onClick={resetTimer}
                  className="py-1 px-2 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-mono transition-colors border border-white/[0.06]"
                  title="Скинути таймер"
                >
                  <RotateCcw className="h-3.5 w-3.5 mx-auto" />
                </button>
              </div>
            </div>

            {/* Team 2 Control Console */}
            <div className="lg:col-span-5 glass-card rounded-2xl p-5 sm:p-6 border border-white/[0.08]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-md">ГОСТІ</span>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={match.team2_name}
                    onChange={(e) => updateTeamInfoDebounced('team2', e.target.value, match.team2_logo_url || '')}
                    className="bg-transparent border-b border-white/[0.1] focus:border-amber-500 text-lg sm:text-xl font-bold font-display text-white text-right outline-none w-36 sm:w-44 px-1"
                    placeholder="Команда 2"
                  />
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border border-white/20 shadow-md"
                    style={{ backgroundColor: match.team2_color || '#d97706' }}
                  >
                    {match.team2_logo_url ? (
                      <img src={match.team2_logo_url} alt="" className="w-8 h-8 rounded object-contain" />
                    ) : (
                      <span>{match.team2_name ? match.team2_name.slice(0, 1).toUpperCase() : '2'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Score Display + Big Tactile Buttons */}
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="text-left">
                  <div className="text-6xl sm:text-7xl font-black font-display font-mono-tabular tracking-tighter text-white drop-shadow-md">
                    {match.team2_score}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateScore(match.team1_score, match.team2_score - 1)}
                    className="w-12 h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-slate-300 hover:text-white flex items-center justify-center border border-white/[0.08] transition-all shadow"
                    title="Зменшити рахунок (-1)"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => updateScore(match.team1_score, match.team2_score + 1)}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black flex items-center justify-center shadow-xl shadow-amber-500/25 border border-amber-300/40 transition-all"
                    title="Збільшити рахунок (+1)"
                  >
                    <Plus className="h-8 w-8 stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Quick Actions (Goal, Yellow, Red, Sub) */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setQuickActionModal({ type: 'goal', team: 2 })}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all active:scale-95"
                >
                  <Trophy className="h-3.5 w-3.5" />
                  <span>+ Гол</span>
                </button>
                <button
                  onClick={() => setQuickActionModal({ type: 'yellow_card', team: 2 })}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-bold transition-all active:scale-95"
                >
                  <span className="w-2.5 h-3.5 bg-amber-400 rounded-sm"></span>
                  <span>Картка</span>
                </button>
                <button
                  onClick={() => setQuickActionModal({ type: 'substitution', team: 2 })}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs font-bold transition-all active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Заміна</span>
                </button>
              </div>
            </div>

          </div>

          {/* Quick Notification Broadcast Trigger Bar */}
          <div className="mt-6 pt-6 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-grow max-w-xl">
              <input
                type="text"
                value={customBannerText}
                onChange={(e) => setCustomBannerText(e.target.value)}
                placeholder="Текст для показу в трансляції (напр. ПЕНАЛЬТІ / VAR ПЕРЕВІРКА)..."
                className="glass-input rounded-xl px-4 py-2 text-sm flex-grow outline-none border border-white/[0.1] focus:border-blue-500"
              />
              <button
                onClick={() => {
                  if (customBannerText.trim()) showNotification(customBannerText.trim());
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all whitespace-nowrap"
              >
                Показати
              </button>
              {match.show_notification && (
                <button
                  onClick={hideNotification}
                  className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all whitespace-nowrap"
                >
                  Приховати
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleLineups}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  match.show_lineups
                    ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/25'
                    : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]'
                }`}
              >
                {match.show_lineups ? '👥 Склади в ефірі' : '👥 Показати склади'}
              </button>
            </div>
          </div>
        </section>

        {/* ===================== NAVIGATION TABS ===================== */}
        <div className="flex items-center space-x-2 border-b border-white/[0.08] mb-6 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'cockpit', label: '⚡ Пульт та прев\'ю', icon: Zap },
            { id: 'streaming', label: '📡 Студія & YouTube Live', icon: Radio },
            { id: 'players', label: '👥 Склади команд', icon: Users, count: players.length },
            { id: 'events', label: '📝 Хроніка подій', icon: Activity, count: events.length },
            { id: 'graphics', label: '🎨 Стиль & Графіка', icon: Palette },
            { id: 'settings', label: '⚙️ Налаштування', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white/[0.1] text-white border border-white/[0.15] shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-white/[0.06] text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ===================== TAB 1: COCKPIT & LIVE PREVIEW ===================== */}
        {activeTab === 'cockpit' && (
          <div className="space-y-6">
            {/* Live OBS Mini-Preview Card */}
            <div className="glass-panel rounded-2xl p-6 border border-white/[0.08]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Radio className="h-5 w-5 text-blue-400 animate-pulse" />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300">Прямий перегляд табло в OBS</h3>
                </div>
                <span className="text-xs text-slate-400">Оновлюється автоматично в реальному часі</span>
              </div>

              {/* Simulated Broadcast Canvas */}
              <div className="bg-[#090C16] border border-white/[0.06] rounded-xl p-6 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden shadow-inner">
                
                {/* Simulated Scoreboard Overlay */}
                <div className="flex items-center bg-[#07090F]/90 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl overflow-hidden font-display">
                  {/* Left Team */}
                  <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-900/60 to-transparent">
                    <span className="font-extrabold text-sm sm:text-base text-white">{match.team1_name || 'КОМАНДА 1'}</span>
                  </div>
                  {/* Score */}
                  <div className="flex items-center space-x-2 px-3 py-2 bg-black/80 text-white font-mono-tabular font-black text-lg border-x border-white/10">
                    <span className="text-blue-400">{match.team1_score}</span>
                    <span className="text-slate-500">:</span>
                    <span className="text-amber-400">{match.team2_score}</span>
                  </div>
                  {/* Right Team */}
                  <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-l from-amber-900/60 to-transparent">
                    <span className="font-extrabold text-sm sm:text-base text-white">{match.team2_name || 'КОМАНДА 2'}</span>
                  </div>
                  {/* Timer */}
                  <div className="px-3 py-2 bg-amber-500 text-slate-950 font-black font-mono-tabular text-sm">
                    {formatTime(displayTime)}
                  </div>
                </div>

                {/* Banner alert if active */}
                {match.show_notification && match.current_notification_text && (
                  <div className="mt-3 px-4 py-1 rounded-full bg-rose-600 text-white font-bold text-xs shadow-lg animate-goal-flash uppercase tracking-wider">
                    {match.current_notification_text}
                  </div>
                )}
              </div>
            </div>

            {/* Quick OBS URL Generator Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-card rounded-2xl p-4 border border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-white">Основне табло (Scoreboard)</div>
                  <div className="text-xs text-slate-400 truncate max-w-[200px]">{scoreboardUrl}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(scoreboardUrl, "табло OBS")}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow"
                  title="Скопіювати посилання"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-white">Склади команд (Lineups)</div>
                  <div className="text-xs text-slate-400 truncate max-w-[200px]">{lineupsUrl}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(lineupsUrl, "склади OBS")}
                  className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-all shadow"
                  title="Скопіювати посилання"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <div className="glass-card rounded-2xl p-4 border border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-white">Хроніка подій (Events)</div>
                  <div className="text-xs text-slate-400 truncate max-w-[200px]">{eventsUrl}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(eventsUrl, "події OBS")}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow"
                  title="Скопіювати посилання"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: SQUAD & PLAYERS ===================== */}
        {activeTab === 'players' && (
          <div className="space-y-6">
            {/* Squad Action Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-white/[0.08]">
              <div className="flex items-center space-x-2">
                <button
                  onClick={downloadExcelTemplate}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Завантажити шаблон Excel</span>
                </button>

                <label className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <span>Імпортувати з Excel</span>
                  <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
                </label>
              </div>

              {players.length > 0 && (
                <button
                  onClick={handleClearAllPlayers}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Очистити всіх гравців</span>
                </button>
              )}
            </div>

            {/* Add Player Form */}
            <div className="glass-panel p-5 rounded-2xl border border-white/[0.08]">
              <h3 className="font-bold text-sm mb-4 text-white flex items-center space-x-2">
                <UserPlus className="h-4 w-4 text-blue-400" />
                <span>Швидке додавання гравця вручну</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <select
                    value={newPlayer.team}
                    onChange={(e) => setNewPlayer(prev => ({ ...prev, team: Number(e.target.value) as 1 | 2 }))}
                    className="glass-input rounded-xl px-3 py-2.5 text-xs sm:text-sm w-full outline-none"
                  >
                    <option value={1} className="bg-slate-900">{match.team1_name || 'Команда 1'}</option>
                    <option value={2} className="bg-slate-900">{match.team2_name || 'Команда 2'}</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Ім'я та прізвище гравця"
                    value={newPlayer.name}
                    onChange={(e) => setNewPlayer(prev => ({ ...prev, name: e.target.value }))}
                    className="glass-input rounded-xl px-3 py-2.5 text-xs sm:text-sm w-full outline-none"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Номер (#)"
                    value={newPlayer.number}
                    onChange={(e) => setNewPlayer(prev => ({ ...prev, number: e.target.value }))}
                    className="glass-input rounded-xl px-3 py-2.5 text-xs sm:text-sm w-full outline-none"
                  />
                </div>
                <div>
                  <button
                    onClick={handleAddPlayer}
                    className="w-full h-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-all shadow"
                  >
                    Додати гравця
                  </button>
                </div>
              </div>
            </div>

            {/* Players Lists: Team 1 & Team 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team 1 Players */}
              <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
                <h4 className="font-bold text-sm text-blue-400 mb-3 flex items-center justify-between">
                  <span>{match.team1_name} ({team1Players.length})</span>
                </h4>
                {team1Players.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">Немає гравців. Додайте вручну або з Excel.</div>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                    {team1Players.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-300 font-mono font-bold flex items-center justify-center">
                            {p.player_number || '-'}
                          </span>
                          <span className="font-semibold text-white">{p.player_name}</span>
                          {p.position && <span className="text-slate-500">({p.position})</span>}
                        </div>
                        <button
                          onClick={() => handleDeletePlayer(p.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Team 2 Players */}
              <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
                <h4 className="font-bold text-sm text-amber-400 mb-3 flex items-center justify-between">
                  <span>{match.team2_name} ({team2Players.length})</span>
                </h4>
                {team2Players.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">Немає гравців. Додайте вручну або з Excel.</div>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                    {team2Players.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-md bg-amber-600/20 text-amber-300 font-mono font-bold flex items-center justify-center">
                            {p.player_number || '-'}
                          </span>
                          <span className="font-semibold text-white">{p.player_name}</span>
                          {p.position && <span className="text-slate-500">({p.position})</span>}
                        </div>
                        <button
                          onClick={() => handleDeletePlayer(p.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: EVENTS & TIMELINE ===================== */}
        {activeTab === 'events' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300">Хроніка подій матчу</h3>
              <span className="text-xs text-slate-400">Всього подій: {events.length}</span>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                Поки що немає зафіксованих подій. Додавайте голи та картки через пульт керування.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((ev) => (
                  <div 
                    key={ev.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-1 rounded-md bg-white/[0.06] font-mono font-bold text-xs text-amber-400">
                        {ev.minute}'
                      </span>
                      <span className="text-base">
                        {ev.event_type === 'goal' ? '⚽' : ev.event_type === 'yellow_card' ? '🟨' : ev.event_type === 'red_card' ? '🟥' : '🔄'}
                      </span>
                      <div>
                        <span className="font-bold text-sm text-white mr-2">{ev.player_name}</span>
                        <span className="text-xs text-slate-400">
                          ({ev.team === 1 ? match.team1_name : match.team2_name})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleEventBroadcast(ev.id, !!ev.is_broadcast)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          ev.is_broadcast 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {ev.is_broadcast ? 'В ЕФІРІ' : 'ПРИХОВАНО'}
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 4: GRAPHICS & THEMES ===================== */}
        {activeTab === 'graphics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] space-y-4">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Palette className="h-5 w-5 text-blue-400" />
                <span>Кольорова гама та логотипи</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Колір команди 1 ({match.team1_name})</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={match.team1_color || '#2563eb'}
                    onChange={(e) => handleUpdateGraphics({ team1_color: e.target.value })}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{match.team1_color || '#2563eb'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Колір команди 2 ({match.team2_name})</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={match.team2_color || '#d97706'}
                    onChange={(e) => handleUpdateGraphics({ team2_color: e.target.value })}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{match.team2_color || '#d97706'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Логотип команди 1 (URL)</label>
                <input
                  type="text"
                  value={match.team1_logo_url || ''}
                  onChange={(e) => updateTeamInfoDebounced('team1', match.team1_name, e.target.value)}
                  placeholder="https://example.com/logo1.png"
                  className="glass-input rounded-xl px-3 py-2 text-xs w-full outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Логотип команди 2 (URL)</label>
                <input
                  type="text"
                  value={match.team2_logo_url || ''}
                  onChange={(e) => updateTeamInfoDebounced('team2', match.team2_name, e.target.value)}
                  placeholder="https://example.com/logo2.png"
                  className="glass-input rounded-xl px-3 py-2 text-xs w-full outline-none"
                />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] space-y-4">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <span>Розміщення та стиль табло</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Розташування на екрані OBS</label>
                <select
                  value={match.scoreboard_position || 'top-center'}
                  onChange={(e) => handleUpdateGraphics({ scoreboard_position: e.target.value })}
                  className="glass-input rounded-xl px-3 py-2 text-xs sm:text-sm w-full outline-none"
                >
                  <option value="top-center" className="bg-slate-900">Зверху по центру</option>
                  <option value="top-left" className="bg-slate-900">Зверху зліва</option>
                  <option value="top-right" className="bg-slate-900">Зверху справа</option>
                  <option value="bottom-center" className="bg-slate-900">Знизу по центру</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Стиль оформлення графіки</label>
                <select
                  value={match.scoreboard_style || 'champions'}
                  onChange={(e) => handleUpdateGraphics({ scoreboard_style: e.target.value })}
                  className="glass-input rounded-xl px-3 py-2 text-xs sm:text-sm w-full outline-none"
                >
                  <option value="champions" className="bg-slate-900">💎 Champions Glass (Ультрасучасне скло)</option>
                  <option value="premier" className="bg-slate-900">🏆 Premier Pro (Матовий контраст)</option>
                  <option value="cyber" className="bg-slate-900">⚡ Cyber Neon (Яскраві неонові акценти)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 5: MATCH SETTINGS ===================== */}
        {activeTab === 'settings' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] max-w-2xl space-y-6">
            <h3 className="font-bold text-base text-white">Параметри матчу</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Тривалість одного тайму (хвилини)</label>
              <input
                type="number"
                value={Math.floor(match.timer_duration / 60)}
                onChange={(e) => {
                  const mins = parseInt(e.target.value) || 45;
                  handleUpdateGraphics({ timer_duration: mins * 60 });
                }}
                className="glass-input rounded-xl px-4 py-2.5 text-sm w-full outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">45 хв для футболу 11х11, 20 хв для футзалу / міні-футболу.</p>
            </div>
          </div>
        )}

        {/* ===================== TAB 6: STREAMING & YOUTUBE LIVE ===================== */}
        {activeTab === 'streaming' && (
          <div className="space-y-6 max-w-4xl">
            {/* Live Studio Hero Card */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-blue-500/5 to-transparent shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Radio className="h-7 w-7 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white">Мобільна Студія Прямого Етеру</h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      match.is_broadcasting ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {match.is_broadcasting ? '🔴 В ЕТЕРІ' : 'ГОТОВО'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Транслюйте матч з камери телефона прямо на YouTube з накладанням табло, голів, карток та складів наживо
                  </p>
                </div>
              </div>

              <Link
                to={`/studio/${match.id}`}
                className="w-full md:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-500/25 text-center whitespace-nowrap active:scale-95 flex items-center justify-center space-x-2"
              >
                <span>Відкрити Студію Live</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>

            {/* YouTube RTMP Configuration Form */}
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center space-x-2">
                  <Flame className="h-5 w-5 text-rose-500" />
                  <h3 className="font-bold text-base text-white">Параметри YouTube Live (RTMP)</h3>
                </div>
                <button
                  onClick={async () => {
                    const nextState = !isBroadcasting;
                    setIsBroadcasting(nextState);
                    await updateBroadcastStatus(match.id, {
                      is_broadcasting: nextState,
                      youtube_stream_key: youtubeKey,
                      youtube_rtmp_url: youtubeUrl,
                      broadcast_started_at: nextState ? new Date().toISOString() : null,
                    });
                    showFeedback('success', nextState ? '🔴 Статус змінено на В ЕТЕРІ' : '⚪ Трансляцію зупинено');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isBroadcasting
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  }`}
                >
                  {isBroadcasting ? '🔴 ЗАКІНЧИТИ ЕТЕР' : '🟢 АКТИВУВАТИ ЕТЕР'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    URL-адреса трансляції (YouTube RTMP)
                  </label>
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="rtmp://a.rtmp.youtube.com/live2"
                    className="glass-input rounded-xl px-4 py-2.5 text-xs sm:text-sm w-full outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">За замовчуванням: rtmp://a.rtmp.youtube.com/live2</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Ключ трансляції YouTube</span>
                    <button
                      type="button"
                      onClick={() => setShowKeySecret(!showKeySecret)}
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      {showKeySecret ? 'Приховати' : 'Показати'}
                    </button>
                  </label>
                  <input
                    type={showKeySecret ? 'text' : 'password'}
                    value={youtubeKey}
                    onChange={(e) => setYoutubeKey(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                    className="glass-input rounded-xl px-4 py-2.5 text-xs sm:text-sm w-full outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Знайдіть у YouTube Studio → Створити трансляцію → Ключ потоку</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/[0.06]">
                <div className="text-xs text-slate-400">
                  <span>Relay-сервер: </span>
                  <span className="font-mono text-emerald-400 font-bold">http://localhost:3001</span>
                </div>

                <button
                  onClick={async () => {
                    await updateBroadcastStatus(match.id, {
                      youtube_stream_key: youtubeKey,
                      youtube_rtmp_url: youtubeUrl,
                    });
                    localStorage.setItem(`rtmp_settings_${match.id}`, JSON.stringify({
                      rtmpUrl: youtubeUrl,
                      streamKey: youtubeKey,
                      relayUrl: 'ws://localhost:3001'
                    }));
                    showFeedback('success', '✨ Параметри YouTube RTMP збережено!');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  Зберегти налаштування
                </button>
              </div>
            </div>

            {/* OBS & Graphics Overlays 1-Click Hub */}
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.08] space-y-4">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Radio className="h-5 w-5 text-blue-400" />
                <span>OBS Browser Source посилання для трансляції</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Scoreboard Card */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">📊 Табло з рахунком</span>
                    <span className="text-[10px] text-blue-400 font-mono">1920x1080</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(scoreboardUrl, "табло OBS")}
                      className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition-all"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Копіювати</span>
                    </button>
                    <a
                      href={scoreboardUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 transition-all"
                      title="Відкрити"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {/* Lineups Card */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">📋 Склади команд</span>
                    <span className="text-[10px] text-purple-400 font-mono">1920x1080</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(lineupsUrl, "склади OBS")}
                      className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition-all"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Копіювати</span>
                    </button>
                    <a
                      href={lineupsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 transition-all"
                      title="Відкрити"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {/* Events Card */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">⚽ Тікер подій</span>
                    <span className="text-[10px] text-amber-400 font-mono">1920x1080</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(eventsUrl, "події OBS")}
                      className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition-all"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Копіювати</span>
                    </button>
                    <a
                      href={eventsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 transition-all"
                      title="Відкрити"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ===================== QUICK ACTION MODAL (Goal, Card, Sub) ===================== */}
      {quickActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel p-6 rounded-3xl max-w-md w-full border border-white/20 shadow-2xl relative">
            <button
              onClick={() => setQuickActionModal(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08]"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center text-2xl bg-white/[0.06] border border-white/[0.1]">
                {quickActionModal.type === 'goal' ? '⚽' : quickActionModal.type === 'yellow_card' ? '🟨' : '🟥'}
              </div>
              <h3 className="text-xl font-bold font-display text-white">
                {quickActionModal.type === 'goal' ? 'Фіксація Голу' : quickActionModal.type === 'yellow_card' ? 'Жовта картка' : 'Червона картка'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {quickActionModal.team === 1 ? match.team1_name : match.team2_name} • {getCurrentMinute()}' хв
              </p>
            </div>

            {/* Quick Player Select */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-4">
              {(quickActionModal.team === 1 ? team1Players : team2Players).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleQuickAction(p.player_name)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-blue-600 hover:text-white transition-all text-xs font-semibold border border-white/[0.05]"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded bg-white/[0.08] font-mono flex items-center justify-center">
                      {p.player_number || '-'}
                    </span>
                    <span>{p.player_name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Обрати</span>
                </button>
              ))}

              {(quickActionModal.team === 1 ? team1Players : team2Players).length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400">
                  У цієї команди ще немає доданих гравців у складі.
                </div>
              )}
            </div>

            {/* Direct Input Alternative */}
            <div className="pt-3 border-t border-white/[0.08]">
              <input
                type="text"
                placeholder="Або введіть прізвище гравця вручну..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                    handleQuickAction((e.target as HTMLInputElement).value.trim());
                  }
                }}
                className="glass-input rounded-xl px-4 py-2.5 text-xs w-full outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ===================== SHORTCUTS MODAL ===================== */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel p-6 rounded-3xl max-w-md w-full border border-white/20 shadow-2xl relative">
            <button
              onClick={() => setShowShortcutsModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08]"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold font-display text-white mb-4 flex items-center space-x-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <span>Гарячі клавіші для швидкого керування</span>
            </h3>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span>Старт / Пауза таймера</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.1] font-mono text-white">Space (Пробіл)</kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span>+1 гол Команді 1</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.1] font-mono text-white">1</kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span>-1 гол Команді 1</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.1] font-mono text-white">Shift + 1</kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span>+1 гол Команді 2</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.1] font-mono text-white">2</kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span>-1 гол Команді 2</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.1] font-mono text-white">Shift + 2</kbd>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                <span>Увімкнути / Приховати табло в ефірі</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.1] font-mono text-white">V</kbd>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span>Переключити тайм (1-й / 2-й)</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.1] font-mono text-white">H</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MOBILE ERGONOMIC BOTTOM DOCK ===================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07090E]/95 backdrop-blur-2xl border-t border-white/[0.1] px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('cockpit')}
          className={`flex flex-col items-center p-2 rounded-xl text-xs font-semibold ${
            activeTab === 'cockpit' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Zap className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Пульт</span>
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`flex flex-col items-center p-2 rounded-xl text-xs font-semibold ${
            activeTab === 'players' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Склади</span>
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`flex flex-col items-center p-2 rounded-xl text-xs font-semibold ${
            activeTab === 'events' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Activity className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Хроніка</span>
        </button>
        <button
          onClick={() => setActiveTab('graphics')}
          className={`flex flex-col items-center p-2 rounded-xl text-xs font-semibold ${
            activeTab === 'graphics' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Palette className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Графіка</span>
        </button>
      </div>

    </div>
  );
}
