"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoadingPopup } from "@/app/loading-popup";

type User = {
  email: string;
  name: string;
  segment: "Free" | "Plus" | "Pro" | "Premium";
  points: number;
  level: number;
  role: "admin" | "user";
  aiDailyQuota: number;
};

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function ActionButton({
  onClick,
  tone,
  text,
  icon,
}: {
  onClick: () => void;
  tone: "view" | "edit" | "delete";
  text: string;
  icon: ReactNode;
}) {
  const toneClass =
    tone === "view"
      ? "border-blue-300 bg-blue-50 text-blue-800"
      : tone === "edit"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-rose-300 bg-rose-50 text-rose-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-sm ${toneClass}`}
    >
      {/* Show icon on mobile and text on larger screens. */}
      <span className="sm:hidden">{icon}</span>
      <span className="hidden sm:inline">{text}</span>
    </button>
  );
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    segment: "Free" as "Free" | "Plus" | "Pro" | "Premium",
    password: "",
    role: "user" as "admin" | "user",
    points: 0,
  });
  const [selectedUserView, setSelectedUserView] = useState<User | null>(null);
  const [selectedUserEdit, setSelectedUserEdit] = useState<User | null>(null);
  const [deleteUserEmail, setDeleteUserEmail] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  const filteredUsers = useMemo(() => {
    // Filter users by free-text query and selected role.
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === "all" ? true : user.role === roleFilter;
      const matchesSearch = normalizedSearch
        ? user.email.toLowerCase().includes(normalizedSearch) ||
          user.name.toLowerCase().includes(normalizedSearch)
        : true;
      return matchesRole && matchesSearch;
    });
  }, [users, searchTerm, roleFilter]);

  useEffect(() => {
    async function loadUsers() {
      setError("");
      setLoadingMessage("Loading users...");
      try {
        const response = await fetch("/api/admin/users");
        if (!response.ok) {
          setError("Failed to load users.");
          return;
        }
        const body = (await response.json()) as { users: User[] };
        setUsers(body.users ?? []);
      } catch {
        setError("Failed to load users.");
      } finally {
        setLoadingMessage("");
      }
    }

    loadUsers();
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
        segment: "Free",
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

  async function saveSelectedUser() {
    if (!selectedUserEdit) {
      return;
    }
    setError("");
    setStatus("");
    setLoadingMessage(`Saving ${selectedUserEdit.email}...`);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(selectedUserEdit.email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedUserEdit.name,
          segment: selectedUserEdit.segment,
          points: selectedUserEdit.points,
          level: selectedUserEdit.level,
          role: selectedUserEdit.role,
          aiDailyQuota: selectedUserEdit.aiDailyQuota,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to update user.");
        return;
      }
      const body = (await response.json()) as { user: User };
      setUsers((prev) => prev.map((item) => (item.email === body.user.email ? body.user : item)));
      setSelectedUserEdit(null);
      setStatus(`Updated ${body.user.email}.`);
    } catch {
      setError("Failed to update user.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function confirmDeleteUser() {
    if (!deleteUserEmail) {
      return;
    }
    setError("");
    setStatus("");
    setLoadingMessage(`Deleting ${deleteUserEmail}...`);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(deleteUserEmail)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to delete user.");
        return;
      }
      setUsers((prev) => prev.filter((item) => item.email !== deleteUserEmail));
      setDeleteUserEmail(null);
      setStatus("User deleted.");
    } catch {
      setError("Failed to delete user.");
    } finally {
      setLoadingMessage("");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {loadingMessage ? <LoadingPopup message={loadingMessage} /> : null}

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">User management</h1>
        <Link href="/admin" className="text-sm text-blue-700 underline">
          Back to Admin
        </Link>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {status ? <p className="mt-3 text-sm text-green-700">{status}</p> : null}

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Create user</h2>
        <form onSubmit={createUser} className="mt-3 grid gap-3 md:grid-cols-6">
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
              onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Role</span>
            <select
              value={newUser.role}
              onChange={(event) =>
                setNewUser((prev) => ({ ...prev, role: event.target.value as "admin" | "user" }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Segment</span>
            <select
              value={newUser.segment}
              onChange={(event) =>
                setNewUser((prev) => ({
                  ...prev,
                  segment: event.target.value as "Free" | "Plus" | "Pro" | "Premium",
                }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            >
              <option value="Free">Free</option>
              <option value="Plus">Plus</option>
              <option value="Pro">Pro</option>
              <option value="Premium">Premium</option>
            </select>
          </label>
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Create
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Users</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Search</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by email or name"
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">Role filter</span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as "all" | "admin" | "user")}
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </label>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-black/10">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-black/[0.04]">
              <tr>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Email</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Name</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Segment</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Role</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Points</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Level</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Quota</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.email}>
                  <td className="border-b border-black/10 px-3 py-2">{user.email}</td>
                  <td className="border-b border-black/10 px-3 py-2">{user.name}</td>
                  <td className="border-b border-black/10 px-3 py-2">{user.segment}</td>
                  <td className="border-b border-black/10 px-3 py-2">{user.role}</td>
                  <td className="border-b border-black/10 px-3 py-2">{user.points}</td>
                  <td className="border-b border-black/10 px-3 py-2">{user.level}</td>
                  <td className="border-b border-black/10 px-3 py-2">{user.aiDailyQuota}</td>
                  <td className="border-b border-black/10 px-3 py-2">
                    <div className="flex gap-2">
                      <ActionButton tone="view" text="View" icon={<ViewIcon />} onClick={() => setSelectedUserView(user)} />
                      <ActionButton tone="edit" text="Edit" icon={<EditIcon />} onClick={() => setSelectedUserEdit({ ...user })} />
                      <ActionButton tone="delete" text="Delete" icon={<DeleteIcon />} onClick={() => setDeleteUserEmail(user.email)} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-black/60" colSpan={8}>
                    No users found for current search/filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUserView ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[300px]">
            {/* Show user details in a read-only popup. */}
            <p className="text-base font-semibold">User detail</p>
            <p className="text-sm">Email: {selectedUserView.email}</p>
            <p className="text-sm">Name: {selectedUserView.name}</p>
            <p className="text-sm">Segment: {selectedUserView.segment}</p>
            <p className="text-sm">Role: {selectedUserView.role}</p>
            <p className="text-sm">Points: {selectedUserView.points}</p>
            <p className="text-sm">Level: {selectedUserView.level}</p>
            <p className="text-sm">AI Daily Quota: {selectedUserView.aiDailyQuota}</p>
            <button
              type="button"
              onClick={() => setSelectedUserView(null)}
              className="mt-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {selectedUserEdit ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[320px]">
            {/* Edit selected user fields before saving changes. */}
            <p className="text-base font-semibold">Edit user</p>
            <input
              value={selectedUserEdit.email}
              disabled
              className="w-full rounded border border-black/10 bg-black/5 px-2 py-1 text-sm"
            />
            <input
              value={selectedUserEdit.name}
              onChange={(event) =>
                setSelectedUserEdit((prev) => (prev ? { ...prev, name: event.target.value } : prev))
              }
              placeholder="Name"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <select
              value={selectedUserEdit.segment}
              onChange={(event) =>
                setSelectedUserEdit((prev) =>
                  prev
                    ? {
                        ...prev,
                        segment: event.target.value as "Free" | "Plus" | "Pro" | "Premium",
                      }
                    : prev,
                )
              }
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            >
              <option value="Free">Free</option>
              <option value="Plus">Plus</option>
              <option value="Pro">Pro</option>
              <option value="Premium">Premium</option>
            </select>
            <input
              type="number"
              value={selectedUserEdit.points}
              onChange={(event) =>
                setSelectedUserEdit((prev) =>
                  prev ? { ...prev, points: Number.parseInt(event.target.value || "0", 10) } : prev,
                )
              }
              placeholder="Points"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <input
              type="number"
              min={0}
              value={selectedUserEdit.level}
              onChange={(event) =>
                setSelectedUserEdit((prev) =>
                  prev ? { ...prev, level: Number.parseInt(event.target.value || "0", 10) } : prev,
                )
              }
              placeholder="Level"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <select
              value={selectedUserEdit.role}
              onChange={(event) =>
                setSelectedUserEdit((prev) =>
                  prev ? { ...prev, role: event.target.value as "admin" | "user" } : prev,
                )
              }
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <input
              type="number"
              min={1}
              value={selectedUserEdit.aiDailyQuota}
              onChange={(event) =>
                setSelectedUserEdit((prev) =>
                  prev ? { ...prev, aiDailyQuota: Number.parseInt(event.target.value || "1", 10) } : prev,
                )
              }
              placeholder="AI Daily Quota"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={saveSelectedUser}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setSelectedUserEdit(null)}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteUserEmail ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[300px]">
            {/* Confirm user delete action. */}
            <p className="text-base font-semibold text-rose-700">Delete {deleteUserEmail}?</p>
            <p className="text-sm text-black/70">This action cannot be undone.</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteUserEmail(null)}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
