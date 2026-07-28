import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Shield, ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        navigate("/admin");
      } else {
        setError(data.message || "Невірні дані для входу");
      }
    } catch (error) {
      console.error("Admin login error:", error);
      setError("Помилка входу до системи");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <nav className="border-b border-white/20 bg-black/20 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="flex items-center space-x-2 hover:text-yellow-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>На головну</span>
            </Link>
            <Shield className="h-8 w-8 text-red-400" />
            <h1 className="text-2xl font-bold">Адміністративний вхід</h1>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-20">
        <div className="max-w-md mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Вхід адміністратора</h2>
              <p className="text-gray-300">Увійдіть для доступу до панелі керування</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-600/20 border border-red-400 rounded-lg p-4 text-red-200 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email адміністратора
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="🖕"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-white/10 border border-white/30 rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Введіть пароль"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !formData.email || !formData.password}
                className="w-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed py-4 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none"
              >
                {loading ? "Входимо..." : "Увійти"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <div className="bg-yellow-600/20 border border-yellow-400 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  🔒 Тільки для адміністраторів системи KS TV MatchScore
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
