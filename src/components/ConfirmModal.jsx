import React from "react";
import { createPortal } from "react-dom";

function ConfirmModal({ open, title = "Tasdiqlash", description = "", confirmText = "Tasdiqlash", cancelText = "Bekor qilish", onConfirm, onCancel }) {
  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel}></div>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-secondary-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-secondary-900">{title}</h3>
          <button onClick={onCancel} className="text-secondary-500 hover:text-secondary-700">✕</button>
        </div>
        {description && (
          <div className="px-5 py-4 text-secondary-700 text-sm">
            {description}
          </div>
        )}
        <div className="px-5 py-4 border-t border-secondary-200 flex justify-end space-x-2">
          <button onClick={onCancel} className="btn-secondary">{cancelText}</button>
          <button onClick={onConfirm} className="btn-success">{confirmText}</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default ConfirmModal;


