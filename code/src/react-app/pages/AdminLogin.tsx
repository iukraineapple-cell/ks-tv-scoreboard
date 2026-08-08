import { useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Shield, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, appUser, isPending, redirectToLogin } = useAuth();

  useEffect(() => {
    if (!isPending) {
      if (appUser?.is_admin) {
        navigate("/admin");
      }
    }
  }, [isPending, appUser, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
        <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Вхід для Адміністраторів</h1>
        <p className="text-slate-400 text-sm mb-6">
          Доступ до панелі управління надається авторизованим користувачам з правами адміністратора.
        </p>

        {user ? (
          appUser?.is_admin ? (
            <div className="text-green-400 font-semibold mb-4">Ви увійшли як адміністратор. Перенаправлення...</div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm mb-6">
              Ваш акаунт (<strong>{user.email}</strong>) не має прав адміністратора.
            </div>
          )
        ) : (
          <button
            onClick={redirectToLogin}
            className="w-full bg-red-600 hover:bg-red-500 font-semibold py-3 rounded-xl transition-all shadow-lg shadow-red-600/25 mb-4"
          >
            Увійти через Google
          </button>
        )}

        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 text-slate-400 hover:text-white text-sm transition-colors mt-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Повернутися до кабінету</span>
        </Link>
      </div>
    </div>
  );
}
