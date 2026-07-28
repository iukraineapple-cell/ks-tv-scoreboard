import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { 
  ArrowLeft, Play, Pause, RotateCcw, Plus, Minus, ExternalLink, 
  Eye, EyeOff, Clock, Settings, Users, Trophy, Timer, UserPlus,
  Activity, X, List, Save, Edit3, Trash2, 
  CheckCircle, AlertCircle, Download, Upload, FileSpreadsheet,
  Copy
} from "lucide-react";
import * as XLSX from 'xlsx';

interface Match {
  id: number;
  team1_name: string;
  team2_name: string;
  team1_logo_url: string | null;
  team2_logo_url: string | null;
  team1_score: number;
  team2_score: number;
  timer_duration: number;
  current_time: number;
  is_timer_running: boolean;
  current_half: number;
  design_theme: string;
  is_visible: boolean;
  half_time_offset: number;
  show_notification: boolean;
  current_notification_text: string | null;
  show_lineups: boolean;
  timer_start_timestamp?: number;
  timer_server_time?: number;
}

interface Player {
  id: number;
  match_id: number;
  team: number;
  player_name: string;
  player_number?: number;
  is_starter: boolean;
  is_on_field: boolean;
  position?: string;
}

interface MatchEvent {
  id: number;
  match_id: number;
  event_type: string;
  player_name: string;
  team: number;
  minute: number;
  description?: string;
  substituted_player_name?: string;
  is_visible?: boolean;
  is_broadcast?: boolean | number;
}

export default function MatchControl() {
  const { user: mochaUser, isPending } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [displayTime, setDisplayTime] = useState(0);

  const [activeTab, setActiveTab] = useState<'score' | 'timer' | 'teams' | 'players' | 'events' | 'settings'>('score');

  // Form states with better UX
  const [newPlayer, setNewPlayer] = useState({ team: 1, name: '', number: '', position: '', isOnField: true });
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [newEvent, setNewEvent] = useState({ type: 'goal', team: 1, player: '', minute: 0, description: '', substituted_player: '' });

  // Success/error states for better feedback
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

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
  }, [mochaUser, isPending, navigate, id]);

  useEffect(() => {
    // Continuous sync with server every 2 seconds
    const syncInterval = setInterval(() => {
      fetchMatch();
    }, 2000);

    return () => {
      clearInterval(syncInterval);
    };
  }, []);

  useEffect(() => {
    // Auto-hide feedback after 3 seconds
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    // Real-time timer update for smooth display
    let intervalId: NodeJS.Timeout;
    
    if (match?.is_timer_running) {
      intervalId = setInterval(() => {
        setDisplayTime(getDisplayTime(match));
      }, 100); // Update every 100ms for smooth display
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [match?.is_timer_running, match?.timer_start_timestamp, match?.timer_server_time]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
  };

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
    
    // Create Excel template
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
        'Команда (1 або 2)': 1,
        'Номер гравця': 12,
        'Ім\'я гравця': 'Сергій Сергіенко',
        'Позиція': 'Нападник',
        'На полі (ТАК/НІ)': 'НІ'
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
    
    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 20 }, // Команда
      { wch: 15 }, // Номер
      { wch: 25 }, // Ім'я
      { wch: 20 }, // Позиція
      { wch: 18 }  // На полі
    ];

    XLSX.writeFile(wb, `склади_${match.team1_name}_vs_${match.team2_name}.xlsx`);
    showFeedback('success', 'Шаблон Excel завантажено');
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showFeedback('error', 'Файл занадто великий (максимум 5МБ)');
      event.target.value = '';
      return;
    }

    let arrayBuffer: ArrayBuffer | null = null;
    let workbook: any = null;
    let jsonData: any[] = [];

    try {
      showFeedback('success', 'Обробка файлу...');
      
      // Read file into memory temporarily
      arrayBuffer = await file.arrayBuffer();
      
      // Process with XLSX (file data is only in memory, not stored)
      workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellDates: false, // Optimize memory usage
        cellNF: false,    // Don't read number formats
        cellStyles: false // Don't read styles
      });
      
      // Extract only the first sheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Файл не містить даних');
      }
      
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON (only data, no formatting)
      jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Use array format for better memory efficiency
        defval: '', // Default empty value
        blankrows: false // Skip blank rows
      });

      // Clear file buffer from memory immediately after processing
      arrayBuffer = null;
      workbook = null;
      
      if (jsonData.length === 0) {
        throw new Error('Файл порожній або не містить даних');
      }

      // Process header row and data rows separately for better memory efficiency
      const headerRow = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);
      
      // Find column indexes by header names (case-insensitive)
      const getColumnIndex = (possibleNames: string[]) => {
        for (const name of possibleNames) {
          const index = headerRow.findIndex(header => 
            String(header || '').toLowerCase().includes(name.toLowerCase())
          );
          if (index >= 0) return index;
        }
        return -1;
      };

      const teamIndex = getColumnIndex(['команда', 'team']);
      const numberIndex = getColumnIndex(['номер', 'number']);
      const nameIndex = getColumnIndex(['ім\'я', 'імя', 'name', 'гравець', 'player']);
      const positionIndex = getColumnIndex(['позиція', 'позиция', 'position', 'роль']);
      const onFieldIndex = getColumnIndex(['поле', 'field', 'на полі', 'активний']);

      if (teamIndex === -1 || nameIndex === -1) {
        throw new Error('Не знайдено обов\'язкові колонки (Команда, Ім\'я гравця)');
      }

      let addedCount = 0;
      let errorCount = 0;
      const batchSize = 10; // Process in small batches
      
      // Process data in batches to avoid memory overload
      for (let i = 0; i < dataRows.length; i += batchSize) {
        const batch = dataRows.slice(i, i + batchSize);
        
        for (const row of batch) {
          try {
            const team = parseInt(String(row[teamIndex] || '').trim());
            const playerNumber = parseInt(String(row[numberIndex] || '').trim()) || null;
            const playerName = String(row[nameIndex] || '').trim();
            const position = String(row[positionIndex] || '').trim() || null;
            const onFieldText = String(row[onFieldIndex] || '').trim().toUpperCase();
            const isOnField = onFieldText === 'ТАК' || onFieldText === 'YES' || onFieldText === 'TRUE' || onFieldText === '1' || onFieldText === '';

            if (!playerName || ![1, 2].includes(team)) {
              errorCount++;
              continue;
            }

            // Send player data as lightweight JSON (no file storage)
            const response = await fetch(`/api/matches/${id}/players`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                team,
                player_name: playerName,
                player_number: playerNumber,
                position,
                is_on_field: isOnField,
              }),
            });

            if (response.ok) {
              addedCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            errorCount++;
          }
        }
        
        // Small delay between batches to prevent blocking UI
        if (i + batchSize < dataRows.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Clear all data arrays from memory
      jsonData = [];
      
      fetchPlayers();
      
      if (addedCount > 0) {
        showFeedback('success', `✅ Додано ${addedCount} гравців${errorCount > 0 ? `, помилок: ${errorCount}` : ''}`);
      } else {
        showFeedback('error', `❌ Не вдалося додати гравців. Перевірте формат файлу.`);
      }
    } catch (error) {
      console.error('Excel upload error:', error);
      showFeedback('error', `❌ ${error instanceof Error ? error.message : 'Помилка читання Excel файлу'}`);
    } finally {
      // Explicit memory cleanup
      arrayBuffer = null;
      workbook = null;
      jsonData = [];
      
      // Clear file input immediately
      event.target.value = '';
      
      // Force garbage collection hint (browsers may or may not honor this)
      const gc = window.gc;
      if (gc) {
        setTimeout(() => gc(), 100);
      }
    }
  };

  const fetchMatch = async () => {
    try {
      const response = await fetch(`/api/matches/${id}`);
      const data = await response.json();
      if (data.success) {
        setMatch(data.data);
        setDisplayTime(getDisplayTime(data.data));
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching match:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const updateScore = async (team1Score: number, team2Score: number) => {
    try {
      await fetch(`/api/matches/${id}/score`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team1_score: team1Score, team2_score: team2Score }),
      });
      
      setMatch(prev => prev ? { ...prev, team1_score: team1Score, team2_score: team2Score } : null);
      showFeedback('success', 'Рахунок оновлено');
    } catch (error) {
      console.error("Error updating score:", error);
      showFeedback('error', 'Помилка оновлення рахунку');
    }
  };

  const updateTimer = async (currentTime: number, isRunning: boolean) => {
    try {
      await fetch(`/api/matches/${id}/timer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_time: currentTime, is_timer_running: isRunning }),
      });
      
      setMatch(prev => prev ? { 
        ...prev, 
        current_time: currentTime, 
        is_timer_running: isRunning 
      } : null);
    } catch (error) {
      console.error("Error updating timer:", error);
      showFeedback('error', 'Помилка оновлення таймера');
    }
  };

  const updateVisibility = async (isVisible: boolean) => {
    try {
      await fetch(`/api/matches/${id}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_visible: isVisible }),
      });
      
      setMatch(prev => prev ? { ...prev, is_visible: isVisible } : null);
      showFeedback('success', isVisible ? 'Табло показано в трансляції' : 'Табло приховано з трансляції');
    } catch (error) {
      console.error("Error updating visibility:", error);
      showFeedback('error', 'Помилка зміни видимості');
    }
  };

  const updateTeamInfo = async (team: 'team1' | 'team2', name: string, logoUrl: string) => {
    try {
      const field1 = team === 'team1' ? 'team1_name' : 'team2_name';
      const field2 = team === 'team1' ? 'team1_logo_url' : 'team2_logo_url';
      
      await fetch(`/api/matches/${id}/team`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          [field1]: name,
          [field2]: logoUrl || null
        }),
      });
      
      setMatch(prev => prev ? { 
        ...prev, 
        [field1]: name,
        [field2]: logoUrl || null 
      } : null);
      showFeedback('success', 'Інформацію команди оновлено');
    } catch (error) {
      console.error("Error updating team info:", error);
      showFeedback('error', 'Помилка оновлення команди');
    }
  };

  const switchHalf = async (half: number) => {
    try {
      let newTime = 0;
      let halfTimeOffset = 0;
      
      if (half === 2 && match) {
        halfTimeOffset = match.timer_duration;
      }
      
      await fetch(`/api/matches/${id}/half`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          current_half: half, 
          current_time: newTime,
          half_time_offset: halfTimeOffset,
          is_timer_running: false 
        }),
      });
      
      setMatch(prev => prev ? { 
        ...prev, 
        current_half: half, 
        current_time: newTime,
        half_time_offset: halfTimeOffset,
        is_timer_running: false 
      } : null);
      showFeedback('success', `Переключено на ${half === 1 ? 'перший' : 'другий'} тайм`);
    } catch (error) {
      console.error("Error switching half:", error);
      showFeedback('error', 'Помилка зміни тайму');
    }
  };

  const toggleTimer = () => {
    if (!match) return;
    
    const newRunning = !match.is_timer_running;
    updateTimer(match.current_time, newRunning);
    showFeedback('success', newRunning ? 'Таймер запущено' : 'Таймер зупинено');
  };

  const resetTimer = () => {
    if (!match) return;
    
    updateTimer(0, false);
    showFeedback('success', 'Таймер скинуто');
  };

  const adjustTimer = (delta: number) => {
    if (!match) return;
    
    const currentTime = calculateCurrentTime(match);
    const newTime = Math.max(0, Math.min(match.timer_duration, currentTime + delta));
    updateTimer(newTime, match.is_timer_running);
  };

  const showNotification = async (text: string) => {
    try {
      await fetch(`/api/matches/${id}/notification`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_notification: true, notification_text: text }),
      });
      
      setMatch(prev => prev ? { 
        ...prev, 
        show_notification: true, 
        current_notification_text: text 
      } : null);
      showFeedback('success', 'Сповіщення показано в трансляції');
    } catch (error) {
      console.error("Error showing notification:", error);
      showFeedback('error', 'Помилка показу сповіщення');
    }
  };

  const hideNotification = async () => {
    try {
      await fetch(`/api/matches/${id}/notification`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_notification: false, notification_text: null }),
      });
      
      setMatch(prev => prev ? { 
        ...prev, 
        show_notification: false, 
        current_notification_text: null 
      } : null);
      showFeedback('success', 'Сповіщення приховано з трансляції');
    } catch (error) {
      console.error("Error hiding notification:", error);
      showFeedback('error', 'Помилка приховування сповіщення');
    }
  };

  const toggleLineups = async () => {
    try {
      const newShowLineups = !match?.show_lineups;
      await fetch(`/api/matches/${id}/lineups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_lineups: newShowLineups }),
      });
      
      setMatch(prev => prev ? { 
        ...prev, 
        show_lineups: newShowLineups 
      } : null);
      showFeedback('success', newShowLineups ? 'Склади показано в трансляції' : 'Склади приховано з трансляції');
    } catch (error) {
      console.error("Error toggling lineups:", error);
      showFeedback('error', 'Помилка керування складами');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateCurrentTime = (match: Match): number => {
    if (!match.is_timer_running || !match.timer_start_timestamp || match.timer_server_time === null || match.timer_server_time === undefined) {
      return match.current_time;
    }
    
    const now = Date.now() / 1000; // Unix timestamp in seconds
    const elapsed = now - match.timer_start_timestamp;
    const calculatedTime = Math.round(match.timer_server_time + elapsed);
    
    // Don't exceed timer duration
    return Math.min(calculatedTime, match.timer_duration);
  };

  const getDisplayTime = (match: Match): number => {
    const currentTime = calculateCurrentTime(match);
    
    if (match.current_half === 2) {
      return currentTime + (match.half_time_offset || match.timer_duration);
    }
    return currentTime;
  };

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`/api/matches/${id}/players`);
      const data = await response.json();
      if (data.success) {
        setPlayers(data.data);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/matches/${id}/events`);
      const data = await response.json();
      if (data.success) {
        setEvents(data.data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const addPlayer = async () => {
    if (!newPlayer.name.trim()) {
      showFeedback('error', 'Введіть ім\'я гравця');
      return;
    }
    
    try {
      const response = await fetch(`/api/matches/${id}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team: newPlayer.team,
          player_name: newPlayer.name,
          player_number: newPlayer.number ? parseInt(newPlayer.number) : null,
          position: newPlayer.position || null,
          is_on_field: newPlayer.isOnField,
        }),
      });
      
      if (response.ok) {
        setNewPlayer({ team: 1, name: '', number: '', position: '', isOnField: true });
        fetchPlayers();
        showFeedback('success', 'Гравця додано');
      }
    } catch (error) {
      console.error("Error adding player:", error);
      showFeedback('error', 'Помилка додавання гравця');
    }
  };

  const updatePlayer = async (player: Player) => {
    try {
      await fetch(`/api/players/${player.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name: player.player_name,
          player_number: player.player_number,
          position: player.position,
        }),
      });
      fetchPlayers();
      setEditingPlayer(null);
      showFeedback('success', 'Гравця оновлено');
    } catch (error) {
      console.error("Error updating player:", error);
      showFeedback('error', 'Помилка оновлення гравця');
    }
  };

  const deletePlayer = async (playerId: number) => {
    if (!confirm('Видалити гравця?')) return;
    
    try {
      await fetch(`/api/players/${playerId}`, {
        method: "DELETE",
      });
      fetchPlayers();
      showFeedback('success', 'Гравця видалено');
    } catch (error) {
      console.error("Error deleting player:", error);
      showFeedback('error', 'Помилка видалення гравця');
    }
  };

  const clearAllPlayers = async () => {
    if (!confirm('Видалити всіх гравців з обох команд? Ця дія незворотна.')) return;
    
    try {
      const response = await fetch(`/api/matches/${id}/players/clear`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setPlayers([]);
        showFeedback('success', 'Всіх гравців видалено');
      } else {
        showFeedback('error', 'Помилка очищення складів');
      }
    } catch (error) {
      console.error("Error clearing all players:", error);
      showFeedback('error', 'Помилка очищення складів');
    }
  };

  

  const addEvent = async () => {
    if (!newEvent.player.trim()) {
      showFeedback('error', 'Введіть ім\'я гравця');
      return;
    }
    
    try {
      const response = await fetch(`/api/matches/${id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: newEvent.type,
          team: newEvent.team,
          player_name: newEvent.player,
          minute: newEvent.minute,
          description: newEvent.description || null,
          substituted_player_name: newEvent.type === 'substitution' ? newEvent.substituted_player : null,
        }),
      });
      
      if (response.ok) {
        setNewEvent({ type: 'goal', team: 1, player: '', minute: 0, description: '', substituted_player: '' });
        fetchEvents();
        fetchPlayers();
        showFeedback('success', 'Подію додано');
      }
    } catch (error) {
      console.error("Error adding event:", error);
      showFeedback('error', 'Помилка додавання події');
    }
  };

  const deleteEvent = async (eventId: number) => {
    if (!confirm('Видалити подію?')) return;
    
    try {
      await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });
      fetchEvents();
      showFeedback('success', 'Подію видалено');
    } catch (error) {
      console.error("Error deleting event:", error);
      showFeedback('error', 'Помилка видалення події');
    }
  };

  const toggleEventBroadcast = async (eventId: number, isBroadcast: boolean) => {
    try {
      const response = await fetch(`/api/events/${eventId}/broadcast`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_broadcast: !isBroadcast }),
      });
      
      if (response.ok) {
        // Update events state immediately without full refetch
        setEvents(prev => prev.map(event => 
          event.id === eventId 
            ? { ...event, is_broadcast: !isBroadcast } 
            : event
        ));
        showFeedback('success', !isBroadcast ? '📺 ПОКАЗАНО В ЕФІРІ' : '⚪ ПРИХОВАНО З ЕФІРУ');
      }
    } catch (error) {
      console.error("Error toggling event broadcast:", error);
      showFeedback('error', 'Помилка керування ефіром події');
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'goal': return '⚽';
      case 'yellow_card': return '🟨';
      case 'red_card': return '🟥';
      case 'substitution': return '🔄';
      default: return '📝';
    }
  };

  const getEventText = (event: MatchEvent) => {
    switch (event.event_type) {
      case 'goal':
        return 'ГОЛ!';
      case 'yellow_card':
        return 'ЖОВТА КАРТКА';
      case 'red_card':
        return 'ЧЕРВОНА КАРТКА';
      case 'substitution':
        return 'ЗАМІНА';
      default:
        return 'ПОДІЯ';
    }
  };

  const getEventDescription = (event: MatchEvent) => {
    switch (event.event_type) {
      case 'goal':
        return `${event.player_name} забиває гол!`;
      case 'yellow_card':
        return `${event.player_name} отримує попередження`;
      case 'red_card':
        return `${event.player_name} видалений з поля`;
      case 'substitution':
        return `${event.player_name} ↔ ${event.substituted_player_name || 'Гравець'}`;
      default:
        return event.description ?? event.player_name;
    }
  };

  const getCurrentMinute = () => {
    if (!match) return 0;
    return Math.floor(displayTime / 60);
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-semibold mb-4">Матч не знайдено</h1>
          <Link
            to="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
          >
            Повернутися до панелі
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      {/* Success/Error Feedback */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          feedback.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Header */}
      <nav className="border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 hover:text-orange-400 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Назад до панелі</span>
              </Link>
              <div className="flex items-center space-x-3">

  <span className="text-white font-bold text-sm">
    <img 
      src="https://i.ibb.co/FqgtH9xv/IMG-1751-1.png" 
      alt="KS TV Logo" 
      className="object-contain h-20 w-auto"
    />
  </span>

                <h1 className="text-2xl font-bold">Професійне табло</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-1 rounded-md text-sm font-semibold ${
                match.is_visible 
                  ? 'bg-green-600 text-white' 
                  : 'bg-red-600 text-white'
              }`}>
                {match.is_visible ? '🟢 В ЕФІРІ' : '🔴 НЕ В ЕФІРІ'}
              </div>
              <button
                onClick={() => updateVisibility(!match.is_visible)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-semibold ${
                  match.is_visible 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {match.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{match.is_visible ? 'Приховати' : 'Показати'}</span>
              </button>
              <div className="flex items-center space-x-2">
                <a
                  href={`${window.location.origin}/scoreboard?match_id=${match.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors font-semibold text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Табло</span>
                </a>
                <a
                  href={`${window.location.origin}/lineups?match_id=${match.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors font-semibold text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Склади</span>
                </a>
                <a
                  href={`${window.location.origin}/events?match_id=${match.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors font-semibold text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Події</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Live Preview of Professional Scoreboard */}
        {/* Control Tabs */}
        <div className="flex space-x-2 mb-8 bg-black/20 p-2 rounded-xl backdrop-blur-lg border border-white/10 overflow-x-auto">
          {[
            { id: 'score', label: 'Рахунок', icon: Trophy },
            { id: 'timer', label: 'Таймер', icon: Timer },
            { id: 'teams', label: 'Команди', icon: Users },
            { id: 'players', label: 'Склади', icon: UserPlus },
            { id: 'events', label: 'Події', icon: Activity },
            { id: 'settings', label: 'Налаштування', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-orange-600 text-white shadow-lg scale-105' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Score Control */}
          {activeTab === 'score' && (
            <>
              <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 mx-auto mb-4">
                    {match.team1_logo_url ? (
                      <img src={match.team1_logo_url} alt={match.team1_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-2xl">{match.team1_name.charAt(0)}</span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{match.team1_name}</h3>
                  <div className="text-6xl font-bold text-orange-400 mb-6 font-mono">{match.team1_score}</div>
                </div>
                
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => updateScore(Math.max(0, match.team1_score - 1), match.team2_score)}
                    className="bg-red-600 hover:bg-red-700 p-4 rounded-xl transition-colors shadow-lg hover:shadow-xl"
                  >
                    <Minus className="h-8 w-8" />
                  </button>
                  <button
                    onClick={() => updateScore(match.team1_score + 1, match.team2_score)}
                    className="bg-green-600 hover:bg-green-700 p-4 rounded-xl transition-colors shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-8 w-8" />
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 mx-auto mb-4">
                    {match.team2_logo_url ? (
                      <img src={match.team2_logo_url} alt={match.team2_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-2xl">{match.team2_name.charAt(0)}</span>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{match.team2_name}</h3>
                  <div className="text-6xl font-bold text-orange-400 mb-6 font-mono">{match.team2_score}</div>
                </div>
                
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => updateScore(match.team1_score, Math.max(0, match.team2_score - 1))}
                    className="bg-red-600 hover:bg-red-700 p-4 rounded-xl transition-colors shadow-lg hover:shadow-xl"
                  >
                    <Minus className="h-8 w-8" />
                  </button>
                  <button
                    onClick={() => updateScore(match.team1_score, match.team2_score + 1)}
                    className="bg-green-600 hover:bg-green-700 p-4 rounded-xl transition-colors shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-8 w-8" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Timer Control */}
          {activeTab === 'timer' && (
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-gray-900/70 to-black/70 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <h3 className="text-2xl font-bold mb-8 text-center flex items-center justify-center space-x-2">
                  <Timer className="h-6 w-6 text-orange-500" />
                  <span>Керування таймером</span>
                </h3>
                
                <div className="text-center mb-10">
                  <div className="bg-orange-500 inline-block px-6 py-3 rounded-xl mb-4">
                    <div className="text-black font-bold text-5xl font-mono">
                      {formatTime(displayTime)}
                    </div>
                  </div>
                  <div className="text-xl text-gray-300">
                    з {Math.floor(match.timer_duration / 60)} хвилин • {match.current_half === 1 ? 'Перший тайм' : 'Другий тайм'}
                    {match.is_timer_running && (
                      <div className="text-sm text-green-400 mt-1">🟢 Таймер працює безперервно</div>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <button
                    onClick={toggleTimer}
                    className={`flex items-center justify-center space-x-3 py-6 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl ${
                      match.is_timer_running 
                        ? 'bg-red-600 hover:bg-red-700 scale-105' 
                        : 'bg-green-600 hover:bg-green-700 hover:scale-105'
                    }`}
                  >
                    {match.is_timer_running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    <span>{match.is_timer_running ? 'ПАУЗА' : 'СТАРТ'}</span>
                  </button>
                  
                  <button
                    onClick={resetTimer}
                    className="flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 py-6 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <RotateCcw className="h-6 w-6" />
                    <span>СКИНУТИ</span>
                  </button>

                  <button
                    onClick={() => switchHalf(match.current_half === 1 ? 2 : 1)}
                    className="flex items-center justify-center space-x-3 bg-purple-600 hover:bg-purple-700 py-6 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <Clock className="h-6 w-6" />
                    <span>{match.current_half === 1 ? '2-Й ТАЙМ' : '1-Й ТАЙМ'}</span>
                  </button>
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => adjustTimer(-60)}
                    className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg transition-colors font-semibold"
                  >
                    -1 хв
                  </button>
                  <button
                    onClick={() => adjustTimer(-10)}
                    className="bg-red-500/70 hover:bg-red-600 px-6 py-3 rounded-lg transition-colors font-semibold"
                  >
                    -10 сек
                  </button>
                  <button
                    onClick={() => adjustTimer(10)}
                    className="bg-green-500/70 hover:bg-green-600 px-6 py-3 rounded-lg transition-colors font-semibold"
                  >
                    +10 сек
                  </button>
                  <button
                    onClick={() => adjustTimer(60)}
                    className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg transition-colors font-semibold"
                  >
                    +1 хв
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Teams Control */}
          {activeTab === 'teams' && (
            <>
              <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <h3 className="text-2xl font-bold mb-6 text-center flex items-center justify-center space-x-2">
                  <span>⚽</span>
                  <span>Команда 1</span>
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-300">Назва команди</label>
                    <input
                      type="text"
                      value={match.team1_name}
                      onChange={(e) => updateTeamInfo('team1', e.target.value, match.team1_logo_url || '')}
                      className="w-full bg-black/30 border border-white/30 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-300">URL логотипу</label>
                    <input
                      type="url"
                      value={match.team1_logo_url || ''}
                      onChange={(e) => updateTeamInfo('team1', match.team1_name, e.target.value)}
                      className="w-full bg-black/30 border border-white/30 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 mx-auto shadow-xl">
                      {match.team1_logo_url ? (
                        <img src={match.team1_logo_url} alt={match.team1_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-2xl">{match.team1_name.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-900/50 to-blue-900/50 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <h3 className="text-2xl font-bold mb-6 text-center flex items-center justify-center space-x-2">
                  <span>⚽</span>
                  <span>Команда 2</span>
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-300">Назва команди</label>
                    <input
                      type="text"
                      value={match.team2_name}
                      onChange={(e) => updateTeamInfo('team2', e.target.value, match.team2_logo_url || '')}
                      className="w-full bg-black/30 border border-white/30 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-300">URL логотипу</label>
                    <input
                      type="url"
                      value={match.team2_logo_url || ''}
                      onChange={(e) => updateTeamInfo('team2', match.team2_name, e.target.value)}
                      className="w-full bg-black/30 border border-white/30 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 mx-auto shadow-xl">
                      {match.team2_logo_url ? (
                        <img src={match.team2_logo_url} alt={match.team2_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-2xl">{match.team2_name.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Enhanced Players Control */}
          {activeTab === 'players' && (
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Add Player */}
              <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <h3 className="text-2xl font-bold mb-6 text-center flex items-center justify-center space-x-2">
                  <UserPlus className="h-6 w-6" />
                  <span>Швидке додавання гравця</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Команда</label>
                        <select
                          value={newPlayer.team}
                          onChange={(e) => setNewPlayer({ ...newPlayer, team: parseInt(e.target.value) })}
                          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                        >
                          <option value={1} className="bg-gray-800">{match.team1_name}</option>
                          <option value={2} className="bg-gray-800">{match.team2_name}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Номер</label>
                        <input
                          type="number"
                          placeholder="1-99"
                          value={newPlayer.number}
                          onChange={(e) => setNewPlayer({ ...newPlayer, number: e.target.value })}
                          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold mb-2">Ім'я гравця</label>
                      <input
                        type="text"
                        placeholder="Введіть ім'я гравця"
                        value={newPlayer.name}
                        onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                        className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Позиція</label>
                      <input
                        type="text"
                        placeholder="Воротар, Захисник, Півзахисник..."
                        value={newPlayer.position}
                        onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value })}
                        className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Статус</label>
                      <select
                        value={newPlayer.isOnField ? 'field' : 'bench'}
                        onChange={(e) => setNewPlayer({ ...newPlayer, isOnField: e.target.value === 'field' })}
                        className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="field" className="bg-gray-800">🟢 На полі</option>
                        <option value="bench" className="bg-gray-800">🟡 Запасний</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={addPlayer}
                      disabled={!newPlayer.name.trim()}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-4 rounded-xl font-bold text-lg transition-colors shadow-lg hover:shadow-xl"
                    >
                      Додати гравця
                    </button>
                    
                    {/* Excel Import/Export */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={downloadExcelTemplate}
                        className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition-colors text-sm"
                      >
                        <Download className="h-4 w-4" />
                        <span>Шаблон</span>
                      </button>
                      
                      <label className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-semibold transition-colors cursor-pointer text-sm">
                        <Upload className="h-4 w-4" />
                        <span>Excel</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleExcelUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        onClick={clearAllPlayers}
                        className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold transition-colors text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Очистити</span>
                      </button>
                    </div>
                    
                    <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                      <div className="flex items-start space-x-2 text-blue-300 text-sm">
                        <FileSpreadsheet className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-semibold mb-1">Excel інструкція:</div>
                          <div className="text-xs space-y-1">
                            <div>• Скачайте шаблон з прикладами</div>
                            <div>• Заповніть склади обох команд</div>
                            <div>• Завантажте готовий файл</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Squads */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Team 1 Squad */}
                <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <h3 className="text-xl font-bold mb-6 text-center flex items-center justify-center space-x-2">
                    <span>⚽</span>
                    <span>{match.team1_name}</span>
                  </h3>
                  
                  <div className="space-y-4">
                    {/* On Field Players */}
                    <div>
                      <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center space-x-2">
                        <span>🟢</span>
                        <span>На полі ({players.filter(p => p.team === 1 && p.is_on_field).length})</span>
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {players.filter(p => p.team === 1 && p.is_on_field).map((player) => (
                          <div key={player.id} className="flex items-center justify-between p-3 bg-green-600/20 rounded-lg border border-green-500/30">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {player.player_number || '?'}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{player.player_name}</div>
                                <div className="text-sm text-green-300">{player.position || 'Гравець'}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {editingPlayer?.id === player.id ? (
                                <>
                                  <button
                                    onClick={() => updatePlayer(editingPlayer)}
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingPlayer(null)}
                                    className="text-gray-400 hover:text-gray-300"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setEditingPlayer(player)}
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deletePlayer(player.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Substitutes */}
                    <div>
                      <h4 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center space-x-2">
                        <span>🟡</span>
                        <span>Запасні ({players.filter(p => p.team === 1 && !p.is_on_field).length})</span>
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {players.filter(p => p.team === 1 && !p.is_on_field).map((player) => (
                          <div key={player.id} className="flex items-center justify-between p-3 bg-yellow-600/20 rounded-lg border border-yellow-500/30">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-black font-bold text-sm">
                                {player.player_number || '?'}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{player.player_name}</div>
                                <div className="text-sm text-yellow-300">{player.position || 'Гравець'}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {editingPlayer?.id === player.id ? (
                                <>
                                  <button
                                    onClick={() => updatePlayer(editingPlayer)}
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingPlayer(null)}
                                    className="text-gray-400 hover:text-gray-300"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setEditingPlayer(player)}
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deletePlayer(player.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team 2 Squad */}
                <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                  <h3 className="text-xl font-bold mb-6 text-center flex items-center justify-center space-x-2">
                    <span>⚽</span>
                    <span>{match.team2_name}</span>
                  </h3>
                  
                  <div className="space-y-4">
                    {/* On Field Players */}
                    <div>
                      <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center space-x-2">
                        <span>🟢</span>
                        <span>На полі ({players.filter(p => p.team === 2 && p.is_on_field).length})</span>
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {players.filter(p => p.team === 2 && p.is_on_field).map((player) => (
                          <div key={player.id} className="flex items-center justify-between p-3 bg-green-600/20 rounded-lg border border-green-500/30">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {player.player_number || '?'}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{player.player_name}</div>
                                <div className="text-sm text-green-300">{player.position || 'Гравець'}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {editingPlayer?.id === player.id ? (
                                <>
                                  <button
                                    onClick={() => updatePlayer(editingPlayer)}
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingPlayer(null)}
                                    className="text-gray-400 hover:text-gray-300"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setEditingPlayer(player)}
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deletePlayer(player.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Substitutes */}
                    <div>
                      <h4 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center space-x-2">
                        <span>🟡</span>
                        <span>Запасні ({players.filter(p => p.team === 2 && !p.is_on_field).length})</span>
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {players.filter(p => p.team === 2 && !p.is_on_field).map((player) => (
                          <div key={player.id} className="flex items-center justify-between p-3 bg-yellow-600/20 rounded-lg border border-yellow-500/30">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center text-black font-bold text-sm">
                                {player.player_number || '?'}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{player.player_name}</div>
                                <div className="text-sm text-yellow-300">{player.position || 'Гравець'}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              {editingPlayer?.id === player.id ? (
                                <>
                                  <button
                                    onClick={() => updatePlayer(editingPlayer)}
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingPlayer(null)}
                                    className="text-gray-400 hover:text-gray-300"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setEditingPlayer(player)}
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deletePlayer(player.id)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Player Modal */}
              {editingPlayer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-white/20">
                    <h3 className="text-xl font-bold mb-6">Редагувати гравця</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Ім'я</label>
                        <input
                          type="text"
                          value={editingPlayer.player_name}
                          onChange={(e) => setEditingPlayer({ ...editingPlayer, player_name: e.target.value })}
                          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Номер</label>
                        <input
                          type="number"
                          value={editingPlayer.player_number || ''}
                          onChange={(e) => setEditingPlayer({ ...editingPlayer, player_number: parseInt(e.target.value) || undefined })}
                          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Позиція</label>
                        <input
                          type="text"
                          value={editingPlayer.position ?? ''}
                          onChange={(e) => setEditingPlayer({ ...editingPlayer, position: e.target.value })}
                          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                      <div className="flex space-x-4 pt-4">
                        <button
                          onClick={() => updatePlayer(editingPlayer)}
                          className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold"
                        >
                          Зберегти
                        </button>
                        <button
                          onClick={() => setEditingPlayer(null)}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg font-semibold"
                        >
                          Скасувати
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lineups Display Control */}
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <h3 className="text-2xl font-bold mb-6 text-center flex items-center justify-center space-x-2">
                  <List className="h-6 w-6" />
                  <span>Показати склади в трансляції</span>
                </h3>
                
                <div className="text-center">
                  <div className="mb-6">
                    <div className={`inline-flex items-center space-x-3 px-6 py-3 rounded-xl font-semibold ${
                      match.show_lineups 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}>
                      {match.show_lineups ? '✅ Склади ПОКАЗАНІ' : '❌ Склади ПРИХОВАНІ'}
                    </div>
                  </div>
                  
                  <button
                    onClick={toggleLineups}
                    className={`px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 ${
                      match.show_lineups 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {match.show_lineups ? 'ЗАБРАТИ СКЛАДИ' : 'ПОКАЗАТИ СКЛАДИ'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Events Control */}
          {activeTab === 'events' && (
            <div className="lg:col-span-2">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Add Event Form */}
                <div className="bg-gradient-to-br from-green-900/50 to-blue-900/50 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                  <h3 className="text-2xl font-bold mb-6 text-center flex items-center justify-center space-x-2">
                    <Activity className="h-6 w-6" />
                    <span>Додати подію</span>
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Тип події</label>
                      <select
                        value={newEvent.type}
                        onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                        className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="goal" className="bg-gray-800">⚽ Гол</option>
                        <option value="yellow_card" className="bg-gray-800">🟨 Жовта картка</option>
                        <option value="red_card" className="bg-gray-800">🟥 Червона картка</option>
                        <option value="substitution" className="bg-gray-800">🔄 Заміна</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Команда</label>
                      <select
                        value={newEvent.team}
                        onChange={(e) => setNewEvent({ ...newEvent, team: parseInt(e.target.value) })}
                        className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                      >
                        <option value={1} className="bg-gray-800">{match.team1_name}</option>
                        <option value={2} className="bg-gray-800">{match.team2_name}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Гравець</label>
                      <select
                        value={newEvent.player}
                        onChange={(e) => setNewEvent({ ...newEvent, player: e.target.value })}
                        className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="" className="bg-gray-800">Оберіть гравця</option>
                        {players
                          .filter(p => p.team === newEvent.team)
                          .map(player => (
                            <option key={player.id} value={player.player_name} className="bg-gray-800">
                              #{player.player_number || '?'} {player.player_name}
                            </option>
                          ))
                        }
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Хвилина</label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          value={newEvent.minute}
                          onChange={(e) => setNewEvent({ ...newEvent, minute: parseInt(e.target.value) || 0 })}
                          className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                        />
                        <button
                          onClick={() => setNewEvent({ ...newEvent, minute: getCurrentMinute() })}
                          className="bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded-lg text-sm font-semibold"
                        >
                          {getCurrentMinute()}'
                        </button>
                      </div>
                    </div>

                    {newEvent.type === 'substitution' && (
                      <div>
                        <label className="block text-sm font-semibold mb-2">Замінений гравець</label>
                        <select
                          value={newEvent.substituted_player}
                          onChange={(e) => setNewEvent({ ...newEvent, substituted_player: e.target.value })}
                          className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white"
                        >
                          <option value="" className="bg-gray-800">Оберіть заміненого гравця</option>
                          {players
                            .filter(p => p.team === newEvent.team && p.is_on_field)
                            .map(player => (
                              <option key={player.id} value={player.player_name} className="bg-gray-800">
                                #{player.player_number || '?'} {player.player_name}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold mb-2">Опис (опціонально)</label>
                      <input
                        type="text"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400"
                        placeholder="Додатковий опис"
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (!newEvent.minute) {
                          setNewEvent({ ...newEvent, minute: getCurrentMinute() });
                        }
                        addEvent();
                      }}
                      disabled={!newEvent.player.trim()}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg font-bold transition-colors"
                    >
                      Додати подію
                    </button>
                  </div>
                </div>

                {/* Events Timeline */}
                <div className="lg:col-span-2 bg-gradient-to-br from-gray-900/70 to-black/70 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                  <h3 className="text-2xl font-bold mb-6 text-center">
                    Хронологія подій матчу
                  </h3>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {events.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Подій поки немає</p>
                      </div>
                    ) : (
                      events.map((event) => (
                        <div key={event.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          event.is_broadcast === true || event.is_broadcast === 1
                            ? 'bg-green-900/40 border-green-500/60 shadow-lg' 
                            : 'bg-black/30 border-white/10'
                        }`}>
                          <div className="flex items-center space-x-4">
                            {/* Team Logo */}
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30 overflow-hidden">
                              {(event.team === 1 ? match.team1_logo_url : match.team2_logo_url) ? (
                                <img 
                                  src={event.team === 1 ? (match.team1_logo_url ?? '') : (match.team2_logo_url ?? '')} 
                                  alt="Team Logo"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-white font-bold text-xs">
                                  {(event.team === 1 ? match.team1_name : match.team2_name).slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            
                            {/* Event Emoji */}
                            <div className="text-3xl">{getEventIcon(event.event_type)}</div>
                            
                            <div className="flex-1">
                              <div className="font-semibold flex items-center space-x-2">
                                <span className="bg-orange-500 text-black px-2 py-1 rounded text-sm font-bold">
                                  {event.minute}'
                                </span>
                                <span>{getEventText(event)}</span>
                                {event.is_broadcast === true || event.is_broadcast === 1 ? (
                                  <span className="text-green-400 text-xs font-bold animate-pulse">🔴 LIVE</span>
                                ) : (
                                  <span className="text-gray-400 text-xs">⚪ ГОТОВО</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-300 mt-1">
                                {getEventDescription(event)}
                                {event.description && ` • ${event.description}`}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {/* Main Show/Hide Button */}
                            <button
                              onClick={() => toggleEventBroadcast(event.id, event.is_broadcast === true || event.is_broadcast === 1)}
                              className={`px-6 py-3 rounded-lg font-bold transition-all transform ${
                                event.is_broadcast === true || event.is_broadcast === 1
                                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse scale-105' 
                                  : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
                              }`}
                            >
                              {event.is_broadcast === true || event.is_broadcast === 1 ? (
                                'ПРИХОВАТИ'
                              ) : (
                                'ПОКАЗАТИ'
                              )}
                            </button>
                            
                            {/* Delete Button */}
                            <button
                              onClick={() => deleteEvent(event.id)}
                              className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/30 transition-colors"
                              title="Видалити подію"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-gray-900/70 to-black/70 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
                <h3 className="text-2xl font-bold mb-8 text-center flex items-center justify-center space-x-2">
                  <Settings className="h-6 w-6 text-orange-500" />
                  <span>Налаштування професійного табло</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-300">Тривалість тайму</label>
                    <select
                      value={match.timer_duration}
                      onChange={(e) => {
                        const duration = parseInt(e.target.value);
                        fetch(`/api/matches/${id}/settings`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ timer_duration: duration }),
                        });
                        setMatch(prev => prev ? { ...prev, timer_duration: duration } : null);
                        showFeedback('success', 'Тривалість тайму оновлено');
                      }}
                      className="w-full bg-black/30 border border-white/30 rounded-xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                    >
                      <option value={900} className="bg-gray-800">15 хвилин</option>
                      <option value={1800} className="bg-gray-800">30 хвилин</option>
                      <option value={2700} className="bg-gray-800">45 хвилин</option>
                      <option value={3600} className="bg-gray-800">60 хвилин</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-300">Статус трансляції</label>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => updateVisibility(true)}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all font-semibold ${
                          match.is_visible ? 'bg-green-600 scale-105 shadow-lg' : 'bg-gray-600 hover:bg-green-600'
                        }`}
                      >
                        <Eye className="h-5 w-5" />
                        <span>В ЕФІРІ</span>
                      </button>
                      <button
                        onClick={() => updateVisibility(false)}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all font-semibold ${
                          !match.is_visible ? 'bg-red-600 scale-105 shadow-lg' : 'bg-gray-600 hover:bg-red-600'
                        }`}
                      >
                        <EyeOff className="h-5 w-5" />
                        <span>НЕ В ЕФІРІ</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Copy Links Section */}
                <div className="mb-8">
                  <h4 className="text-lg font-bold mb-4 text-center text-gray-300">Копіювати посилання</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/scoreboard?match_id=${match.id}`, 'Табло')}
                      className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <Copy className="h-5 w-5" />
                      <span>Скопіювати Табло</span>
                    </button>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/lineups?match_id=${match.id}`, 'Склади')}
                      className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <Copy className="h-5 w-5" />
                      <span>Скопіювати Склади</span>
                    </button>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/events?match_id=${match.id}`, 'Події')}
                      className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <Copy className="h-5 w-5" />
                      <span>Скопіювати Події</span>
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      updateScore(0, 0);
                      showFeedback('success', 'Рахунок скинуто');
                    }}
                    className="bg-purple-600 hover:bg-purple-700 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Скинути рахунок (0:0)
                  </button>
                  <button
                    onClick={() => {
                      resetTimer();
                      switchHalf(1);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Новий тайм
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Почати новий матч? Це скине всі дані.')) {
                        updateScore(0, 0);
                        resetTimer();
                        switchHalf(1);
                        showFeedback('success', 'Новий матч почато');
                      }
                    }}
                    className="bg-purple-600 hover:bg-purple-700 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Новий матч (очистити все!)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
