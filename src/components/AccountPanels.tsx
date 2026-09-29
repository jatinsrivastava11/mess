"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import type { Account } from "@/lib/account/useAccount";
import { passwordProblem, usernameProblem } from "@/lib/account/username";
import { api } from "@/lib/firebase/api";
import { onlineAvailable } from "@/lib/firebase/client";
import { Button } from "./Modal";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-panel-border bg-transparent px-3 py-2.5 outline-none focus:border-accent";

function Message({ kind, children }: { kind: "error" | "info"; children: ReactNode }) {
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`text-sm ${kind === "error" ? "text-red-500" : "text-muted"}`}>
      {children}
    </p>
  );
}

/** Runs an async action with a busy flag and an error message. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  async function run(fn: () => Promise<string | void>) {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const msg = await fn();
      if (msg) setInfo(msg);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, info, run };
}

export function AccountPanel({ account, inGame }: { account: Account; inGame: boolean }) {
  if (!onlineAvailable) return <Message kind="info">Accounts aren&apos;t set up on this server yet.</Message>;
  if (!account.ready || !account.profileLoaded) return <Message kind="info">Loading…</Message>;
  if (account.hasAccount && !account.profile) return <ChooseUsername account={account} />;
  if (account.hasAccount) return <SignedIn account={account} inGame={inGame} />;
  return <SignedOut account={account} inGame={inGame} />;
}

function SignedOut({ account, inGame }: { account: Account; inGame: boolean }) {
  const [tab, setTab] = useState<"signin" | "signup">("signup");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-fg/5 p-1" role="tablist">
        {(["signup", "signin"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-lg py-1.5 text-sm font-medium transition ${tab === t ? "bg-panel shadow-sm" : "text-muted"}`}
          >
            {t === "signup" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>
      {tab === "signup" ? <SignUpForm account={account} /> : <SignInForm account={account} inGame={inGame} />}
    </div>
  );
}

function PasswordInput({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        maxLength={128}
        className={`${inputClass} pr-16`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-muted hover:text-fg"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function SignUpForm({ account }: { account: Account }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nameStatus, setNameStatus] = useState<"" | "checking" | "free" | "taken">("");
  const { busy, error, info, run } = useAction();

  const nameProblem = username ? usernameProblem(username) : null;
  const pwProblem = password ? passwordProblem(password) : null;

  async function checkName() {
    if (!username || usernameProblem(username)) return;
    setNameStatus("checking");
    try {
      const { available } = await api("/api/account/username", { username, check: true });
      setNameStatus(available ? "free" : "taken");
    } catch {
      setNameStatus("");
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      await account.signUp(username, email, password);
      return "Account created! We sent a verification link to your email.";
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field
        label="Username"
        hint={
          nameProblem ??
          (nameStatus === "checking"
            ? "Checking…"
            : nameStatus === "taken"
              ? "Taken, try another."
              : nameStatus === "free"
                ? "Available ✓"
                : "Shown to opponents. 3–16 letters, numbers or _")
        }
      >
        <input
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setNameStatus("");
          }}
          onBlur={checkName}
          autoComplete="username"
          required
          maxLength={16}
          spellCheck={false}
          className={inputClass}
        />
      </Field>
      <Field label="Email" hint="Never shown to anyone.">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className={inputClass} />
      </Field>
      <Field label="Password" hint={pwProblem ?? "At least 8 characters, with a letter and a number."}>
        <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
      </Field>
      {error && <Message kind="error">{error}</Message>}
      {info && <Message kind="info">{info}</Message>}
      <Button type="submit" disabled={busy || Boolean(nameProblem || pwProblem) || nameStatus === "taken"}>
        {busy ? "Creating…" : "Create account"}
      </Button>
      <p className="text-xs text-muted">Wins are saved once you verify your email.</p>
    </form>
  );
}

function SignInForm({ account, inGame }: { account: Account; inGame: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, info, run } = useAction();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => account.signIn(email, password));
      }}
      className="space-y-3"
    >
      {inGame && <Message kind="info">Signing in during a game will leave that game.</Message>}
      <Field label="Email">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className={inputClass} />
      </Field>
      <Field label="Password">
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
      </Field>
      {error && <Message kind="error">{error}</Message>}
      {info && <Message kind="info">{info}</Message>}
      <Button type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          run(async () => {
            if (!email) throw new Error("Type your email above first.");
            await account.resetPassword(email);
            return "If that email has an account, a reset link is on its way.";
          })
        }
        className="w-full text-sm text-muted hover:text-fg"
      >
        Forgot password?
      </button>
    </form>
  );
}

function ChooseUsername({ account }: { account: Account }) {
  const [username, setUsername] = useState("");
  const { busy, error, run } = useAction();
  const problem = username ? usernameProblem(username) : null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => account.claimUsername(username));
      }}
      className="space-y-3"
    >
      <Message kind="info">Pick a username to finish setting up your account.</Message>
      <Field label="Username" hint={problem ?? "3–16 letters, numbers or _"}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={16} className={inputClass} />
      </Field>
      {error && <Message kind="error">{error}</Message>}
      <Button type="submit" disabled={busy || Boolean(problem)}>
        Save username
      </Button>
      <button type="button" onClick={() => account.signOut()} className="w-full text-sm text-muted hover:text-fg">
        Sign out
      </button>
    </form>
  );
}

function VerifyNotice({ account }: { account: Account }) {
  const { busy, error, info, run } = useAction();
  return (
    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
      <p className="text-sm">
        <b>Verify your email</b> to start saving wins. Check your inbox (and spam) for a link from Firebase.
      </p>
      {error && <Message kind="error">{error}</Message>}
      {info && <Message kind="info">{info}</Message>}
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              await account.refresh();
              return "Checked.";
            })
          }
          className="rounded-lg border border-panel-border px-3 py-1.5 text-sm hover:bg-fg/5"
        >
          I&apos;ve verified
        </button>
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              await account.resendVerification();
              return "Sent! Check your inbox.";
            })
          }
          className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-fg"
        >
          Resend link
        </button>
      </div>
    </div>
  );
}

function SignedIn({ account, inGame }: { account: Account; inGame: boolean }) {
  const { busy, error, info, run } = useAction();
  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-semibold">{account.profile?.username}</p>
        <p className="text-sm text-muted">
          {account.email} · {account.verified ? "verified ✓" : "not verified"}
        </p>
      </div>
      {!account.verified && <VerifyNotice account={account} />}
      {error && <Message kind="error">{error}</Message>}
      {info && <Message kind="info">{info}</Message>}
      <Button
        variant="ghost"
        disabled={busy}
        onClick={() =>
          run(async () => {
            await account.resetPassword(account.email ?? "");
            return "Password reset link sent to your email.";
          })
        }
      >
        Change password
      </Button>
      <Button variant="ghost" disabled={busy || inGame} onClick={() => run(() => account.signOut())}>
        Sign out
      </Button>
      {inGame && <p className="text-xs text-muted">Finish your game before signing out.</p>}
    </div>
  );
}

export function ProfilePanel({ account, onSignIn }: { account: Account; onSignIn: () => void }) {
  if (!account.hasAccount || !account.profile) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">Create an account to save your wins and earn achievements. Playing as a guest is always free.</p>
        <Button onClick={onSignIn}>Sign in or create account</Button>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <p className="text-center text-xl font-semibold">{account.profile.username}</p>
      <div className="rounded-2xl border border-panel-border p-5 text-center">
        <p className="font-math text-5xl font-bold">{account.profile.wins}</p>
        <p className="mt-1 text-sm text-muted">{account.profile.wins === 1 ? "win" : "wins"}</p>
      </div>
      {!account.verified && <VerifyNotice account={account} />}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Achievements</h3>
        <p className="text-sm text-muted">Coming soon.</p>
      </div>
    </div>
  );
}
