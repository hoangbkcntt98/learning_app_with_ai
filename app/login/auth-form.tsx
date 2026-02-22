"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LoadingPopup } from "../loading-popup";

type Mode = "login" | "register";

export function AuthForm({ initialError = "" }: { initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login" ? { email, password } : { name, email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        setError(result.error ?? "Authentication failed.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
      {isLoading ? (
        <LoadingPopup
          message={mode === "login" ? "Signing you in..." : "Creating your account..."}
        />
      ) : null}

      {/* Show panda app logo for both sign-in and register modes. */}
      <div className="mb-4 flex justify-center">
        <Image
          src="/images/logo.png"
          alt="BuBu Learning panda logo"
          width={96}
          height={96}
          className="h-24 w-24 rounded-xl object-cover"
          priority
        />
      </div>

      <h1 className="text-2xl font-semibold">
        {mode === "login" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-2 text-sm text-black/70">
        Use email and password to access your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "register" ? (
          <label className="block">
            <span className="mb-1 block text-sm">Name</span>
            <input
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-sm">Email</span>
          <input
            type="email"
            required
            className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm">Password</span>
          <input
            type="password"
            required
            minLength={8}
            className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isLoading
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>

        {mode === "login" ? (
          <>
            {/* Show divider + Google login only on sign-in mode. */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-black/15" />
              <span className="text-xs uppercase tracking-wide text-black/50">Or</span>
              <div className="h-px flex-1 bg-black/15" />
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/auth/google/start";
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#DB4437] bg-[#DB4437] px-4 py-2 text-sm font-medium text-white hover:bg-[#C53929]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path d="M21.35 11.1H12v2.98h5.36c-.23 1.53-1.76 4.49-5.36 4.49-3.22 0-5.84-2.67-5.84-5.97s2.62-5.97 5.84-5.97c1.84 0 3.07.78 3.78 1.45l2.58-2.49C16.73 4.06 14.56 3 12 3 7.03 3 3 7.03 3 12s4.03 9 9 9 8.67-3.49 8.67-8.4c0-.56-.06-.99-.14-1.5Z" />
              </svg>
              Continue with Google
            </button>
          </>
        ) : null}
      </form>

      <button
        type="button"
        className="mt-4 text-sm text-blue-700 underline"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError("");
        }}
      >
        {mode === "login"
          ? "Need an account? Register"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
