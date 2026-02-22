"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingPopup } from "../loading-popup";

type Mode = "login" | "register";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
