import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Play, Trophy, Users, Shield, Mail, Lock, User, X } from "lucide-react";

export default function Home() {
  const { user, isPending, redirectToLogin, loginWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && user) {
      navigate("/dashboard");
    }
  }, [user, isPending, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (authMode === "login") {
        const res = await loginWithEmail(email, password);
        if (res.success) {
          navigate("/dashboard");
        } else {
          setError(res.error || "Помилка входу");
        }
      } else {
        const res = await signUpWithEmail(email, password, name || email);
        if (res.success) {
          navigate("/dashboard");
        } else {
          setError(res.error || "Помилка реєстрації");
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Помилка авторизації");
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <h1 className="text-2xl font-bold">KS TV</h1>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 px-6 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Увійти
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
            Зручне футбольне табло в прямому етері
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300">
            Створіть ідеальне табло для ваших спортивних трансляцій!
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black px-12 py-4 rounded-lg text-xl font-bold transition-all duration-200 transform hover:scale-105 shadow-2xl"
          >
            Почати зараз
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-16">Можливості платформи</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300">
            <Play className="h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Табло у реальному часі</h3>
            <p className="text-gray-300">
              Оновлення рахунку та таймера в реальному часі для ваших глядачів.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300">
            <Trophy className="h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold mb-4">OBS інтеграція</h3>
            <p className="text-gray-300">
              Унікальні посилання для кожного матчу для використання в OBS Studio.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300">
            <Users className="h-12 w-12 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Персоналізація</h3>
            <p className="text-gray-300">
              Додавайте логотипи команд і відображайте всю необхідну інформацію на екрані.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-md mx-auto bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="text-center">
            <Shield className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">Доступ до платформи</h3>
            <div className="text-4xl font-bold mb-2">500 ₴</div>
            <p className="text-gray-300 mb-8">4 тижні</p>
            
            <ul className="text-left space-y-3 mb-8">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                500 ₴ - і ви отримуєте те, що змінює гру!
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Професійна графіка, OBS посилання для кожного матчу
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Зробіть свій ефір професійним уже сьогодні!
              </li>
            </ul>
            
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black py-3 rounded-lg font-bold transition-all duration-200 transform hover:scale-105"
            >
              Розпочати
            </button>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full relative text-white shadow-2xl">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="text-center mb-6">
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
              <h2 className="text-2xl font-bold">
                {authMode === "login" ? "Вхід у кабінет" : "Реєстрація"}
              </h2>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg text-sm mb-4 text-center">
                {error}
              </div>
            )}

            {/* Google Login Option */}
            <button
              onClick={redirectToLogin}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 rounded-xl mb-4 flex items-center justify-center space-x-2 transition-colors shadow"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Увійти через Google</span>
            </button>

            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-xs text-slate-500 uppercase">або за електронною поштою</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {authMode === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ваше ім'я</label>
                  <div className="relative">
                    <User className="h-5 w-5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Іван"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="h-5 w-5 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Пароль</label>
                <div className="relative">
                  <Lock className="h-5 w-5 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? "Зачекайте..." : authMode === "login" ? "Увійти" : "Зареєструватися"}
              </button>
            </form>

            <div className="text-center mt-6 text-sm text-slate-400">
              {authMode === "login" ? (
                <p>
                  Немає акаунту?{" "}
                  <button onClick={() => setAuthMode("signup")} className="text-blue-400 hover:underline font-semibold">
                    Зареєструватися
                  </button>
                </p>
              ) : (
                <p>
                  Вже є акаунт?{" "}
                  <button onClick={() => setAuthMode("login")} className="text-blue-400 hover:underline font-semibold">
                    Увійти
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-white/20">
        <div className="text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} KS TV. Всі права захищені.</p>
        </div>
      </footer>
    </div>
  );
}
