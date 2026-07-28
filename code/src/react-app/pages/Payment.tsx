import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, CreditCard, Copy, CheckCircle, Clock } from "lucide-react";

export default function Payment() {
  const { user: mochaUser, isPending } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [paymentCreated, setPaymentCreated] = useState(false);

  useEffect(() => {
    if (!isPending && !mochaUser) {
      navigate("/");
    }
  }, [mochaUser, isPending, navigate]);

  const bankDetails = {
    cardNumber: "4441 1110 6432 8952",
    bank: "Monobank",
    recipient: "КАРП'ЮК АНДРІЙ СТЕПАНОВИЧ",
    amount: "500 ₴"
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const createPaymentRequest = async () => {
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await response.json();
      if (data.success) {
        setPaymentCreated(true);
      }
    } catch (error) {
      console.error("Error creating payment:", error);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <nav className="border-b border-white/20 bg-black/20 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="flex items-center space-x-2 hover:text-yellow-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Назад до панелі</span>
            </Link>
            <CreditCard className="h-8 w-8 text-yellow-400" />
            <h1 className="text-2xl font-bold">Оплата доступу</h1>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          
          {!paymentCreated ? (
            <>
              {/* Payment Info */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 mb-8">
                <div className="text-center mb-8">
                  <CreditCard className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-4">Оплата доступу до KS TV MatchScore</h2>
                  <div className="text-4xl font-bold text-yellow-400 mb-2">500 ₴</div>
                  <p className="text-gray-300">Одноразовий платіж за доступ до створення табло</p>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-center mb-4">Реквізити для переказу:</h3>
                  
                  {/* Bank Card */}
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">{bankDetails.bank}</h4>
                        <p className="text-sm text-gray-200">Карта Monobank</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(bankDetails.cardNumber.replace(/\s/g, ''))}
                        className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                      >
                        {copied ? <CheckCircle className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="text-2xl font-mono tracking-wider">
                        {bankDetails.cardNumber}
                      </div>
                      <div className="text-lg">
                        {bankDetails.recipient}
                      </div>
                      <div className="text-xl font-bold text-yellow-400">
                        Сума: {bankDetails.amount}
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-blue-600/20 border border-blue-400 rounded-xl p-6">
                    <h4 className="font-semibold mb-3">📋 Інструкція по оплаті:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                      <li>Скопіюйте номер карти натиснувши на кнопку копіювання</li>
                      <li>В коментар до платежу вкажіть свою <strong>електронну пошту</strong></li>
                      <li>Переведіть <strong>500 ₴</strong> на вказану карту</li>
                      <li>Натисніть кнопку "Підтвердити оплату" нижче</li>
                      <li>Очікуйте підтвердження від адміністратора (зазвичай до 24 годин)</li>
                      <li>Після підтвердження ви зможете створювати табло</li>
                    </ol>
                  </div>

                  {/* Confirm Button */}
                  <button
                    onClick={createPaymentRequest}
                    className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 py-4 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Підтвердити оплату
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Payment Confirmation */
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Заявка на оплату створена!</h2>
              
              <div className="bg-green-600/20 border border-green-400 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  <span className="font-semibold">Статус: Очікує підтвердження</span>
                </div>
                <p className="text-gray-300">
                  Ваша заявка передана адміністратору для підтвердження. 
                  Зазвичай обробка займає до 24 годин.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-gray-300">
                  Ви отримаєте доступ до створення табло одразу після підтвердження оплати адміністратором.
                </p>
                
                <Link
                  to="/dashboard"
                  className="inline-block bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Повернутися до панелі
                </Link>
              </div>
            </div>
          )}

          {/* Support Info */}
          <div className="bg-yellow-600/20 border border-yellow-400 rounded-xl p-6 mt-8">
            <h4 className="font-semibold mb-3">💬 Потрібна допомога?</h4>
            <p className="text-sm text-gray-300">
              Якщо у вас виникли питання щодо оплати або ви вже здійснили переказ, 
              але статус не оновився, зверніться до адміністратора:
            </p>
            <p className="text-sm text-yellow-400 mt-2 font-mono">
      <a href="https://www.instagram.com/karpiuksporttv/" target="_blank">KS TV INSTAGRAM! (@karpiuksporttv)</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
