"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Shield, UserCog, QrCode, X, Trash2, Camera, Phone, Pencil } from "lucide-react";
import { format } from "date-fns";
import QRCode from "qrcode";

export default function PlatformStaffTab() {
  const [isCreating, setIsCreating] = useState(false);
  
  // Create / Edit State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  const [successModal, setSuccessModal] = useState<{ email: string, password: string, qrDataUrl: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string, name: string } | null>(null);
  const [editModal, setEditModal] = useState<{ id: string } | null>(null);

  const queryClient = useQueryClient();

  const { data: staffList, isLoading: loadingStaff } = useQuery({
    queryKey: ["platform-staff"],
    queryFn: async () => {
      const res = await fetch("/api/admin/platform-staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    }
  });

  const { data: roles, isLoading: loadingRoles } = useQuery({
    queryKey: ["platform-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/platform-roles");
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    }
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("phoneNumber", phoneNumber);
      formData.append("password", password);
      formData.append("roleId", roleId);
      if (photoFile) {
        formData.append("photoFile", photoFile);
      }

      const res = await fetch("/api/admin/platform-staff", {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create staff");
      }
      const data = await res.json();
      
      const pwd = data.generatedPassword || password;
      const magicLink = `${window.location.origin}/admin?email=${encodeURIComponent(email)}&pwd=${encodeURIComponent(pwd)}`;
      const qrDataUrl = await QRCode.toDataURL(magicLink, { width: 300, margin: 2, color: { dark: '#111827', light: '#ffffff' } });

      setSuccessModal({
        email,
        password: pwd,
        qrDataUrl
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-staff"] });
      resetForm();
      setIsCreating(false);
    },
    onError: (err: Error) => {
      alert(err.message);
    }
  });

  const editMutation = useMutation({
    mutationFn: async (payload: { id: string, name: string, email: string, phoneNumber: string, roleId: string }) => {
      const res = await fetch("/api/admin/platform-staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update staff");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-staff"] });
      setEditModal(null);
      resetForm();
    },
    onError: (err: Error) => {
      alert(err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/platform-staff?id=${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete staff");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-staff"] });
      setDeleteModal(null);
    },
    onError: (err: Error) => {
      alert(err.message);
    }
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhoneNumber("");
    setPassword("");
    setRoleId("");
    setPhotoFile(null);
  };

  const handleEditClick = (staff: any) => {
    setName(staff.name);
    setEmail(staff.email);
    setPhoneNumber(staff.phoneNumber || "");
    setRoleId(staff.role.id); // Wait, staff.role object has id? I'll assume we need roleId. Wait, staff doesn't return roleId in the payload? Let's check: staff.role is {name: string}. But earlier query `include: { role: { select: { id: true, name: true } } }` so yes `staff.role.id` exists. Actually, the query might just be `role: { name: string }`. I better just fetch it if it's there.
    setEditModal({ id: staff.id });
  };

  const isLoading = loadingStaff || loadingRoles;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-1)]">Platform Staff</h2>
          <p className="text-sm text-[var(--text-3)] font-medium">Manage administrators and team members</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsCreating(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-bold shadow-lg shadow-[var(--accent)]/20 hover:scale-105 transition-transform"
        >
          <Plus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-emerald-50 p-6 flex flex-col items-center text-center border-b border-emerald-100">
              <div className="h-16 w-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                <QrCode className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-900 mb-1">Staff Created!</h2>
              <p className="text-sm font-medium text-emerald-700">Scan this QR code to login instantly.</p>
            </div>
            
            <div className="p-6 flex flex-col items-center">
              <div className="bg-white p-2 rounded-2xl border-2 border-dashed border-gray-200 mb-6">
                <img src={successModal.qrDataUrl} alt="Login QR Code" className="w-48 h-48 rounded-xl" />
              </div>
              
              <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Email</span>
                  <span className="text-sm font-bold text-gray-800">{successModal.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase">Password</span>
                  <span className="text-sm font-mono font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-1 rounded-md">{successModal.password}</span>
                </div>
              </div>
              
              <button 
                onClick={() => setSuccessModal(null)}
                className="mt-6 w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-gray-900/20 hover:bg-gray-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in zoom-in duration-200">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 flex items-center justify-center rounded-full mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Platform Staff?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to permanently delete <strong>{deleteModal.name}</strong>? This action cannot be undone and will remove all their historical records.
            </p>
            <div className="flex items-center gap-3 w-full">
              <button 
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={() => deleteMutation.mutate(deleteModal.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-[var(--text-1)]">Edit Staff Details</h3>
              <button onClick={() => { setEditModal(null); resetForm(); }} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Full Name</label>
                <input 
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Email</label>
                <input 
                  type="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Phone Number</label>
                <input 
                  type="tel"
                  value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Assign Role</label>
                <select 
                  value={roleId} onChange={e => setRoleId(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)] bg-white" 
                >
                  <option value="" disabled>Select a role...</option>
                  {roles?.map((r: Record<string, unknown>) => (
                    <option key={r.id as string} value={r.id as string}>{r.name as string}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6">
              <button 
                onClick={() => editMutation.mutate({ id: editModal.id, name, email, phoneNumber, roleId })}
                disabled={editMutation.isPending || !name || !email || !phoneNumber || !roleId}
                className="w-full py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-bold shadow-lg shadow-[var(--accent)]/20 hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreating && (
        <div className="bg-[var(--surface)] border border-[var(--border-soft)] rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-4">New Platform Staff</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Photo Upload Box */}
            <div className="md:col-span-2 flex items-center gap-4 mb-2">
              <label className="relative cursor-pointer group">
                <div className="h-20 w-20 rounded-full border-2 border-dashed border-[var(--border)] overflow-hidden flex flex-col items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
                  {photoFile ? (
                    <img src={URL.createObjectURL(photoFile)} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <Camera className="h-6 w-6 text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-500 font-medium">Optional</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setPhotoFile(e.target.files[0]);
                  }}
                />
              </label>
              <div className="text-sm">
                <p className="font-bold text-[var(--text-1)]">Profile Photo</p>
                <p className="text-xs text-[var(--text-3)]">Square image recommended.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Full Name</label>
              <input 
                value={name} onChange={e => setName(e.target.value)}
                className="w-full border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" 
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Email</label>
              <input 
                type="email"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" 
                placeholder="john@himalhub.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Phone Number</label>
              <input 
                type="tel"
                value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                className="w-full border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" 
                placeholder="e.g. 9800000000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Temporary Password</label>
              <input 
                type="text"
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)]" 
                placeholder="Leave blank to autogenerate"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-2)] mb-1">Assign Role</label>
              <select 
                value={roleId} onChange={e => setRoleId(e.target.value)}
                className="w-full border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[var(--accent)] bg-white" 
              >
                <option value="" disabled>Select a role...</option>
                {roles?.map((r: Record<string, unknown>) => (
                  <option key={r.id as string} value={r.id as string}>{r.name as string}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <button 
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !name || !email || !phoneNumber || !roleId}
              className="px-6 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Staff
            </button>
            <button onClick={() => { setIsCreating(false); resetForm(); }} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : staffList?.map((staff: {
          id: string; name: string; email: string; phoneNumber: string; photoUrl: string | null; isActive: boolean; mfaEnabled: boolean; createdAt: string; role: { id: string, name: string }, roleId: string
        }) => (
          <div key={staff.id} className="bg-[var(--surface)] border border-[var(--border-soft)] rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
            <div>
              <div className="flex items-start sm:items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {staff.photoUrl ? (
                    <img src={staff.photoUrl} alt={staff.name} className="h-10 w-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                      <UserCog className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-[var(--text-1)] truncate">{staff.name}</h3>
                    <p className="text-xs text-[var(--text-3)] truncate">{staff.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase ${staff.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {staff.isActive ? "Active" : "Disabled"}
                  </span>
                  
                  {/* Edit Button */}
                  <button 
                    onClick={() => handleEditClick(staff)}
                    className="p-2 ml-1 text-gray-500 bg-gray-50 hover:bg-blue-50 hover:text-blue-500 rounded-xl transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 shadow-sm"
                    title="Edit Staff"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  
                  {/* Delete Button */}
                  <button 
                    onClick={() => setDeleteModal({ id: staff.id, name: staff.name })}
                    className="p-2 text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600 rounded-xl transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 shadow-sm"
                    title="Delete Staff"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-sm font-semibold text-[var(--text-2)]">{staff.role?.name || 'No Role'}</span>
                </div>
                {staff.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-[var(--text-3)]">{staff.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-soft)] flex items-center justify-between text-xs font-medium text-[var(--text-3)]">
              <span>Joined {format(new Date(staff.createdAt), "MMM d, yyyy")}</span>
              <span className={staff.mfaEnabled ? "text-emerald-600" : "text-amber-500"}>
                {staff.mfaEnabled ? "MFA Enabled" : "No MFA"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
