import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

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
  created_at: string;
}

export default function EventsPage() {
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("match_id");
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);

  useEffect(() => {
    if (!matchId) {
      setError("Match ID required");
      setLoading(false);
      return;
    }

    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 2000);
    return () => clearInterval(interval);
  }, [matchId]);

  useEffect(() => {
    // Auto-rotate through events every 8 seconds
    if (events.length > 1) {
      const interval = setInterval(() => {
        setCurrentEventIndex((prev) => (prev + 1) % events.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [events.length]);

  const fetchData = async () => {
    try {
      const [matchResponse, eventsResponse] = await Promise.all([
        fetch(`/api/matches/${matchId}`),
        fetch(`/api/matches/${matchId}/events`)
      ]);

      const matchData = await matchResponse.json();
      const eventsData = await eventsResponse.json();

      if (matchData.success) {
        setMatch(matchData.data);
      } else {
        setError("Match not found");
      }

      if (eventsData.success) {
        // Sort events by minute and created_at (newest first for same minute) and filter broadcast events
        const sortedEvents = eventsData.data
          .filter((event: MatchEvent & {is_broadcast?: boolean | number}) => 
            (event.is_broadcast === true || event.is_broadcast === 1))
          .sort((a: MatchEvent, b: MatchEvent) => {
            if (a.minute !== b.minute) {
              return b.minute - a.minute; // Newest minute first
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Newest first
          });
        setEvents(sortedEvents);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const getEventEmoji = (eventType: string) => {
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
        return 'ГОООЛ!';
      case 'yellow_card':
        return 'ЖОВТА!';
      case 'red_card':
        return 'ЧЕРВОНА!';
      case 'substitution':
        return 'ЗАМІНА!';
      default:
        return 'ПОДІЯ';
    }
  };

  const getEventDescription = (event: MatchEvent) => {
    switch (event.event_type) {
      case 'goal':
        return `${event.player_name}`;
      case 'yellow_card':
        return `${event.player_name}`;
      case 'red_card':
        return `${event.player_name}`;
      case 'substitution':
        return `${event.player_name} ↔ ${event.substituted_player_name || 'Гравець'}`;
      default:
        return event.description || event.player_name;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-transparent"></div>;
  }

  if (error || !match || !match.is_visible || events.length === 0) {
    return <div className="min-h-screen bg-transparent"></div>;
  }

  const currentEvent = events[currentEventIndex];
  const teamLogo = currentEvent.team === 1 ? match.team1_logo_url : match.team2_logo_url;
  const teamName = currentEvent.team === 1 ? match.team1_name : match.team2_name;

  return (
    <div className="fixed top-32 right-8 z-50 pointer-events-none">
      <div className="event-notification animate-in slide-in-from-right-5 fade-in duration-700">
        <div style={{ position: 'relative' }}>
          {/* Main Event Card - Fixed Size */}
          <div className="bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-indigo-900/95 backdrop-blur-xl border-2 border-white/20 rounded-3xl shadow-2xl" style={{ width: '420px', height: '210px', padding: '2rem' }}>
            
            {/* Event Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                {/* Team Logo */}
                <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center overflow-hidden shadow-lg">
                  {teamLogo ? (
                    <img 
                      src={teamLogo} 
                      alt={teamName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-xl">
                      {teamName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                
                {/* Event Type Emoji */}
                <div className="text-5xl animate-bounce">
                  {getEventEmoji(currentEvent.event_type)}
                </div>
              </div>
              
              {/* Minute Badge */}
              <div className="bg-orange-500 text-black font-black text-2xl px-4 py-2 rounded-xl shadow-lg">
                {currentEvent.minute}'
              </div>
            </div>

            {/* Event Content */}
            <div className="space-y-4">
              {/* Event Type */}
              <div className="text-center">
                <div className="text-3xl font-black text-white mb-2 tracking-wider">
                  {getEventText(currentEvent)}
                </div>
                
                {/* Event Description */}
                <div className="text-xl font-bold text-blue-200 leading-tight">
                  {getEventDescription(currentEvent)}
                </div>
              </div>

              {/* Team Name Bar */}

              {/* Additional Description */}
              {currentEvent.description && (
                <div className="text-center text-gray-300 text-sm bg-black/30 py-2 px-4 rounded-lg">
                  {currentEvent.description}
                </div>
              )}
            </div>

            {/* Progress Indicator for Multiple Events */}
            {events.length > 1 && (
              <div className="mt-6 flex justify-center space-x-2">
                {events.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentEventIndex
                        ? 'bg-orange-500 scale-125'
                        : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Animated Border Glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-orange-500/20 animate-pulse -z-10 blur-xl"></div>
          </div>
          
          {/* KS TV Branding */}
          {/*  <div className="absolute -bottom-10 -left-2 bg-gradient-to-r from-red-600 to-red-700 px-5 py-3 rounded-xl shadow-2xl border border-white/20">
            <div className="text-white font-black text-sm tracking-widest flex items-center space-x-2">
              <span>KS TV LIVE</span>
            </div>
          </div>
*/}
          {/* Side Accent Lines */}
          <div className="absolute -left-1 top-8 bottom-8 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-orange-500 rounded-full"></div>
          <div className="absolute -right-1 top-8 bottom-8 w-1 bg-gradient-to-b from-orange-500 via-purple-500 to-blue-500 rounded-full"></div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-from-right-5 {
          from {
            opacity: 0;
            transform: translateX(1.25rem);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-in {
          animation-fill-mode: both;
        }
        
        .slide-in-from-right-5 {
          animation-name: slide-in-from-right-5;
        }
        
        .fade-in {
          animation-name: fade-in;
        }
        
        .duration-700 {
          animation-duration: 0.7s;
        }
      `}</style>
    </div>
  );
}
