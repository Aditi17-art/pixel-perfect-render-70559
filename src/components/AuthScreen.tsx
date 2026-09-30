import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Activity, CheckCircle2, Loader2, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import authVisual from "@/assets/auth-visual.jpg";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

type Mode = "login" | "signup" | "forgot";

const emailSchema = z.string().trim().min(1, "Email address is required").email("Enter a valid email address").max(255);

function strength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const strengthLabel = ["Too short", "Weak", "Fair", "Good", "Strong"];

export function AuthScreen({ initialMode = "login" }: { initialMode?: Mode }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSent, setConfirmSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
    const saved = window.localStorage.getItem("spineseg.email");
    if (saved) setEmail(saved);
    return () => {
      active = false;
    };
  }, [navigate]);

  function reset() {
    setErrors({});
    setConfirmSent(false);
    setResetSent(false);
  }

  async function handleLogin() {
    const next: Record<string, string> = {};
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) next["email"] = parsedEmail.error.issues[0]?.message ?? "Invalid email";
    if (!password) next["password"] = "Password is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      const message =
        error.message.toLowerCase().includes("invalid login")
          ? "Incorrect email or password."
          : error.message.toLowerCase().includes("not confirmed")
            ? "Please confirm your email address first — check your inbox."
            : error.message;
      setErrors({ form: message });
      return;
    }
    if (remember) window.localStorage.setItem("spineseg.email", email.trim());
    else window.localStorage.removeItem("spineseg.email");
    toast.success("Signed in — opening your dashboard");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignup() {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next["fullName"] = "Full name is required";
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) next["email"] = parsedEmail.error.issues[0]?.message ?? "Invalid email";
    if (password.length < 8) next["password"] = "Use at least 8 characters";
    else if (strength(password) < 2) next["password"] = "Add a number or capital letter";
    if (confirmPassword !== password) next["confirmPassword"] = "Passwords do not match";
    if (!agreed) next["agreed"] = "Please accept the Terms & Privacy Policy";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim() },
      },
    });
    setLoading(false);
    if (error) {
      setErrors({
        form: error.message.toLowerCase().includes("already registered")
          ? "That email already has an account. Try logging in."
          : error.message,
      });
      return;
    }
    if (data.session) {
      toast.success("Account created");
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    setConfirmSent(true);
  }

  async function handleForgot() {
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setErrors({ email: parsedEmail.error.issues[0]?.message ?? "Invalid email" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setErrors({ form: error.message });
      return;
    }
    setResetSent(true);
  }

  async function handleGoogle() {
    reset();
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      setErrors({ form: "Google sign-in could not be completed. Please try again." });
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  const score = strength(password);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent-gradient text-primary-foreground">
              <Activity className="size-5" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold leading-none">SpineSeg AI</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Web-Based Spine Segmentation Using Deep Learning in CT Images
              </p>
            </div>
          </div>

          {checking ? (
            <div className="mt-16 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Checking your session…
            </div>
          ) : confirmSent ? (
            <div className="mt-12 card-soft p-6">
              <CheckCircle2 className="size-6 text-success" />
              <h1 className="mt-3 text-xl font-semibold">Confirm your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Open it to
                activate your account, then come back and log in.
              </p>
              <Button
                variant="outline"
                className="mt-5 w-full"
                onClick={() => {
                  reset();
                  setMode("login");
                }}
              >
                Back to login
              </Button>
            </div>
          ) : mode === "forgot" ? (
            <div className="mt-12">
              <h1 className="text-2xl font-semibold">Reset your password</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                We'll email you a secure link to choose a new password.
              </p>
              {resetSent ? (
                <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm">
                  If an account exists for {email}, a reset link is on its way.
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <Field
                    id="reset-email"
                    label="Email Address"
                    icon={<Mail className="size-4" />}
                    value={email}
                    onChange={setEmail}
                    type="email"
                    error={errors["email"]}
                    placeholder="you@university.edu"
                  />
                  {errors["form"] ? <FormError message={errors["form"]} /> : null}
                  <Button className="w-full" onClick={handleForgot} disabled={loading}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
                  </Button>
                </div>
              )}
              <button
                className="mt-5 text-sm font-medium text-primary hover:underline"
                onClick={() => {
                  reset();
                  setMode("login");
                }}
              >
                Back to login
              </button>
            </div>
          ) : (
            <div className="mt-10">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      reset();
                      setMode(m);
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      mode === m
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "login" ? "Login" : "Sign Up"}
                  </button>
                ))}
              </div>

              {mode === "login" ? (
                <div className="mt-8">
                  <h1 className="text-2xl font-semibold">Welcome Back</h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue to SpineSeg AI</p>

                  <div className="mt-6 space-y-4">
                    <Field
                      id="login-email"
                      label="Email Address"
                      icon={<Mail className="size-4" />}
                      value={email}
                      onChange={setEmail}
                      type="email"
                      error={errors["email"]}
                      placeholder="you@university.edu"
                    />
                    <Field
                      id="login-password"
                      label="Password"
                      icon={<Lock className="size-4" />}
                      value={password}
                      onChange={setPassword}
                      type="password"
                      error={errors["password"]}
                      placeholder="••••••••"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
                        Remember me
                      </label>
                      <button
                        className="text-sm font-medium text-primary hover:underline"
                        onClick={() => {
                          reset();
                          setMode("forgot");
                        }}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    {errors["form"] ? <FormError message={errors["form"]} /> : null}
                    <Button className="w-full" onClick={handleLogin} disabled={loading}>
                      {loading ? <Loader2 className="size-4 animate-spin" /> : "Login"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-8">
                  <h1 className="text-2xl font-semibold">Create Your Account</h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Start exploring AI-powered spine segmentation
                  </p>

                  <div className="mt-6 space-y-4">
                    <Field
                      id="signup-name"
                      label="Full Name"
                      icon={<User className="size-4" />}
                      value={fullName}
                      onChange={setFullName}
                      error={errors["fullName"]}
                      placeholder="Aditi Dhariwal"
                    />
                    <Field
                      id="signup-email"
                      label="Email Address"
                      icon={<Mail className="size-4" />}
                      value={email}
                      onChange={setEmail}
                      type="email"
                      error={errors["email"]}
                      placeholder="you@university.edu"
                    />
                    <div>
                      <Field
                        id="signup-password"
                        label="Password"
                        icon={<Lock className="size-4" />}
                        value={password}
                        onChange={setPassword}
                        type="password"
                        error={errors["password"]}
                        placeholder="At least 8 characters"
                      />
                      {password ? (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex h-1.5 flex-1 gap-1">
                            {[0, 1, 2, 3].map((i) => (
                              <span
                                key={i}
                                className={`h-full flex-1 rounded-full ${
                                  i < score ? "bg-accent-gradient" : "bg-muted"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{strengthLabel[score]}</span>
                        </div>
                      ) : null}
                    </div>
                    <Field
                      id="signup-confirm"
                      label="Confirm Password"
                      icon={<Lock className="size-4" />}
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      type="password"
                      error={errors["confirmPassword"]}
                      placeholder="Re-enter your password"
                    />
                    <div>
                      <label className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Checkbox
                          className="mt-0.5"
                          checked={agreed}
                          onCheckedChange={(v) => setAgreed(Boolean(v))}
                        />
                        I agree to the Terms &amp; Privacy Policy
                      </label>
                      {errors["agreed"] ? (
                        <p className="mt-1 text-xs text-destructive">{errors["agreed"]}</p>
                      ) : null}
                    </div>
                    {errors["form"] ? <FormError message={errors["form"]} /> : null}
                    <Button className="w-full" onClick={handleSignup} disabled={loading}>
                      {loading ? <Loader2 className="size-4 animate-spin" /> : "Create Account"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>

              <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
                <GoogleMark />
                Continue with Google
              </Button>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
                  className="font-medium text-primary hover:underline"
                  onClick={() => {
                    reset();
                    setMode(mode === "login" ? "signup" : "login");
                  }}
                >
                  {mode === "login" ? "Sign Up" : "Login"}
                </button>
              </p>
            </div>
          )}

          <p className="mt-10 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            This platform is for research and educational purposes only. It is not a medical diagnostic tool.
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-soft lg:block">
        <img
          src={authVisual}
          alt="Abstract CT spine segmentation visualization"
          width={1024}
          height={1280}
          className="absolute inset-0 size-full object-cover opacity-95"
        />
        <div className="relative flex h-full flex-col justify-end p-12">
          <div className="card-soft max-w-md p-6 backdrop-blur">
            <p className="font-display text-lg font-semibold">Automated vertebra delineation</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a CT slice and review the original image, the predicted segmentation mask, and an adjustable
              overlay side by side.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  value,
  onChange,
  type = "text",
  error,
  placeholder,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`h-11 bg-card pl-9 ${error ? "border-destructive" : ""}`}
        />
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.3 1.1-4 1.1a7 7 0 0 1-6.6-4.8H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.7c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.4 6.7l4 3.1A7 7 0 0 1 12 4.7Z"
      />
    </svg>
  );
}
