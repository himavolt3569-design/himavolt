"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Trash2,
  X,
  Users,
} from "lucide-react";
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  permissionsByGroup,
  getPermission,
  canonicalPermission,
  type PermissionDef,
} from "@/lib/platform-permissions";

/**
 * Build and edit the roles that platform staff are assigned.
 *
 * The permission list is rendered from `src/lib/platform-permissions.ts` — the
 * same catalogue the API guards read — so what is offered here is exactly what
 * the server enforces. It previously carried its own hand-written list of eight,
 * which had drifted: it offered ids no route checked, and omitted ids that two
 * routes required, so those could never be granted at all.
 *
 * Every permission shows what its holder will be able to *do*, in plain words.
 * A dotted identifier is not something anyone can grant deliberately.
 */

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  _count?: { staff: number };
}

const GROUPED = permissionsByGroup();

export default function RolesTab() {
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Role | null>(null);

  const { data: roles, isLoading } = useQuery<Role[]>({
    queryKey: ["platform-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/platform-roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
  });

  const openCreate = () => {
    setEditing("new");
    setName("");
    setDescription("");
    setSelected([]);
    setError(null);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setName(role.name);
    setDescription(role.description ?? "");
    // Fold legacy spellings so an old role opens with the right toggles lit.
    setSelected(role.permissions.map(canonicalPermission));
    setError(null);
  };

  const close = () => {
    setEditing(null);
    setError(null);
  };

  const save = useMutation({
    mutationFn: async () => {
      const isNew = editing === "new";
      const res = await fetch("/api/admin/platform-roles", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isNew ? {} : { id: (editing as Role).id }),
          name,
          description,
          permissions: selected,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save role");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-roles"] });
      close();
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: async (role: Role) => {
      const res = await fetch("/api/admin/platform-roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: role.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete role");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-roles"] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => {
      setError(e.message);
      setConfirmDelete(null);
    },
  });

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  const toggleGroup = (defs: PermissionDef[]) => {
    const ids = defs.map((d) => d.id);
    const allOn = ids.every((id) => selected.includes(id));
    setSelected((prev) =>
      allOn
        ? prev.filter((p) => !ids.includes(p))
        : [...new Set([...prev, ...ids])],
    );
  };

  const dangerCount = useMemo(
    () => selected.filter((id) => getPermission(id)?.danger).length,
    [selected],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-1)]">Platform Roles</h2>
          <p className="text-sm font-medium text-[var(--text-3)]">
            {PERMISSIONS.length} permissions across {PERMISSION_GROUPS.length} areas.
            Master admin always has all of them.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition-transform hover:scale-105"
        >
          <Plus className="h-4 w-4" />
          Create Role
        </button>
      </div>

      {error && !editing && (
        <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {editing && (
        <div className="rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--text-1)]">
              {editing === "new" ? "New role" : `Edit "${editing.name}"`}
            </h3>
            <button
              type="button"
              onClick={close}
              className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-[var(--surface-alt)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-2)]">
                  Role name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                  placeholder="e.g. Support Agent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-2)]">
                  Description
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                  placeholder="What is this role responsible for?"
                />
              </div>
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[var(--text-2)]">
                  Permissions
                </label>
                <p className="text-xs font-semibold text-[var(--text-3)]">
                  {selected.length} of {PERMISSIONS.length} selected
                  {dangerCount > 0 && (
                    <span className="ml-2 text-amber-700">
                      · {dangerCount} sensitive
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-5">
                {PERMISSION_GROUPS.map((group) => {
                  const defs = GROUPED[group];
                  if (!defs?.length) return null;
                  const allOn = defs.every((d) => selected.includes(d.id));

                  return (
                    <div key={group}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-3)]">
                          {group}
                        </h4>
                        <button
                          type="button"
                          onClick={() => toggleGroup(defs)}
                          className="text-[11px] font-bold text-[var(--accent)] hover:underline"
                        >
                          {allOn ? "Clear all" : "Select all"}
                        </button>
                      </div>

                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {defs.map((perm) => {
                          const active = selected.includes(perm.id);
                          return (
                            <button
                              type="button"
                              key={perm.id}
                              onClick={() => toggle(perm.id)}
                              className={`group relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                                active
                                  ? perm.danger
                                    ? "border-amber-300 bg-amber-50/60"
                                    : "border-blue-200 bg-blue-50/50"
                                  : "border-transparent bg-[var(--surface-alt)]/50 hover:bg-[var(--surface-alt)]"
                              }`}
                            >
                              <div className="flex w-full items-center gap-2">
                                {active ? (
                                  <CheckCircle2
                                    className={`h-4 w-4 shrink-0 ${
                                      perm.danger ? "text-amber-600" : "text-blue-600"
                                    }`}
                                  />
                                ) : (
                                  <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[var(--border)] transition-colors group-hover:border-[var(--text-3)]" />
                                )}
                                <span
                                  className={`text-sm font-bold ${
                                    active
                                      ? perm.danger
                                        ? "text-amber-800"
                                        : "text-blue-700"
                                      : "text-[var(--text-1)]"
                                  }`}
                                >
                                  {perm.label}
                                </span>
                                {perm.danger && (
                                  <span className="ml-auto shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700">
                                    Sensitive
                                  </span>
                                )}
                              </div>

                              <p className="pl-6 text-xs leading-relaxed text-[var(--text-3)]">
                                {perm.description}
                              </p>

                              {perm.danger && perm.dangerNote && (
                                <p className="flex items-start gap-1.5 pl-6 text-[11px] font-semibold leading-relaxed text-amber-700">
                                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                  {perm.dangerNote}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={save.isPending || !name.trim() || selected.length === 0}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing === "new" ? "Create role" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={close}
                className="rounded-xl bg-[var(--surface-alt)] px-6 py-2 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--border-soft)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : !roles?.length ? (
          <p className="col-span-full rounded-2xl border border-dashed border-[var(--border)] px-6 py-12 text-center text-sm text-[var(--text-3)]">
            No roles yet. Create one to start delegating access to platform staff.
          </p>
        ) : (
          roles.map((role) => {
            const defs = role.permissions
              .map((p) => getPermission(p))
              .filter(Boolean) as PermissionDef[];
            const danger = defs.filter((d) => d.danger);

            return (
              <div
                key={role.id}
                className="flex flex-col rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-[var(--text-1)]">{role.name}</h3>
                    <p className="flex items-center gap-2 text-xs text-[var(--text-3)]">
                      <span>{role.permissions.length} permissions</span>
                      {typeof role._count?.staff === "number" && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {role._count.staff}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(role)}
                      className="rounded-lg p-1.5 text-[var(--text-3)] hover:bg-[var(--surface-alt)]"
                      aria-label={`Edit ${role.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(role)}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                      aria-label={`Delete ${role.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="mb-4 min-h-[40px] text-sm text-[var(--text-2)]">
                  {role.description || "No description."}
                </p>

                {danger.length > 0 && (
                  <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
                    <AlertTriangle className="h-3 w-3" />
                    {danger.length} sensitive permission{danger.length > 1 ? "s" : ""}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {defs.map((d) => (
                    <span
                      key={d.id}
                      title={d.description}
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                        d.danger
                          ? "bg-amber-100 text-amber-800"
                          : "bg-[var(--surface-alt)] text-[var(--text-2)]"
                      }`}
                    >
                      {d.label}
                    </span>
                  ))}
                  {role.permissions.length > defs.length && (
                    <span className="rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-700">
                      {role.permissions.length - defs.length} unrecognised
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--canvas)] p-6 text-[var(--text-1)] shadow-2xl">
            <h3 className="text-base font-bold">Delete &ldquo;{confirmDelete.name}&rdquo;?</h3>
            <p className="mt-2 text-sm text-[var(--text-3)]">
              Staff assigned to this role would lose their access. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] py-2.5 text-sm font-medium text-[var(--text-2)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => remove.mutate(confirmDelete)}
                disabled={remove.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
