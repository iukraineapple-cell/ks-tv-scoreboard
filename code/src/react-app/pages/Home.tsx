import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/lib/auth";
import { 
  Trophy, Play, Pause, Users, Shield, ArrowRight, Zap, 
  Radio, CheckCircle2, Flame, Star, Sparkles, X, Mail, Lock, User,
  Tv, Cpu, Laptop, Smartphone, Eye
} from "lucide-react";

export default function Home() {
  const { user, isPending, loginWithEmail, signUpWithEmail, redirectToLogin: googleLogin } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Interactive Live Scoreboard Simulator on Landing Page
  const [simScore1, setSimScore1] = useState(2);
  const [simScore2, setSimScore2] = useState(1);
  const [simTime, setSimTime] = useState(3840); // 64:00
  const [simRunning, setSimRunning] = useState(true);

  useEffect(() => {
    if (user && !isPending) {
      navigate("/dashboard");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (simRunning) {
      interval = setInterval(() => {
        setSimTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [simRunning]);

  const formatSimTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (authMode === "login") {
        const res = await loginWithEmail(email, password);
        if (!res.success) throw new Error(res.error || "Помилка входу");
      } else {
        const res = await signUpWithEmail(email, password, name);
        if (!res.success) throw new Error(res.error || "Помилка реєстрації");
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Помилка авторизації. Перевірте введені дані.");
    } finally {
      setLoading(false);
    }
  };

  const redirectToLogin = () => {
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-[#06080F] text-slate-100 selection:bg-blue-600 selection:text-white font-display overflow-x-hidden">
      {/* Background Ambient Glow Lights */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed top-1/3 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Top Navbar */}
      <nav className="border-b border-white/[0.08] bg-[#090C16]/70 backdrop-blur-2xl sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="h-6 w-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-xl text-white tracking-tight">KS TV</span>
              <span className="text-[10px] text-blue-400 font-mono block -mt-1 font-bold">SCOREBOARD PRO</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setAuthMode("login");
                setShowAuthModal(true);
              }}
              className="text-xs sm:text-sm font-bold text-slate-300 hover:text-white px-4 py-2 rounded-xl transition-colors"
            >
              Вхід
            </button>
            <button
              onClick={() => {
                setAuthMode("signup");
                setShowAuthModal(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 border border-blue-400/30 transition-all transform active:scale-95"
            >
              Розпочати
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-16 pb-24 text-center max-w-5xl">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-8 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>Нове покоління трансляційних футбольних табло</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Зручне футбольне табло в прямому етері
        </h1>
        
        <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
          Професійне табло для OBS Studio та vMix. Керуйте рахунком, таймером, складами та титрами в один клік зі смартфона або ПК.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => {
              setAuthMode("signup");
              setShowAuthModal(true);
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-base font-black px-8 py-4 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-2xl shadow-amber-500/30 flex items-center justify-center space-x-2"
          >
            <span>Створити табло безкоштовно</span>
            <ArrowRight className="h-5 w-5 stroke-[2.5]" />
          </button>

          <a
            href="#demo"
            className="w-full sm:w-auto px-6 py-4 rounded-2xl glass-card text-slate-300 hover:text-white text-sm font-bold border border-white/[0.08] transition-all"
          >
            Спробувати інтерактивне демо
          </a>
        </div>

        {/* Live Interactive Scoreboard Simulation Widget */}
        <div id="demo" className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.1] shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-rose-400 font-bold">Інтерактивна симуляція OBS табло</span>
            </span>
            <span className="hidden sm:inline">Спробуйте натиснути кнопки нижче</span>
          </div>

          {/* Rendered Overlay */}
          <div className="bg-[#080B14] rounded-2xl p-6 flex flex-col items-center justify-center border border-white/[0.06] shadow-inner min-h-[140px]">
            <div className="flex items-center bg-[#07090F]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden font-display">
              {/* Left Team */}
              <div className="flex items-center space-x-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-900/40 to-transparent">
                <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-xs font-black text-white">
                  K
                </div>
                <span className="font-extrabold text-sm sm:text-base text-white">КАРПАТИ</span>
              </div>

              {/* Score */}
              <div className="flex items-center bg-black/85 px-4 py-2 border-x border-white/10 font-mono font-black text-xl sm:text-2xl text-white">
                <span className="text-blue-400">{simScore1}</span>
                <span className="text-slate-500 mx-2">:</span>
                <span className="text-amber-400">{simScore2}</span>
              </div>

              {/* Right Team */}
              <div className="flex items-center space-x-2.5 px-4 py-2.5 bg-gradient-to-l from-amber-900/40 to-transparent">
                <span className="font-extrabold text-sm sm:text-base text-white">ДИНАМО</span>
                <div className="w-7 h-7 rounded-md bg-amber-600 flex items-center justify-center text-xs font-black text-white">
                  D
                </div>
              </div>

              {/* Timer */}
              <div className="flex items-center space-x-2 px-3.5 py-2.5 bg-amber-500 text-slate-950 font-black font-mono text-sm border-l border-amber-400/40">
                <span>{formatSimTime(simTime)}</span>
                <span className="text-[10px] bg-slate-950/20 px-1 py-0.5 rounded font-bold uppercase">2T</span>
              </div>
            </div>
          </div>

          {/* Simulator Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/[0.06]">
            <button
              onClick={() => setSimScore1(s => s + 1)}
              className="py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold border border-blue-500/30 transition-all active:scale-95"
            >
              +1 Карпати
            </button>
            <button
              onClick={() => setSimScore2(s => s + 1)}
              className="py-2 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all active:scale-95"
            >
              +1 Динамо
            </button>
            <button
              onClick={() => setSimRunning(r => !r)}
              className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-bold border border-white/[0.08] transition-all active:scale-95"
            >
              {simRunning ? 'Пауза таймера' : 'Старт таймера'}
            </button>
            <button
              onClick={() => {
                setSimScore1(0);
                setSimScore2(0);
                setSimTime(0);
              }}
              className="py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-bold border border-white/[0.08] transition-all active:scale-95"
            >
              Скинути (0:0)
            </button>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="container mx-auto px-6 py-20 max-w-6xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4">
            <Radio className="h-3.5 w-3.5" />
            <span>Повний набір інструментів для трансляцій</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Все для трансляції на YouTube та в OBS в одному місці
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Стрімте з камери смартфона на YouTube з накладеною графікою або транслюйте через OBS Studio та vMix.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1: Mobile YouTube Live Studio */}
          <div className="glass-card rounded-3xl p-8 border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent flex flex-col justify-between space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">Новинка</span>
              <h3 className="text-lg font-bold text-white mb-2">Стрім на YouTube з телефона</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Запустіть камеру смартфона прямо в браузері — табло, таймер, голи та склади накладаються поверх відео в реальному часі.
              </p>
            </div>
          </div>

          {/* Feature 2: Instant OBS & vMix */}
          <div className="glass-card rounded-3xl p-8 border border-white/[0.08] flex flex-col justify-between space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400">
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Миттєве підключення до OBS</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Додайте Browser Source у OBS Studio або vMix. Графіка оновлюється з нульовою затримкою через Supabase WebSocket.
              </p>
            </div>
          </div>

          {/* Feature 3: Match Cockpit */}
          <div className="glass-card rounded-3xl p-8 border border-white/[0.08] flex flex-col justify-between space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Гарячі клавіші та пульт</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Керуйте грою з клавіатури: Space для таймера, 1 і 2 для голів, швидкі картки та сповіщення нижнього титру.
              </p>
            </div>
          </div>

          {/* Feature 4: Excel Lineups */}
          <div className="glass-card rounded-3xl p-8 border border-white/[0.08] flex flex-col justify-between space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Імпорт складів з Excel</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Завантажуйте готові списки команд у форматі Excel в 1 клік — стартовий склад та запасні готові до етеру.
              </p>
            </div>
          </div>

          {/* Feature 5: 3 Premium Themes */}
          <div className="glass-card rounded-3xl p-8 border border-white/[0.08] flex flex-col justify-between space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">3 преміум теми графіки</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Champions Glass, Premier Pro та Cyber Neon з налаштуванням позиціонування та фірмових кольорів команд.
              </p>
            </div>
          </div>

          {/* Feature 6: Local HD Recording */}
          <div className="glass-card rounded-3xl p-8 border border-white/[0.08] flex flex-col justify-between space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Tv className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Локальний HD запис</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Зберігайте повний запис матчу з накладеною графікою прямо на телефон або ПК у високій якості.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-6 py-20 max-w-4xl">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent shadow-2xl relative overflow-hidden text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold mb-4">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>UNLIMITED PRO PASS</span>
          </div>

          <h3 className="text-3xl sm:text-4xl font-black text-white mb-4">Повний доступ до платформи</h3>
          <div className="text-5xl sm:text-6xl font-black font-mono-tabular text-amber-400 mb-2">500 ₴</div>
          <p className="text-xs sm:text-sm text-slate-400 mb-8">4 тижні безлімітного користування для всіх ваших трансляцій</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left mb-8 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Необмежена кількість матчів</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>OBS та vMix посилання</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Імпорт складів з Excel</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>3 преміум стилі графіки</span>
            </div>
          </div>

          <button
            onClick={() => {
              setAuthMode("signup");
              setShowAuthModal(true);
            }}
            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm sm:text-base transition-all shadow-xl shadow-amber-500/25 active:scale-95"
          >
            Отримати доступ зараз
          </button>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="glass-panel border border-white/20 rounded-3xl p-8 max-w-md w-full relative text-white shadow-2xl">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <Trophy className="h-10 w-10 text-amber-400 mx-auto mb-2" />
              <h2 className="text-2xl font-bold font-display">
                {authMode === "login" ? "Вхід у кабінет" : "Створення акаунту"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">Керуйте своїми матчами та табло</p>
            </div>

            {error && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 p-3 rounded-xl text-xs mb-4 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              {authMode === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ваше ім'я</label>
                  <div className="relative">
                    <User className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Олександр"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm w-full outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm w-full outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Пароль</label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm w-full outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 active:scale-95"
              >
                {loading ? "Зачекайте..." : authMode === "login" ? "Увійти в кабінет" : "Зареєструватися"}
              </button>
            </form>

            <div className="text-center mt-6 text-xs text-slate-400">
              {authMode === "login" ? (
                <p>
                  Немає акаунту?{" "}
                  <button onClick={() => setAuthMode("signup")} className="text-blue-400 hover:underline font-bold">
                    Зареєструватися
                  </button>
                </p>
              ) : (
                <p>
                  Вже є акаунт?{" "}
                  <button onClick={() => setAuthMode("login")} className="text-blue-400 hover:underline font-bold">
                    Увійти
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} KS TV SCOREBOARD. Всі права захищені.</p>
      </footer>
    </div>
  );
}
