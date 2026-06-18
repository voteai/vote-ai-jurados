import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function LoginSplitLayout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithEmail } = useAuth();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!email) newErrors.email = "E-mail é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "E-mail inválido";
    if (!password) newErrors.password = "Senha é obrigatória";
    if (password && password.length < 6)
      newErrors.password = "Senha deve ter pelo menos 6 caracteres";
    return newErrors;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await loginWithEmail(email, password);
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      const msg =
        error.status === 401 ||
        error.status === 403 ||
        error.message?.includes("Invalid credentials") ||
        error.message?.includes("Unauthorized")
          ? "E-mail ou senha incorretos"
          : "Erro ao fazer login. Tente novamente.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 gap-0">
      {/* Left Column - Desktop Only */}
      <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-teal-600 to-teal-700 text-white p-12">
        <div>
          <h1 className="text-4xl font-bold mb-4">Vote Aí Jurados</h1>
          <p className="text-lg text-teal-100">
            Acesse seu painel de avaliações, gestão de concursos e apuração automática de resultados.
          </p>
        </div>

        <div className="space-y-6">
          {[
            { icon: TrendingUp, text: "Apuração automática de notas" },
            { icon: CheckCircle2, text: "Avaliações enviadas com segurança" },
            { icon: TrendingUp, text: "Ranking atualizado em tempo real" },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-center gap-3">
                <Icon className="w-6 h-6 flex-shrink-0" />
                <span className="text-teal-100">{item.text}</span>
              </div>
            );
          })}
        </div>

        {/* Mini Demo Cards */}
        <div className="space-y-3 text-sm text-teal-100">
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="font-semibold text-white mb-1">Status do evento</div>
            <div className="flex justify-between">
              <span>Avaliações enviadas:</span>
              <span className="font-bold">24/28</span>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="font-semibold text-white mb-1">Seu papel</div>
            <div>Acesso conforme seu perfil (Organizador, Jurado ou Admin)</div>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex flex-col justify-center bg-white px-6 sm:px-12 py-12">
        <div className="max-w-sm mx-auto w-full space-y-8">
          {/* Logo - Mobile */}
          <div className="md:hidden text-center">
            <h1 className="text-3xl font-bold text-slate-900">Vote Aí</h1>
            <p className="text-sm text-slate-600">Jurados</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Acesse o Vote Aí Jurados
            </h2>
            <p className="text-slate-600">
              Entre para gerenciar concursos, avaliar participantes ou acompanhar a apuração.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-lg border transition focus:outline-none focus:ring-2 ${
                  errors.email
                    ? "border-red-300 focus:ring-red-200"
                    : "border-slate-300 focus:ring-teal-200"
                } bg-white text-slate-900`}
                placeholder="seu@email.com"
                disabled={loading}
              />
              {errors.email && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-lg border transition focus:outline-none focus:ring-2 ${
                  errors.password
                    ? "border-red-300 focus:ring-red-200"
                    : "border-slate-300 focus:ring-teal-200"
                } bg-white text-slate-900`}
                placeholder="••••••••"
                disabled={loading}
              />
              {errors.password && (
                <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </div>
              )}
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Links */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <Link
              to="/register"
              className="block text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Criar júri como organizador
            </Link>
            <Link
              to={`/forgot-password?email=${encodeURIComponent(email)}`}
              className="block text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Esqueci minha senha
            </Link>
          </div>

          {/* Demo Access - Subtle */}
          <div className="space-y-3 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 font-medium">
              ACESSOS DE DEMONSTRAÇÃO (apenas para teste)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/demo"
                className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition text-center"
              >
                Demo Organizador
              </Link>
              <Link
                to="/demo"
                className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition text-center"
              >
                Demo Jurado
              </Link>
            </div>
          </div>

          {/* Back to Landing */}
          <div className="pt-4 text-center">
            <Link
              to="/"
              className="text-sm text-slate-600 hover:text-slate-900 font-medium"
            >
              ← Voltar para a página inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
