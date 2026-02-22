"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LoadingPopup } from "../loading-popup";

type User = {
  email: string;
  name: string;
  points: number;
  level: number;
  role: "admin" | "user";
  aiDailyQuota: number;
};

type Question = {
  id: number;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
};

type AppSettings = {
  maxRegisteredUsers: number;
};

export function AdminClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    maxRegisteredUsers: 1000,
  });
  const [allUsersAiDailyQuotaInput, setAllUsersAiDailyQuotaInput] = useState("20");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    password: "",
    role: "user" as "admin" | "user",
    points: 0,
  });
  const [newQuestion, setNewQuestion] = useState({
    level: "N5" as "N5" | "N4" | "N3" | "N2" | "N1",
    prompt: "",
    options: ["", "", "", ""] as [string, string, string, string],
    correctIndex: 0,
  });

  useEffect(() => {
    async function loadAll() {
      setError("");
      setLoadingMessage("Loading admin data...");
      try {
        // Load all admin datasets in one request batch for faster UI readiness.
        const [usersResponse, questionsResponse, settingsResponse] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/questions"),
          fetch("/api/admin/settings"),
        ]);

        if (!usersResponse.ok || !questionsResponse.ok || !settingsResponse.ok) {
          setError("Failed to load admin data.");
          return;
        }

        const usersBody = (await usersResponse.json()) as { users: User[] };
        const questionsBody = (await questionsResponse.json()) as { questions: Question[] };
        const settingsBody = (await settingsResponse.json()) as { settings: AppSettings };
        setUsers(usersBody.users ?? []);
        setQuestions(questionsBody.questions ?? []);
        setSettings(settingsBody.settings);
        // Initialize the bulk-update input from first user or env fallback default.
        const firstUserQuota = usersBody.users?.[0]?.aiDailyQuota;
        setAllUsersAiDailyQuotaInput(String(firstUserQuota ?? 20));
      } catch {
        setError("Failed to load admin data.");
      } finally {
        setLoadingMessage("");
      }
    }

    loadAll();
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoadingMessage("Creating user...");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to create user.");
        return;
      }
      const body = (await response.json()) as { user: User };
      setUsers((prev) => [...prev, body.user]);
      setStatus("User created.");
      setNewUser({
        email: "",
        name: "",
        password: "",
        role: "user",
        points: 0,
      });
    } catch {
      setError("Failed to create user.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function saveUser(user: User) {
    setError("");
    setStatus("");
    setLoadingMessage(`Saving ${user.email}...`);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          points: user.points,
          role: user.role,
          aiDailyQuota: user.aiDailyQuota,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to update user.");
        return;
      }
      const body = (await response.json()) as { user: User };
      setUsers((prev) =>
        prev.map((item) => (item.email === body.user.email ? body.user : item)),
      );
      setStatus(`Updated ${user.email}.`);
    } catch {
      setError("Failed to update user.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoadingMessage("Creating question...");
    try {
      const response = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuestion),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to create question.");
        return;
      }
      const body = (await response.json()) as { question: Question };
      setQuestions((prev) => [...prev, body.question]);
      setStatus("Question created.");
      setNewQuestion({
        level: "N5",
        prompt: "",
        options: ["", "", "", ""],
        correctIndex: 0,
      });
    } catch {
      setError("Failed to create question.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function saveQuestion(question: Question) {
    setError("");
    setStatus("");
    setLoadingMessage(`Saving question ${question.id}...`);
    try {
      const response = await fetch(`/api/admin/questions/${encodeURIComponent(question.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: question.level,
          prompt: question.prompt,
          options: question.options,
          correctIndex: question.correctIndex,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to update question.");
        return;
      }
      setStatus(`Updated question ${question.id}.`);
    } catch {
      setError("Failed to update question.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoadingMessage("Saving settings...");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxRegisteredUsers: settings.maxRegisteredUsers,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to save settings.");
        return;
      }

      const body = (await response.json()) as { settings: AppSettings };
      setSettings(body.settings);
      setStatus("Settings updated.");
    } catch {
      setError("Failed to save settings.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function updateAiDailyQuotaForAllUsers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    const parsedQuota = Number.parseInt(allUsersAiDailyQuotaInput, 10);
    if (!Number.isFinite(parsedQuota) || parsedQuota <= 0) {
      setError("AI daily quota must be a positive number.");
      return;
    }

    setLoadingMessage("Updating AI quota for all users...");
    try {
      const response = await fetch("/api/admin/users/quota", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiDailyQuota: parsedQuota }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to update AI quota for all users.");
        return;
      }

      // Update local state so admin sees the new quota instantly in user rows.
      setUsers((prev) =>
        prev.map((user) => ({
          ...user,
          aiDailyQuota: parsedQuota,
        })),
      );
      setStatus("AI daily quota updated for all users.");
    } catch {
      setError("Failed to update AI quota for all users.");
    } finally {
      setLoadingMessage("");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {loadingMessage ? <LoadingPopup message={loadingMessage} /> : null}

      {/* Show feature-specific top image for admin screen. */}
      <div className="mb-5 flex justify-center">
        <Image
          src="/images/admin.png"
          alt="Admin feature"
          width={112}
          height={112}
          className="h-28 w-28 rounded-xl object-cover"
          priority
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <Link href="/" className="text-sm text-blue-700 underline">
          Back to menu
        </Link>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {status ? <p className="mt-3 text-sm text-green-700">{status}</p> : null}

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <form onSubmit={saveSettings} className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">
              Maximum registered users
            </span>
            <input
              type="number"
              min={1}
              value={settings.maxRegisteredUsers}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  maxRegisteredUsers: Number.parseInt(event.target.value || "1", 10),
                }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Save settings
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Setting for all user</h2>
        <form onSubmit={updateAiDailyQuotaForAllUsers} className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">
              AI_DAILY_QUOTA_PER_USER
            </span>
            <input
              type="number"
              min={1}
              value={allUsersAiDailyQuotaInput}
              onChange={(event) => setAllUsersAiDailyQuotaInput(event.target.value)}
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Apply to all users
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Add user</h2>
        <form onSubmit={createUser} className="mt-3 grid gap-3 md:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Email</span>
            <input
              required
              placeholder="Email"
              value={newUser.email}
              onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Name</span>
            <input
              required
              placeholder="Name"
              value={newUser.name}
              onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Password</span>
            <input
              required
              minLength={8}
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(event) =>
                setNewUser((prev) => ({ ...prev, password: event.target.value }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Role</span>
            <select
              value={newUser.role}
              onChange={(event) =>
                setNewUser((prev) => ({
                  ...prev,
                  role: event.target.value as "admin" | "user",
                }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Create user
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Edit users</h2>
        <div className="mt-3 space-y-3">
          {users.map((user, index) => (
            <div key={user.email} className="grid gap-2 rounded-lg border border-black/10 p-3 md:grid-cols-8">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-black/70">Email</span>
                <input
                  value={user.email}
                  disabled
                  className="w-full rounded border border-black/10 bg-black/5 px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-black/70">Name</span>
                <input
                  value={user.name}
                  onChange={(event) =>
                    setUsers((prev) => {
                      const next = [...prev];
                      next[index] = { ...next[index], name: event.target.value };
                      return next;
                    })
                  }
                  className="w-full rounded border border-black/20 px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-black/70">Points</span>
                <input
                  type="number"
                  value={user.points}
                  onChange={(event) =>
                    setUsers((prev) => {
                      const next = [...prev];
                      next[index] = {
                        ...next[index],
                        points: Number.parseInt(event.target.value || "0", 10),
                      };
                      return next;
                    })
                  }
                  className="w-full rounded border border-black/20 px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-black/70">Role</span>
                <select
                  value={user.role}
                  onChange={(event) =>
                    setUsers((prev) => {
                      const next = [...prev];
                      next[index] = {
                        ...next[index],
                        role: event.target.value as "admin" | "user",
                      };
                      return next;
                    })
                  }
                  className="w-full rounded border border-black/20 px-2 py-1 text-sm"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-black/70">AI Daily Quota</span>
                <input
                  type="number"
                  min={1}
                  value={user.aiDailyQuota}
                  onChange={(event) =>
                    setUsers((prev) => {
                      const next = [...prev];
                      next[index] = {
                        ...next[index],
                        aiDailyQuota: Number.parseInt(event.target.value || "1", 10),
                      };
                      return next;
                    })
                  }
                  className="w-full rounded border border-black/20 px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-black/70">Level</span>
                <input
                  value={user.level}
                  disabled
                  className="w-full rounded border border-black/10 bg-black/5 px-2 py-1 text-sm"
                />
              </label>
              <button
                onClick={() => saveUser(user)}
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white"
              >
                Save
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Add question</h2>
        <form onSubmit={createQuestion} className="mt-3 space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-black/70">JLPT level</span>
              <select
                value={newQuestion.level}
                onChange={(event) =>
                  setNewQuestion((prev) => ({
                    ...prev,
                    level: event.target.value as "N5" | "N4" | "N3" | "N2" | "N1",
                  }))
                }
                className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
              >
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
                <option value="N1">N1</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-black/70">Correct option index</span>
              <input
                type="number"
                min={0}
                max={3}
                value={newQuestion.correctIndex}
                onChange={(event) =>
                  setNewQuestion((prev) => ({
                    ...prev,
                    correctIndex: Number.parseInt(event.target.value || "0", 10),
                  }))
                }
                className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Prompt</span>
            <input
              required
              placeholder="Prompt"
              value={newQuestion.prompt}
              onChange={(event) =>
                setNewQuestion((prev) => ({ ...prev, prompt: event.target.value }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            {newQuestion.options.map((option, index) => (
              <label key={`new-option-${index}`} className="block">
                <span className="mb-1 block text-xs font-medium text-black/70">
                  Option {index + 1}
                </span>
                <input
                  required
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(event) =>
                    setNewQuestion((prev) => {
                      const next = [...prev.options] as [string, string, string, string];
                      next[index] = event.target.value;
                      return { ...prev, options: next };
                    })
                  }
                  className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Create question
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Edit questions</h2>
        <div className="mt-3 space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="rounded-lg border border-black/10 p-3">
              <div className="grid gap-2 md:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-black/70">Question ID</span>
                  <input
                    value={question.id}
                    disabled
                    className="w-full rounded border border-black/10 bg-black/5 px-2 py-1 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-black/70">JLPT level</span>
                  <select
                    value={question.level}
                    onChange={(event) =>
                      setQuestions((prev) => {
                        const next = [...prev];
                        next[index] = {
                          ...next[index],
                          level: event.target.value as "N5" | "N4" | "N3" | "N2" | "N1",
                        };
                        return next;
                      })
                    }
                    className="w-full rounded border border-black/20 px-2 py-1 text-sm"
                  >
                    <option value="N5">N5</option>
                    <option value="N4">N4</option>
                    <option value="N3">N3</option>
                    <option value="N2">N2</option>
                    <option value="N1">N1</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-black/70">Correct option index</span>
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={question.correctIndex}
                    onChange={(event) =>
                      setQuestions((prev) => {
                        const next = [...prev];
                        next[index] = {
                          ...next[index],
                          correctIndex: Number.parseInt(event.target.value || "0", 10),
                        };
                        return next;
                      })
                    }
                    className="w-full rounded border border-black/20 px-2 py-1 text-sm"
                  />
                </label>
                <button
                  onClick={() => saveQuestion(question)}
                  className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white"
                >
                  Save question
                </button>
              </div>
              <label className="mt-2 block">
                <span className="mb-1 block text-xs font-medium text-black/70">Prompt</span>
                <input
                  value={question.prompt}
                  onChange={(event) =>
                    setQuestions((prev) => {
                      const next = [...prev];
                      next[index] = { ...next[index], prompt: event.target.value };
                      return next;
                    })
                  }
                  className="w-full rounded border border-black/20 px-2 py-1 text-sm"
                />
              </label>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {question.options.map((option, optionIndex) => (
                  <label key={`${question.id}-option-${optionIndex}`} className="block">
                    <span className="mb-1 block text-xs font-medium text-black/70">
                      Option {optionIndex + 1}
                    </span>
                    <input
                      value={option}
                      onChange={(event) =>
                        setQuestions((prev) => {
                          const next = [...prev];
                          const nextOptions = [...next[index].options] as [
                            string,
                            string,
                            string,
                            string,
                          ];
                          nextOptions[optionIndex] = event.target.value;
                          next[index] = { ...next[index], options: nextOptions };
                          return next;
                        })
                      }
                      className="w-full rounded border border-black/20 px-2 py-1 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
