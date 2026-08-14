"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, Loader2, CheckCircle2 } from "lucide-react";

const AVAILABLE_PERMISSIONS = [
  { id: "users.view", name: "View Users", description: "Can view user profiles and basic data" },
  { id: "users.manage", name: "Manage Users", description: "Can create, edit, or delete users" },
  { id: "restaurants.view", name: "View Restaurants", description: "Can view restaurant details" },
  { id: "restaurants.manage", name: "Manage Restaurants", description: "Can update restaurant settings" },
  { id: "orders.view", name: "View Orders", description: "Can view all system orders" },
  { id: "orders.manage", name: "Manage Orders", description: "Can update order statuses" },
  { id: "platform_roles.manage", name: "Manage Roles", description: "Can create and edit platform roles" },
  { id: "platform_staff.manage", name: "Manage Staff", description: "Can invite and manage platform staff" }
];

export default function RolesTab() {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["platform-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/platform-roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    }
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/platform-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, permissions: selectedPerms })
      });
      if (!res.ok) throw new Error("Failed to create role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-roles"] });
      setIsCreating(false);
      setName("");
      setDescription("");
      setSelectedPerms([]);
    }
  });

  const togglePerm = (perm: string) => {
    setSelectedPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-1)]">Platform Roles</h2>
          <p className="text-sm text-[var(--text-3)] font-medium">Manage granular access controls</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-bold shadow-lg shadow-[var(--accent)]/20 hover:scale-105 transition-transform"
        >
          <Plus className="h-4 w-4" />
          Create Role
        </button>
      </div>

      {isCreating && (
        <div className="bg-[var(--surface)] border border-[var(--border-soft)] rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">New Role</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Role Name</label>
              <input 
                value={name} onChange={e => setName(e.target.value)}
                className="w-full border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" 
                placeholder="e.g. Support Agent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Description</label>
              <input 
                value={description} onChange={e => setDescription(e.target.value)}
                className="w-full border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" 
                placeholder="Brief description of responsibilities"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-2)] mb-2">Permissions</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {AVAILABLE_PERMISSIONS.map(perm => {
                  const active = selectedPerms.includes(perm.id);
                  return (
                    <button
                      key={perm.id}
                      onClick={() => togglePerm(perm.id)}
                      className={`flex flex-col items-start gap-1 p-3 border rounded-xl transition-colors text-left relative overflow-hidden group ${active ? "bg-blue-50/50 border-blue-200" : "bg-[var(--surface-alt)]/50 border-transparent hover:bg-[var(--surface-alt)]"}`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {active ? <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" /> : <div className="h-4 w-4 border-2 border-[var(--border)] rounded-full shrink-0 group-hover:border-[var(--text-3)] transition-colors" />}
                        <span className={`text-sm font-bold truncate ${active ? "text-blue-700" : "text-[var(--text-1)]"}`}>{perm.name}</span>
                      </div>
                      <p className={`text-xs pl-6 leading-relaxed ${active ? "text-blue-600/70" : "text-[var(--text-3)]"}`}>{perm.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-4">
              <button 
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !name || selectedPerms.length === 0}
                className="px-6 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Role
              </button>
              <button onClick={() => setIsCreating(false)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : roles?.map((role: { id: string; name: string; description: string; permissions: string[] }) => (
          <div key={role.id} className="bg-[var(--surface)] border border-[var(--border-soft)] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-1)]">{role.name}</h3>
                <p className="text-xs text-[var(--text-3)]">{role.permissions.length} permissions</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-2)] mb-4 min-h-[40px]">{role.description}</p>
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((p: string) => {
                const info = AVAILABLE_PERMISSIONS.find(ap => ap.id === p);
                return (
                  <div key={p} className="px-2.5 py-1.5 bg-gray-100 rounded-lg flex items-center gap-2">
                     <span className="text-xs font-bold text-gray-700">{info?.name || p}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
