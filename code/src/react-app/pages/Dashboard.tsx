import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { 
  Plus, Settings, LogOut, CreditCard, Shield, Trophy, Trash2, 
  ExternalLink, Copy, Radio, Activity, CheckCircle, AlertCircle,
  Sparkles, Flame, Play, Clock, Users, ArrowRight
} from "lucide-react";
import { getUserMatches, deleteMatch as apiDeleteMatch, MatchData } from "@/lib/supabase-queries";

export default function Dashboard() {
  const { user: mochaUser, appUser, logout, isPending, refreshAppUser } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!isPending && !mochaUser) {
      navigate("/");
      return;
    }

    if (mochaUser) {
      refreshAppUser();
      fetchMatches();
    }
  }, [mochaUser, isPending, navigate]);

  const fetchMatches = async () => {
    try {
      setLoadingMatches(true);
      const data = await getUserMatches();
      setMatches(data);
    } catch (error) {
      console.error("Error fetching matches:", error);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const copyToClipboard = async (url: string, title: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showFeedback("success", `✨ Посилання на ${title} скопійовано!`);
    } catch (error) {
      showFeedback("error", "Не вдалося скопіювати");
    }
  };

  const handleDeleteMatch = async (matchId: number) => {
    if (!window.confirm("Ви впевнені, що хочете видалити це табло?")) {
      return;
    }

    try {
      const success = await apiDeleteMatch(matchId);
      if (success) {
        setMatches(prev => prev.filter(m => m.id !== matchId));
        showFeedback("success", "Табло успішно видалено");
      } else {
        showFeedback("error", "Помилка видалення табло");
      }
    } catch (error) {
      console.error("Error deleting match:", error);
      showFeedback("error", "Помилка видалення табло");
    }
  };

  if (isPending || loadingMatches) {
    return (
      <div className="min-h-screen bg-[#06080F] flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Завантаження кабінету трансляцій...</p>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-6 text-white text-center">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/[0.08]">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-2">Налаштування профілю</h1>
          <p className="text-slate-400 text-sm mb-6">Створюємо ваш персональний трансляційний хаб...</p>
          <button
            onClick={() => refreshAppUser()}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm transition-all shadow-lg"
          >
            Оновити сторінку
          </button>
        </div>
      </div>
    );
  }

  const isAccessAllowed = appUser.is_payment_confirmed || appUser.is_admin;

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 pb-16 font-display">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-xl text-white font-medium flex items-center space-x-3 transition-all ${
          feedback.type === 'success' ? 'bg-emerald-600/90 border border-emerald-400/30' : 'bg-rose-600/90 border border-rose-400/30'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-200" /> : <AlertCircle className="h-5 w-5 text-rose-200" />}
          <span className="text-sm">{feedback.message}</span>
        </div>
      )}

      {/* Top Luxury Navbar */}
      <header className="sticky top-0 z-40 bg-[#0A0D18]/80 backdrop-blur-2xl border-b border-white/[0.08]">
        <div className="container mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight">KS TV</span>
              <span className="text-xs text-blue-400 font-mono block -mt-1 font-semibold">PRO SCOREBOARD</span>
            </div>
            
            {appUser.is_admin && (
              <Link
                to="/admin"
                className="hidden sm:flex items-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-xl text-xs font-bold transition-all ml-2"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Admin Suite</span>
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white">{appUser.name || 'Користувач'}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">{appUser.email}</div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 border border-white/[0.06] transition-all"
              title="Вийти з акаунту"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="container mx-auto px-6 py-8 max-w-6xl space-y-8">
        
        {/* Account Status / Hero Card */}
        {!isAccessAllowed ? (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                <CreditCard className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Активуйте безлімітний доступ до табло</h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">Оплатіть доступ та надсилайте квитанцію для миттєвої активації</p>
              </div>
            </div>
            <Link
              to="/payment"
              className="w-full md:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-amber-500/25 text-center whitespace-nowrap active:scale-95"
            >
              Оплатити підписку
            </Link>
          </div>
        ) : (
          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
              <div>
                <h2 className="text-base font-bold text-white">PRO Підписка Активна</h2>
                <p className="text-xs text-slate-400">Всі трансляційні функції, OBS табло та склади розблоковано</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              UNLIMITED PRO
            </span>
          </div>
        )}

        {/* Dashboard Match Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Ваші футбольні табло</h2>
            <p className="text-xs text-slate-400 mt-0.5">Керуйте рахунком, складами та титрами в прямому етері</p>
          </div>

          {isAccessAllowed && (
            <Link
              to="/create-match"
              className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/20 border border-blue-400/30 transition-all transform active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Створити нове табло</span>
            </Link>
          )}
        </div>

        {/* Matches Grid */}
        {matches.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-white/[0.08] text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-400">
              <Trophy className="h-8 w-8 text-amber-400/60" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">У вас поки немає створених табло</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {isAccessAllowed 
                  ? "Створіть свій перший матч прямо зараз і отримайте посилання для OBS за 10 секунд!"
                  : "Оплатіть доступ, щоб створювати професійні табло для трансляцій."}
              </p>
            </div>
            {isAccessAllowed ? (
              <Link
                to="/create-match"
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Створити перший матч</span>
              </Link>
            ) : (
              <Link
                to="/payment"
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all"
              >
                <CreditCard className="h-4 w-4" />
                <span>Перейти до оплати</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((m) => {
              const scoreboardUrl = `${window.location.origin}/scoreboard?match=${m.id}`;
              return (
                <div 
                  key={m.id} 
                  className="glass-card rounded-3xl p-6 border border-white/[0.08] flex flex-col justify-between space-y-6 hover:border-blue-500/40 transition-all group"
                >
                  <div>
                    {/* Top match header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        m.is_visible 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.is_visible ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'}`}></span>
                        <span>{m.is_visible ? 'В ЕФІРІ' : 'ПРИХОВАНО'}</span>
                      </span>

                      <span className="text-xs font-mono text-slate-400">
                        {m.current_half === 1 ? '1-й тайм' : '2-й тайм'}
                      </span>
                    </div>

                    {/* Team 1 vs Team 2 Score Card */}
                    <div className="bg-[#090C16] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between mb-4">
                      {/* Team 1 */}
                      <div className="flex items-center space-x-2 text-left flex-1 min-w-0">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-white"
                          style={{ backgroundColor: m.team1_color || '#2563eb' }}
                        >
                          {m.team1_name ? m.team1_name.slice(0, 1) : '1'}
                        </div>
                        <span className="font-bold text-sm text-white truncate">{m.team1_name}</span>
                      </div>

                      {/* Score */}
                      <div className="px-3 py-1 rounded-xl bg-black/60 font-mono font-black text-lg text-white mx-2 shrink-0">
                        <span className="text-blue-400">{m.team1_score}</span>
                        <span className="text-slate-600 mx-1">:</span>
                        <span className="text-amber-400">{m.team2_score}</span>
                      </div>

                      {/* Team 2 */}
                      <div className="flex items-center space-x-2 text-right justify-end flex-1 min-w-0">
                        <span className="font-bold text-sm text-white truncate">{m.team2_name}</span>
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-white"
                          style={{ backgroundColor: m.team2_color || '#d97706' }}
                        >
                          {m.team2_name ? m.team2_name.slice(0, 1) : '2'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                    <Link
                      to={`/match/${m.id}`}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>Керувати матчем (Cockpit)</span>
                    </Link>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyToClipboard(scoreboardUrl, "табло OBS")}
                        className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center space-x-1.5 border border-white/[0.06] transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5 text-blue-400" />
                        <span>Скопіювати OBS</span>
                      </button>

                      <button
                        onClick={() => handleDeleteMatch(m.id)}
                        className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-semibold flex items-center justify-center space-x-1.5 border border-white/[0.06] transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Видалити</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
