import { useAuth } from "@/lib/auth";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { 
  ArrowLeft, Play, Pause, RotateCcw, Plus, Minus, ExternalLink, 
  Eye, EyeOff, Clock, Settings, Users, Trophy, Timer, UserPlus,
  Activity, X, List, Save, Edit3, Trash2, 
  CheckCircle, AlertCircle, Download, Upload, FileSpreadsheet,
  Copy
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

  const [activeTab, setActiveTab] = useState<'score' | 'timer' | 'teams' | 'players' | 'events' | 'settings'>('score');

  // Form states
  const [newPlayer, setNewPlayer] = useState({ team: 1, name: '', number: '', position: '', isOnField: true });
  const [editingPlayer, setEditingPlayer] = useState<MatchPlayerData | null>(null);
  const [newEvent, setNewEvent] = useState({ type: 'goal', team: 1, player: '', minute: 0, description: '', substituted_player: '' });

  // Debounce refs for team names
  const team1NameTimer = useRef<NodeJS.Timeout | null>(null);
  const team2NameTimer = useRef<NodeJS.Timeout | null>(null);

  // Success/error feedback state
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
      showFeedback('success', `Посилання на ${type} скопійовано в буфер`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showFeedback('error', 'Не вдалося скопіювати посилання');
    }
  };

  const downloadExcelTemplate = () => {
    if (!match) return;
    
    const template = [
      {
        'Команда (1 або 2)': 1,
        'Номер гравця': 1,
        'Ім\'я гравця': 'Іван Іваненко',
        'Позиція': 'Воротар',
        'На полі (ТАК/НІ)': 'ТАК'
      },
      {
        'Команда (1 або 2)': 1,
        'Номер гравця': 7,
        'Ім\'я гравця': 'Петро Петренко',
        'Позиція': 'Півзахисник',
        'На полі (ТАК/НІ)': 'ТАК'
      },
      {
        'Команда (1 або 2)': 2,
        'Номер гравця': 1,
        'Ім\'я гравця': 'Олександр Олександренко',
        'Позиція': 'Воротар',
        'На полі (ТАК/НІ)': 'ТАК'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Склади команд');
    ws['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 18 }
    ];

    XLSX.writeFile(wb, `склади_${match.team1_name}_vs_${match.team2_name}.xlsx`);
    showFeedback('success', 'Шаблон Excel завантажено');
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    if (file.size > 5 * 1024 * 1024) {
      showFeedback('error', 'Файл занадто великий (максимум 5МБ)');
      event.target.value = '';
      return;
    }

    try {
      showFeedback('success', 'Обробка файлу...');
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

      if (teamIdx === -1 || nameIdx === -1) {
        throw new Error('Не знайдено обов\'язкові колонки (Команда, Ім\'я гравця)');
      }

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
        } else {
          showFeedback('error', 'Помилка збереження гравців у базу');
        }
      }
    } catch (error) {
      console.error('Excel upload error:', error);
      showFeedback('error', `❌ ${error instanceof Error ? error.message : 'Помилка читання Excel'}`);
    } finally {
      event.target.value = '';
    }
  };

  const updateScore = async (team1Score: number, team2Score: number) => {
    if (!match) return;
    const success = await updateMatchScore(match.id, team1Score, team2Score);
    if (success) {
      setMatch(prev => prev ? { ...prev, team1_score: team1Score, team2_score: team2Score } : null);
      showFeedback('success', 'Рахунок оновлено');
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
      showFeedback('success', isVisible ? 'Табло показано в трансляції' : 'Табло приховано з трансляції');
    } else {
      showFeedback('error', 'Помилка зміни видимості');
    }
  };

  const updateTeamInfoDebounced = (team: 'team1' | 'team2', name: string, logoUrl: string) => {
    if (!match) return;
    
    // Immediate local update
    const field1 = team === 'team1' ? 'team1_name' : 'team2_name';
    const field2 = team === 'team1' ? 'team1_logo_url' : 'team2_logo_url';
    setMatch(prev => prev ? { ...prev, [field1]: name, [field2]: logoUrl || null } : null);

    // Debounced database update
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
      showFeedback('success', `Переключено на ${half === 1 ? 'перший' : 'другий'} тайм`);
    } else {
      showFeedback('error', 'Помилка зміни тайму');
    }
  };

  const toggleTimer = () => {
    if (!match) return;
    const newRunning = !match.is_timer_running;
    updateTimerState(match.current_time, newRunning);
    showFeedback('success', newRunning ? 'Таймер запущено' : 'Таймер зупинено');
  };

  const resetTimer = () => {
    if (!match) return;
    updateTimerState(0, false);
    showFeedback('success', 'Таймер скинуто');
  };

  const adjustTimer = (delta: number) => {
    if (!match) return;
    const currentTime = calculateCurrentTime(match);
    const newTime = Math.max(0, Math.min(match.timer_duration, currentTime + delta));
    updateTimerState(newTime, match.is_timer_running);
  };

  const showNotification = async (text: string) => {
    if (!match) return;
    const success = await updateMatchNotification(match.id, true, text);
    if (success) {
      setMatch(prev => prev ? { ...prev, show_notification: true, current_notification_text: text } : null);
      showFeedback('success', 'Сповіщення показано в трансляції');
    } else {
      showFeedback('error', 'Помилка показу сповіщення');
    }
  };

  const hideNotification = async () => {
    if (!match) return;
    const success = await updateMatchNotification(match.id, false, null);
    if (success) {
      setMatch(prev => prev ? { ...prev, show_notification: false, current_notification_text: null } : null);
      showFeedback('success', 'Сповіщення приховано з трансляції');
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
      showFeedback('success', newShow ? 'Склади показано в трансляції' : 'Склади приховано з трансляції');
    } else {
      showFeedback('error', 'Помилка керування складами');
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
    } else {
      showFeedback('error', 'Помилка додавання гравця');
    }
  };

  const handleUpdatePlayer = async (p: MatchPlayerData) => {
    const success = await apiUpdatePlayer(p.id, {
      player_name: p.player_name,
      player_number: p.player_number,
      position: p.position
    });

    if (success) {
      fetchPlayers();
      setEditingPlayer(null);
      showFeedback('success', 'Гравця оновлено');
    } else {
      showFeedback('error', 'Помилка оновлення гравця');
    }
  };

  const handleDeletePlayer = async (playerId: number) => {
    if (!window.confirm('Видалити гравця?')) return;
    const success = await apiDeletePlayer(playerId);
    if (success) {
      fetchPlayers();
      showFeedback('success', 'Гравця видалено');
    } else {
      showFeedback('error', 'Помилка видалення гравця');
    }
  };

  const handleClearAllPlayers = async () => {
    if (!id || !window.confirm('Видалити всіх гравців з обох команд? Ця дія незворотна.')) return;
    const success = await clearMatchPlayers(Number(id));
    if (success) {
      setPlayers([]);
      showFeedback('success', 'Всіх гравців видалено');
    } else {
      showFeedback('error', 'Помилка очищення складів');
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.player.trim() || !id) {
      showFeedback('error', 'Введіть ім\'я гравця');
      return;
    }

    const eventMinute = newEvent.minute > 0 ? newEvent.minute : getCurrentMinute();

    const created = await apiAddEvent(Number(id), {
      event_type: newEvent.type,
      team: newEvent.team,
      player_name: newEvent.player.trim(),
      minute: eventMinute,
      description: newEvent.description.trim() || null,
      substituted_player_name: newEvent.type === 'substitution' ? newEvent.substituted_player.trim() : null,
      is_visible: true,
      is_broadcast: false
    });

    if (created) {
      setNewEvent({ type: 'goal', team: 1, player: '', minute: 0, description: '', substituted_player: '' });
      fetchEvents();
      fetchPlayers();
      showFeedback('success', 'Подію додано');
    } else {
      showFeedback('error', 'Помилка додавання події');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!window.confirm('Видалити подію?')) return;
    const success = await apiDeleteEvent(eventId);
    if (success) {
      fetchEvents();
      showFeedback('success', 'Подію видалено');
    } else {
      showFeedback('error', 'Помилка видалення події');
    }
  };

  const handleToggleEventBroadcast = async (eventId: number, isBroadcast: boolean) => {
    const success = await updateEventBroadcast(eventId, !isBroadcast);
    if (success) {
      setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, is_broadcast: !isBroadcast } : ev));
      showFeedback('success', !isBroadcast ? '📺 ПОКАЗАНО В ЕФІРІ' : '⚪ ПРИХОВАНО З ЕФІРУ');
    } else {
      showFeedback('error', 'Помилка керування ефіром події');
    }
  };

  const handleResetFullMatch = async () => {
    if (!match || !id || !window.confirm("Це повністю скине рахунок, таймер, склад та події даного матчу! Продовжити?")) return;

    await updateMatchScore(match.id, 0, 0);
    await updateMatchTimer(match.id, { current_time: 0, is_timer_running: false });
    await updateMatchHalf(match.id, 1, 0);
    await clearMatchPlayers(Number(id));
    
    fetchMatch();
    fetchPlayers();
    fetchEvents();
    showFeedback('success', 'Всі дані матчу скинуто');
  };

  if (loading || !match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  const scoreboardUrl = `${window.location.origin}/scoreboard?match=${match.id}`;
  const lineupsUrl = `${window.location.origin}/lineups?match=${match.id}`;
  const eventsUrl = `${window.location.origin}/events?match=${match.id}`;

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-12">
      {/* Toast feedback */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-xl text-white font-medium flex items-center space-x-2 ${
          feedback.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-yellow-400" />
              <h1 className="font-bold text-lg hidden sm:block">{match.team1_name} vs {match.team2_name}</h1>
            </div>
          </div>

          {/* Quick OBS links */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(scoreboardUrl, "табло")}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors border border-slate-700"
            >
              <Copy className="h-4 w-4 text-blue-400" />
              <span>Табло OBS</span>
            </button>
            <button
              onClick={() => copyToClipboard(lineupsUrl, "склади")}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors border border-slate-700"
            >
              <Copy className="h-4 w-4 text-purple-400" />
              <span>Склади OBS</span>
            </button>
            <button
              onClick={() => copyToClipboard(eventsUrl, "події")}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors border border-slate-700"
            >
              <Copy className="h-4 w-4 text-green-400" />
              <span>Події OBS</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Score & Control Banner */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 mb-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Team 1 */}
            <div className="flex items-center space-x-4 flex-1 justify-end w-full md:w-auto">
              <div className="text-right">
                <input
                  type="text"
                  value={match.team1_name}
                  onChange={(e) => updateTeamInfoDebounced('team1', e.target.value, match.team1_logo_url || '')}
                  className="font-bold text-xl sm:text-2xl bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-400 text-right focus:outline-none"
                />
              </div>
              <div className="text-4xl font-extrabold text-yellow-400 min-w-[50px] text-center">
                {match.team1_score}
              </div>
            </div>

            {/* Score Controls / Timer */}
            <div className="flex flex-col items-center justify-center px-4">
              <div className="text-3xl font-mono font-bold tracking-wider text-blue-400 mb-1">
                {formatTime(displayTime)}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <span>{match.current_half === 1 ? '1 ТАЙМ' : '2 ТАЙМ'}</span>
                <span>•</span>
                <span className={match.is_timer_running ? 'text-green-400 animate-pulse' : 'text-slate-500'}>
                  {match.is_timer_running ? 'В ЕФІРІ' : 'ПАУЗА'}
                </span>
              </div>
            </div>

            {/* Team 2 */}
            <div className="flex items-center space-x-4 flex-1 justify-start w-full md:w-auto">
              <div className="text-4xl font-extrabold text-yellow-400 min-w-[50px] text-center">
                {match.team2_score}
              </div>
              <div>
                <input
                  type="text"
                  value={match.team2_name}
                  onChange={(e) => updateTeamInfoDebounced('team2', e.target.value, match.team2_logo_url || '')}
                  className="font-bold text-xl sm:text-2xl bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-400 text-left focus:outline-none"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto space-x-2 border-b border-slate-800 pb-2 mb-6 scrollbar-none">
          {[
            { id: 'score', label: 'Рахунок & Події', icon: Activity },
            { id: 'timer', label: 'Таймер & Тайми', icon: Timer },
            { id: 'teams', label: 'Команди & Лого', icon: Users },
            { id: 'players', label: 'Гравці & Склади', icon: UserPlus },
            { id: 'events', label: 'Список Подій', icon: List },
            { id: 'settings', label: 'Налаштування', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'score' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Quick Score Change */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <span>Керування Рахунком</span>
              </h3>
              
              <div className="space-y-6">
                {/* Team 1 Score controls */}
                <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-700/40">
                  <span className="font-semibold text-slate-200">{match.team1_name}</span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => updateScore(Math.max(0, match.team1_score - 1), match.team2_score)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="font-bold text-2xl text-yellow-400 w-8 text-center">{match.team1_score}</span>
                    <button
                      onClick={() => updateScore(match.team1_score + 1, match.team2_score)}
                      className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Team 2 Score controls */}
                <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-700/40">
                  <span className="font-semibold text-slate-200">{match.team2_name}</span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => updateScore(match.team1_score, Math.max(0, match.team2_score - 1))}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="font-bold text-2xl text-yellow-400 w-8 text-center">{match.team2_score}</span>
                    <button
                      onClick={() => updateScore(match.team1_score, match.team2_score + 1)}
                      className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Broadcast Toggles */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-lg mb-4 flex items-center space-x-2">
                <Eye className="h-5 w-5 text-blue-400" />
                <span>Керування Ефіром</span>
              </h3>

              <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl">
                <div>
                  <div className="font-semibold">Табло на екрані</div>
                  <div className="text-xs text-slate-400">Показувати рахунок та таймер у трансляції</div>
                </div>
                <button
                  onClick={() => updateVisibility(!match.is_visible)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex items-center space-x-2 ${
                    match.is_visible ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {match.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <span>{match.is_visible ? 'ВКЛ' : 'ВИКЛ'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl">
                <div>
                  <div className="font-semibold">Склади команд</div>
                  <div className="text-xs text-slate-400">Анімація стартових складів</div>
                </div>
                <button
                  onClick={toggleLineups}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex items-center space-x-2 ${
                    match.show_lineups ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {match.show_lineups ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <span>{match.show_lineups ? 'ПОКАЗАНО' : 'ПРИХОВАНО'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timer' && (
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 max-w-2xl mx-auto space-y-6">
            <h3 className="font-bold text-lg flex items-center space-x-2">
              <Timer className="h-5 w-5 text-blue-400" />
              <span>Керування Таймером</span>
            </h3>

            {/* Timer Actions */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={toggleTimer}
                className={`flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 transition-all ${
                  match.is_timer_running 
                    ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                    : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                {match.is_timer_running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                <span>{match.is_timer_running ? 'ПАУЗА' : 'СТАРТ'}</span>
              </button>

              <button
                onClick={resetTimer}
                className="px-6 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold text-slate-200 transition-colors flex items-center space-x-2"
              >
                <RotateCcw className="h-5 w-5" />
                <span>Скидати</span>
              </button>
            </div>

            {/* Minute Adjustments */}
            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-700/60">
              <button onClick={() => adjustTimer(-60)} className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-300">-1 Хвилина</button>
              <button onClick={() => adjustTimer(-10)} className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-300">-10 Сек</button>
              <button onClick={() => adjustTimer(10)} className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-300">+10 Сек</button>
              <button onClick={() => adjustTimer(60)} className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-300">+1 Хвилина</button>
            </div>

            {/* Half Switcher */}
            <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between">
              <span className="font-semibold text-sm">Переключити тайм:</span>
              <div className="flex space-x-3">
                <button
                  onClick={() => switchHalf(1)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm ${match.current_half === 1 ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'}`}
                >
                  1 Тайм
                </button>
                <button
                  onClick={() => switchHalf(2)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm ${match.current_half === 2 ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'}`}
                >
                  2 Тайм
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="space-y-6">
            {/* Excel Actions */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-green-400" />
                <span className="font-semibold text-sm">Імпорт складів з Excel</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={downloadExcelTemplate}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-semibold rounded-lg flex items-center space-x-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Шаблон</span>
                </button>
                <label className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Завантажити Excel</span>
                  <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
                </label>
                <button
                  onClick={handleClearAllPlayers}
                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-xs font-semibold rounded-lg flex items-center space-x-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Очистити склади</span>
                </button>
              </div>
            </div>

            {/* Add Player Form */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6">
              <h3 className="font-bold text-base mb-4">Додати гравця</h3>
              <div className="grid sm:grid-cols-5 gap-3">
                <select
                  value={newPlayer.team}
                  onChange={(e) => setNewPlayer({ ...newPlayer, team: Number(e.target.value) })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value={1}>{match.team1_name}</option>
                  <option value={2}>{match.team2_name}</option>
                </select>
                <input
                  type="text"
                  placeholder="Ім'я гравця"
                  value={newPlayer.name}
                  onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm sm:col-span-2"
                />
                <input
                  type="number"
                  placeholder="№"
                  value={newPlayer.number}
                  onChange={(e) => setNewPlayer({ ...newPlayer, number: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={handleAddPlayer}
                  className="bg-blue-600 hover:bg-blue-500 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Додати
                </button>
              </div>
            </div>

            {/* Players Lists */}
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2].map((teamNum) => {
                const teamName = teamNum === 1 ? match.team1_name : match.team2_name;
                const teamPlayers = players.filter(p => p.team === teamNum);

                return (
                  <div key={teamNum} className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6">
                    <h4 className="font-bold text-lg mb-4 text-blue-400 flex justify-between items-center">
                      <span>{teamName}</span>
                      <span className="text-xs bg-slate-700 px-2.5 py-1 rounded-full text-slate-300 font-normal">
                        {teamPlayers.length} гравців
                      </span>
                    </h4>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {teamPlayers.map((p) => (
                        <div key={p.id} className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-sm">
                          <div className="flex items-center space-x-2">
                            {p.player_number && <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-yellow-400 font-bold">{p.player_number}</span>}
                            <span className="font-medium">{p.player_name}</span>
                          </div>
                          <button
                            onClick={() => handleDeletePlayer(p.id)}
                            className="text-slate-500 hover:text-red-400 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {teamPlayers.length === 0 && <div className="text-center py-6 text-slate-500 text-xs">Немає гравців</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* Add Event */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6">
              <h3 className="font-bold text-base mb-4">Додати Подію</h3>
              <div className="grid sm:grid-cols-5 gap-3">
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="goal">⚽ Гол</option>
                  <option value="yellow_card">🟨 Жовта картка</option>
                  <option value="red_card">🟥 Червона картка</option>
                  <option value="substitution">🔄 Заміна</option>
                </select>
                <select
                  value={newEvent.team}
                  onChange={(e) => setNewEvent({ ...newEvent, team: Number(e.target.value) })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                >
                  <option value={1}>{match.team1_name}</option>
                  <option value={2}>{match.team2_name}</option>
                </select>
                <input
                  type="text"
                  placeholder="Гравець"
                  value={newEvent.player}
                  onChange={(e) => setNewEvent({ ...newEvent, player: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm sm:col-span-2"
                />
                <button
                  onClick={handleAddEvent}
                  className="bg-green-600 hover:bg-green-500 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Додати Подію
                </button>
              </div>
            </div>

            {/* Events Timeline */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6">
              <h4 className="font-bold text-lg mb-4">Хронологія подій</h4>
              <div className="space-y-3">
                {events.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs bg-slate-800 px-2 py-1 rounded text-blue-400 font-bold">{ev.minute}'</span>
                      <span className="text-lg">
                        {ev.event_type === 'goal' ? '⚽' : ev.event_type === 'yellow_card' ? '🟨' : ev.event_type === 'red_card' ? '🟥' : '🔄'}
                      </span>
                      <div>
                        <div className="font-semibold text-sm">{ev.player_name}</div>
                        <div className="text-xs text-slate-400">{ev.team === 1 ? match.team1_name : match.team2_name}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleEventBroadcast(ev.id, Boolean(ev.is_broadcast))}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 ${
                          ev.is_broadcast ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{ev.is_broadcast ? 'В ЕФІРІ' : 'ПРИХОВАНО'}</span>
                      </button>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="text-slate-500 hover:text-red-400 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {events.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">Подї відсутні</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-6 max-w-xl mx-auto space-y-6">
            <h3 className="font-bold text-lg flex items-center space-x-2">
              <Settings className="h-5 w-5 text-slate-400" />
              <span>Налаштування Матчу</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Тема табло OBS</label>
                <select
                  value={match.design_theme}
                  onChange={(e) => updateMatchSettings(match.id, { design_theme: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm"
                >
                  <option value="classic">Класична (Світла)</option>
                  <option value="dark">Темна (Преміум)</option>
                </select>
              </div>

              <div className="pt-6 border-t border-slate-700/60">
                <button
                  onClick={handleResetFullMatch}
                  className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Скидати всі дані матчу</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
