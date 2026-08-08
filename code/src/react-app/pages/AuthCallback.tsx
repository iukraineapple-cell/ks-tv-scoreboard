import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();

  useEffect(() => {
    if (!isPending) {
      if (user) {
        navigate("/dashboard");
      } else {
        // Allow brief fallback timeout before redirecting home if auth failed
        const timer = setTimeout(() => {
          navigate("/");
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, isPending, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Авторизація...</h1>
        <p className="text-gray-300">Зачекайте, ми завершуємо вхід до системи</p>
      </div>
    </div>
  );
}
