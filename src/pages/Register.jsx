import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

const getErrorText = (err) => (
  err?.message ||
  err?.data?.message ||
  err?.response?.data?.message ||
  ""
);

const getAuthErrorMessage = (err, fallback) => {
  const status = err?.status ?? err?.response?.status;
  const message = getErrorText(err);

  if (status === 404) {
    return "Não encontramos o serviço de cadastro deste júri. Verifique a configuração da Base44 e tente novamente.";
  }

  if (err?.message === "Network Error") {
    return "Não foi possível conectar ao serviço de cadastro. Confira sua conexão e tente novamente.";
  }

  return message || fallback;
};

const isExistingEmailError = (err) => {
  const message = getErrorText(err).toLowerCase();

  return (
    message.includes("already exists") ||
    message.includes("email already") ||
    message.includes("já existe") ||
    message.includes("ja existe") ||
    message.includes("já está cadastrado") ||
    message.includes("ja esta cadastrado")
  );
};

const isInvalidCredentialsError = (err) => {
  const status = err?.status ?? err?.response?.status;
  const message = getErrorText(err).toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    message.includes("invalid credentials") ||
    message.includes("unauthorized") ||
    message.includes("incorrect")
  );
};

export default function Register() {
  const { loginWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showExistingAccountHelp, setShowExistingAccountHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const clearFeedback = () => {
    setError("");
    setNotice("");
    setShowExistingAccountHelp(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();
    const normalizedEmail = email.trim().toLowerCase();
    setEmail(normalizedEmail);

    if (password !== confirmPassword) {
      setError("As senhas não conferem");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email: normalizedEmail, password });
      setShowOtp(true);
    } catch (err) {
      if (isExistingEmailError(err)) {
        try {
          setNotice("Este e-mail já tem uma conta. Tentando entrar com a senha informada...");
          await loginWithEmail(normalizedEmail, password);
          window.location.href = "/dashboard";
          return;
        } catch (loginErr) {
          setNotice("");
          setShowExistingAccountHelp(true);
          setError(
            isInvalidCredentialsError(loginErr)
              ? "Este e-mail já está cadastrado, mas a senha informada não entrou nessa conta."
              : getAuthErrorMessage(loginErr, "Este e-mail já está cadastrado. Entre com sua conta para criar eventos.")
          );
          return;
        }
      }

      setError(getAuthErrorMessage(err, "Não foi possível criar a conta"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    clearFeedback();
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setError(getAuthErrorMessage(err, "Código de verificação inválido"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    clearFeedback();
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Código enviado",
        description: "Confira seu e-mail para ver o novo código.",
      });
    } catch (err) {
      setError(getAuthErrorMessage(err, "Não foi possível reenviar o código"));
    }
  };

  const handleGoogle = () => {
    clearFeedback();
    try {
      base44.auth.loginWithProvider("google", "/dashboard");
    } catch (err) {
      setError(getAuthErrorMessage(err, "Não foi possível iniciar o cadastro com Google"));
    }
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verifique seu e-mail"
        subtitle={`Enviamos um código para ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            "Verificar"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Não recebeu o código?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            Reenviar
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Criar júri"
      subtitle="Cadastre-se como organizador para começar"
      footer={
        <>
          Já tem uma conta?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continuar com Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">ou</span>
        </div>
      </div>

      {notice && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 text-primary text-sm">
          {notice}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
          {showExistingAccountHelp && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to={`/login?email=${encodeURIComponent(email)}`}
                className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Entrar
              </Link>
              <Link
                to={`/forgot-password?email=${encodeURIComponent(email)}`}
                className="inline-flex h-8 items-center rounded-md border border-destructive/20 bg-background px-3 text-xs font-medium text-foreground hover:bg-muted"
              >
                Recuperar senha
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setShowExistingAccountHelp(false);
              }}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando conta...
            </>
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
