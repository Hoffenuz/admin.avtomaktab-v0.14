import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../AuthContext.jsx";

function ProfileModal({ onClose }) {
  const { user, updateAdminCredentials } = useAuth();
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (newPassword && newPassword !== confirmPassword) {
      alert("Yangi parollar mos kelmadi");
      return;
    }
    setLoading(true);
    const { error } = await updateAdminCredentials({ newUsername, newPassword, currentPassword });
    setLoading(false);
    if (error) {
      alert(error);
      return;
    }
    alert("Profil yangilandi");
    onClose();
  }

  const modal = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-secondary-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900">Profil</h3>
          </div>
          <button onClick={onClose} className="text-secondary-500 hover:text-secondary-700">✕</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Login</label>
            <input
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              className="input-field w-full"
              placeholder="Yangi login"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Joriy parol</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="input-field w-full"
              placeholder="Joriy parol"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Yangi parol</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input-field w-full"
              placeholder="Yangi parol (ixtiyoriy)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Yangi parolni tasdiqlang</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input-field w-full"
              placeholder="Yangi parolni tasdiqlash"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-secondary-200 flex justify-end space-x-3">
          <button onClick={onClose} className="btn-secondary">Bekor qilish</button>
          <button onClick={handleSave} disabled={loading} className="btn-success">
            {loading ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default ProfileModal;


