import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2, Eye, EyeOff, RefreshCw, Send, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── SVG Captcha ──────────────────────────────────────────── */
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function randomChar() { return CHARS[Math.floor(Math.random() * CHARS.length)]; }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function generateCaptchaCode(len = 5) { return Array.from({ length: len }, randomChar).join(""); }

function CaptchaImage({ code, tick, width = 200, height = 52 }: { code: string; tick: number; width?: number; height?: number }) {
  const chars = code.split("");
  const cellW = width / chars.length;
  const noises = Array.from({ length: 6 }, (_, i) => ({
    x1: randomInt(0, width), y1: randomInt(0, height),
    x2: randomInt(0, width), y2: randomInt(0, height),
    key: i,
  }));
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ userSelect: "none", display: "block" }}>
      <rect width={width} height={height} fill="#f8f8f6" rx="4" />
      {noises.map(n => (
        <line key={n.key} x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2}
          stroke={`hsl(${randomInt(20,50)},60%,50%)`} strokeWidth="1.2" opacity="0.5" />
      ))}
      {chars.map((ch, i) => {
        const x = cellW * i + cellW / 2 + randomInt(-3, 3);
        const y = height / 2 + randomInt(-4, 4);
        const rotate = randomInt(-22, 22);
        const size = randomInt(20, 28);
        const color = `hsl(${randomInt(20, 45)},80%,${randomInt(25, 45)}%)`;
        return (
          <text key={i} x={x} y={y} dominantBaseline="middle" textAnchor="middle"
            fontSize={size} fill={color} fontWeight="bold" fontFamily="Georgia, serif"
            transform={`rotate(${rotate},${x},${y})`} style={{ letterSpacing: 2 }}
          >{ch}</text>
        );
      })}
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={randomInt(0, width)} cy={randomInt(0, height)}
          r={randomInt(1, 2)} fill={`hsl(${randomInt(0, 360)},40%,50%)`} opacity="0.35" />
      ))}
    </svg>
  );
}

function useCaptcha() {
  const [code, setCode] = useState(() => generateCaptchaCode());
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setCode(generateCaptchaCode()), []);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(id);
  }, []);
  return { code, tick, refresh };
}

/* ── Shared components ──────────────────────────────────────── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-white/80 mb-1.5">{children}</label>;
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement> & { "data-testid"?: string }) {
  return (
    <input
      {...props}
      className={`w-full bg-[#1a1a1a] border border-white/10 rounded text-sm text-white px-3 py-2.5 outline-none focus:border-primary/60 transition-colors placeholder:text-white/25 ${props.className ?? ""}`}
    />
  );
}

function PasswordInput({ value, onChange, placeholder, disabled, testId }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; testId?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <FieldInput
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "password"}
        disabled={disabled}
        autoComplete="current-password"
        data-testid={testId}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function BlueButton({ children, disabled, type = "submit", onClick, className = "" }: {
  children: React.ReactNode; disabled?: boolean; type?: "submit" | "button"; onClick?: () => void; className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`w-full bg-accent hover:bg-[hsl(42_85%_48%)] disabled:opacity-50 disabled:cursor-not-allowed text-accent-foreground font-semibold text-sm py-3 rounded transition-colors flex items-center justify-center gap-2 ${className}`}
    >
      {children}
    </button>
  );
}

/* ── Login form ─────────────────────────────────────────────── */
function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { login, isLoggingIn } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const { code: captchaCode, tick: captchaTick, refresh: refreshCaptcha } = useCaptcha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (captchaInput.trim().toLowerCase() !== captchaCode.toLowerCase()) {
      toast({ title: "Verification failed", description: "Code doesn't match — try again", variant: "destructive" });
      refreshCaptcha();
      setCaptchaInput("");
      return;
    }
    try { await login({ email: email.trim().toLowerCase(), password }); } catch {}
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-white text-center mb-7">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel>Email</FieldLabel>
          <FieldInput type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="emai@service.com" disabled={isLoggingIn} autoComplete="email" data-testid="input-email" />
        </div>
        <div>
          <FieldLabel>Password</FieldLabel>
          <PasswordInput value={password} onChange={setPassword} disabled={isLoggingIn} testId="input-password" />
        </div>

        {/* Captcha */}
        <div className="bg-white rounded overflow-hidden flex items-center px-3 py-2 gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="rounded overflow-hidden border border-gray-200">
                <CaptchaImage code={captchaCode} tick={captchaTick} width={120} height={44} />
              </div>
              <input
                type="text"
                value={captchaInput}
                onChange={e => setCaptchaInput(e.target.value)}
                placeholder="Enter code"
                disabled={isLoggingIn}
                autoComplete="off"
                className="flex-1 text-sm text-black bg-transparent outline-none placeholder:text-gray-400 tracking-widest"
                data-testid="input-captcha"
              />
            </div>
          </div>
          <button type="button" onClick={() => { refreshCaptcha(); setCaptchaInput(""); }}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0" data-testid="btn-refresh-captcha">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <BlueButton disabled={isLoggingIn || !email.trim() || !password || !captchaInput.trim()} data-testid="btn-login">
          {isLoggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login"}
        </BlueButton>
      </form>

      <div className="mt-5 text-center space-y-1">
        <p className="text-sm text-white/60">
          Don't have an account?{" "}
          <button onClick={onSwitchToRegister} className="text-primary hover:underline font-medium">create one</button>
          {" "}now
        </p>
      </div>
    </>
  );
}

/* ── Register form ──────────────────────────────────────────── */
function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    if (password.length < 12) { toast({ title: "Password too short", description: "At least 12 characters", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Registration failed", description: err.message || "Try again", variant: "destructive" });
        return;
      }
      setDone(true);
    } catch {
      toast({ title: "Registration failed", description: "Try again", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <>
        <h1 className="text-2xl font-bold text-white text-center mb-7">Signup</h1>
        <div className="text-center space-y-4 py-4">
          <div className="text-4xl">✓</div>
          <p className="text-sm font-bold text-white">Account created!</p>
          <p className="text-sm text-white/50 leading-relaxed">Sign in with your email and password.</p>
          <BlueButton type="button" onClick={onSwitchToLogin} data-testid="btn-go-login">Sign In</BlueButton>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-white text-center mb-7">Signup</h1>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <FieldLabel>Email</FieldLabel>
          <FieldInput type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="emai@service.com" disabled={submitting} autoComplete="email" data-testid="input-reg-email" />
        </div>
        <div>
          <FieldLabel>Password</FieldLabel>
          <PasswordInput value={password} onChange={setPassword} placeholder="password" disabled={submitting} testId="input-reg-password" />
        </div>
        <div>
          <FieldLabel>Confirm Password</FieldLabel>
          <PasswordInput value={confirm} onChange={setConfirm} placeholder="repeat password" disabled={submitting} testId="input-reg-confirm" />
        </div>

        <BlueButton disabled={submitting || !email.trim() || !password || !confirm} data-testid="btn-register">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Signup"}
        </BlueButton>
      </form>

      <div className="mt-5 text-center">
        <p className="text-sm text-white/60">
          Already have an account?{" "}
          <button onClick={onSwitchToLogin} className="text-primary hover:underline font-medium">login</button>
        </p>
      </div>
    </>
  );
}

/* ── Footer ─────────────────────────────────────────────────── */
function AuthFooter() {
  return (
    <div className="mt-auto border-t border-white/8 py-6 px-4 text-center space-y-2">
      <div className="flex items-center justify-center gap-5 text-xs font-semibold text-white/50 tracking-widest uppercase">
        <span>Reviews</span>
        <a href="https://t.me/+3-lMkt-idutkOTIx" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center h-5 w-5 rounded-full bg-primary">
          <Send className="h-2.5 w-2.5 text-white fill-white" />
        </a>
        <span>TOS</span>
        <span>FAQs</span>
      </div>
      <p className="text-xs text-white/25">© 2026 TopCc. All rights reserved</p>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
export default function AuthPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");

  if (user) return <Redirect to="/" />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d0d0d" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[380px]">
          <div className="flex flex-col items-center mb-8" aria-label="TopCc">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 shadow-[0_0_28px_rgba(154,203,63,0.12)]">
              <CreditCard className="h-6 w-6 text-primary" strokeWidth={1.8} />
            </div>
            <div className="mt-3 text-lg font-black uppercase tracking-[0.2em] text-primary">
              TopCc
            </div>
          </div>
          {tab === "login"
            ? <LoginForm onSwitchToRegister={() => setTab("register")} />
            : <RegisterForm onSwitchToLogin={() => setTab("login")} />
          }
        </div>
      </div>
      <AuthFooter />
    </div>
  );
}
