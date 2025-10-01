import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.jsx";
import api from '../lib/adminApi';
import { useAuth } from "../AuthContext.jsx";
import { Navigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal.jsx";
import { formatDate, toInputDateFormat, fromInputDateFormat, isValidDisplayDate, displayToIso } from "../utils/dateUtils.js";

// Phone formatting functions
function formatPhoneNumber(value) {
  const numbers = value.replace(/\D/g, '');
  let cleanNumber = numbers;
  if (cleanNumber.startsWith('998')) {
    cleanNumber = cleanNumber.substring(3);
  }
  cleanNumber = cleanNumber.substring(0, 9);
  
  if (cleanNumber.length === 0) {
    return '+998(';
  } else if (cleanNumber.length <= 2) {
    return `+998(${cleanNumber}`;
  } else if (cleanNumber.length <= 5) {
    return `+998(${cleanNumber.substring(0, 2)})${cleanNumber.substring(2)}`;
  } else if (cleanNumber.length <= 7) {
    return `+998(${cleanNumber.substring(0, 2)})${cleanNumber.substring(2, 5)}-${cleanNumber.substring(5)}`;
  } else {
    return `+998(${cleanNumber.substring(0, 2)})${cleanNumber.substring(2, 5)}-${cleanNumber.substring(5, 7)}-${cleanNumber.substring(7)}`;
  }
}

function validatePhoneNumber(value) {
  const numbers = value.replace(/\D/g, '');
  if (numbers.startsWith('998')) {
    return numbers.length === 12;
  }
  return numbers.length === 9;
}

function getFullPhoneNumber(value) {
  const cleanNumber = value.replace(/\D/g, '');
  if (cleanNumber.startsWith('998')) {
    return `+${cleanNumber}`;
  }
  if (cleanNumber.length === 9) {
    return `+998${cleanNumber}`;
  }
  return value;
}

function AdminUsers() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ 
    fio: "", 
    phone: "", 
    passport: "", 
    birth_date: "", 
    category: "B",
    entry_date: "",
    exit_date: "",
    total_fee: 0,
    paid_fee: 0,
    remaining_fee: 0,
    user_number: ""
  });
  const [phoneError, setPhoneError] = useState("");
  const [detailUser, setDetailUser] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentUser, setPaymentUser] = useState(null);
  const [paymentAmountStr, setPaymentAmountStr] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, title: '', description: '', onConfirm: null });

  // Format number with spaces every 3 digits
  function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function downloadCSV(csvContent, filename) {
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportUsersToCSV() {
    const headers = [
      '#', 'FIO', 'Telefon', 'Passport', "Tug'ilgan sana", 'Kategoriya', 'Guruh', 'Boshlanish', 'Tugash', "Umumiy to'lov", "To'langan", 'Qolgan'
    ];
    const rows = filteredUsers.map((u, idx) => {
      const phoneText = u.phone ? `'${u.phone}` : '';
      const birth = u.birth_date ? `'${formatDate(u.birth_date)}` : '';
      const entry = u.entry_date ? `'${formatDate(u.entry_date)}` : '';
      const exit = u.exit_date ? `'${formatDate(u.exit_date)}` : '';
      return [
        idx + 1,
        u.fio || '',
        phoneText,
        u.passport || '',
        birth,
        u.category || '',
        u.user_number ?? '',
        entry,
        exit,
        Number(u.total_fee || 0),
        Number(u.paid_fee || 0),
        Number(u.remaining_fee || 0)
      ];
    });
    const escapeCell = (v) => {
      if (v === null || v === undefined) return '';
      const str = String(v);
      if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
      return str;
    };
    const csv = [headers, ...rows].map(r => r.map(escapeCell).join(',')).join('\n');
    const today = new Date().toISOString().slice(0,10);
    downloadCSV(csv, `oquvchilar_${today}.csv`);
  }

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const api = await import('../lib/adminApi');
      const data = await api.default.adminSelect('users', { select: '*' });
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error("O'quvchilarni yuklashda xatolik:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterUsers(searchTerm) {
    setUserSearchTerm(searchTerm);
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }
    const filtered = users.filter(user =>
      user.fio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm) ||
      user.passport?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatDate(user.birth_date)?.includes(searchTerm) ||
      formatDate(user.entry_date)?.includes(searchTerm) ||
      formatDate(user.exit_date)?.includes(searchTerm) ||
      user.total_fee?.toString().includes(searchTerm) ||
      user.paid_fee?.toString().includes(searchTerm) ||
      user.remaining_fee?.toString().includes(searchTerm) ||
      user.user_number?.toString().includes(searchTerm)
    );
    setFilteredUsers(filtered);
  }

  function handlePhoneChange(e) {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setNewUser(u => ({ ...u, phone: formattedPhone }));
    
    if (formattedPhone.length > 0 && !validatePhoneNumber(formattedPhone)) {
      setPhoneError("Telefon raqami to'liq emas");
    } else {
      setPhoneError("");
    }
  }

  async function addUser() {
    if (!newUser.fio || !newUser.phone || !newUser.passport || !newUser.birth_date) {
      alert("Barcha maydonlarni to'ldiring!");
      return;
    }

    if (!validatePhoneNumber(newUser.phone)) {
      alert("Telefon raqamini to'g'ri kiriting!");
      return;
    }
    
    try {
      // remaining_fee GENERATED STORED — yuborilmaydi
      const { remaining_fee, ...newUserWithoutRemaining } = newUser;
      const userToSave = {
        ...newUserWithoutRemaining,
        phone: getFullPhoneNumber(newUser.phone),
        birth_date: displayToIso(newUser.birth_date),
        entry_date: newUser.entry_date ? displayToIso(newUser.entry_date) : null,
        exit_date: newUser.exit_date ? displayToIso(newUser.exit_date) : null,
        user_number: newUser.user_number ? parseInt(newUser.user_number, 10) : null
      };
      try {
        const api = await import('../lib/adminApi');
        await api.default.adminInsert('users', [userToSave]);
        setNewUser({ 
          fio: "", 
          phone: "", 
          passport: "", 
          birth_date: "", 
          category: "B",
          entry_date: "",
          exit_date: "",
          total_fee: 0,
          paid_fee: 0,
          remaining_fee: 0,
          user_number: ""
        });
        setPhoneError("");
        fetchUsers();
        alert("O'quvchi muvaffaqiyatli qo'shildi!");
      } catch (error) {
        alert("Xatolik: " + error.message);
      }
    } catch (error) {
      alert("Xatolik: " + error.message);
    }
  }

  function openUserDetail(user) {
    setDetailUser(user);
    setIsDetailOpen(true);
  }

  function closeUserDetail() {
    setIsDetailOpen(false);
    setDetailUser(null);
  }

  function openPayment(user) {
    setPaymentUser(user);
    setPaymentAmountStr("");
    setIsPaymentOpen(true);
  }

  function closePayment() {
    setIsPaymentOpen(false);
    setPaymentUser(null);
    setPaymentAmountStr("");
  }

  async function confirmPayment() {
    const digits = paymentAmountStr.replace(/[^0-9]/g, "");
    const amount = parseInt(digits || "0", 10);
    if (!paymentUser || !amount || amount <= 0) {
      alert("Ijobiy butun son kiriting");
      return;
    }
    const currentPaid = Number(paymentUser.paid_fee || 0);
    const newPaid = currentPaid + amount;
    try {
      const { error } = await supabase
        .from("users")
        .update({ paid_fee: newPaid })
        .eq("id", paymentUser.id);
      if (error) {
        alert("Xatolik: " + error.message);
        return;
      }
      closePayment();
      await fetchUsers();
      alert("To'lov qo'shildi");
    } catch (e) {
      alert("Xatolik: " + e.message);
    }
  }

  function openEdit(user) {
    setEditUser({
      ...user,
      birth_date: formatDate(user.birth_date) || "",
      entry_date: formatDate(user.entry_date) || "",
      exit_date: formatDate(user.exit_date) || "",
    });
    setIsEditOpen(true);
  }

  function closeEdit() {
    setIsEditOpen(false);
    setEditUser(null);
  }

  async function saveEdit() {
    if (!editUser) return;
    if (!editUser.fio || !editUser.phone || !editUser.passport || !editUser.birth_date) {
      alert("Barcha majburiy maydonlarni to'ldiring!");
      return;
    }
    if (!isValidDisplayDate(editUser.birth_date)) {
      alert("Tug'ilgan sana to'liq va to'g'ri formatda bo'lishi kerak: dd/mm/yyyy");
      return;
    }

    const { remaining_fee, id, ...rest } = editUser;
    const updatePayload = {
      ...rest,
      birth_date: displayToIso(editUser.birth_date),
      entry_date: editUser.entry_date ? displayToIso(editUser.entry_date) : null,
      exit_date: editUser.exit_date ? displayToIso(editUser.exit_date) : null,
      total_fee: parseInt(editUser.total_fee) || 0,
      paid_fee: parseInt(editUser.paid_fee) || 0,
      user_number: parseInt(editUser.user_number) || 1,
    };

    try {
      const { error } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", id);
      if (error) {
        alert("Xatolik: " + error.message);
        return;
      }
      await fetchUsers();
      closeEdit();
      alert("O'quvchi ma'lumotlari yangilandi!");
    } catch (e) {
      alert("Xatolik: " + e.message);
    }
  }

  async function deleteUser(id) {
    setConfirmState({
      open: true,
      title: "O'quvchini o'chirish",
      description: "O'quvchini o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.",
      onConfirm: async () => {
        try {
      try {
        const api = await import('../lib/adminApi');
        await api.default.adminDelete('users', { id });
        setUsers(users.filter(u => u.id !== id));
      } catch (error) {
        alert("Xatolik: " + error.message);
      }
        } catch (error) {
          alert("Xatolik: " + error.message);
        } finally {
          setConfirmState(cs => ({ ...cs, open: false }));
        }
      }
    });
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50 py-8">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card">
          <div className="px-6 py-4 border-b border-secondary-200 bg-gradient-to-r from-primary-50 to-accent-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-secondary-900">O'quvchilarni boshqarish</h1>
                <p className="text-secondary-600">Yangi o'quvchilar qo'shish va mavjudlarni boshqarish</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="mb-8">
              <button
                onClick={() => setIsAddFormOpen(!isAddFormOpen)}
                className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200 rounded-lg hover:from-primary-100 hover:to-accent-100 transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-lg font-semibold text-secondary-900">Yangi o'quvchi qo'shish</span>
                </div>
                <svg
                  className={`w-5 h-5 text-primary-600 transition-transform duration-200 ${isAddFormOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isAddFormOpen && (
              <div className="card p-6 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">FIO</label>
                    <input 
                      placeholder="Familiya va ism" 
                      value={newUser.fio} 
                      onChange={e => setNewUser(u => ({ ...u, fio: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Telefon raqam</label>
                    <input 
                      placeholder="+998(XX)XXX-XX-XX" 
                      value={newUser.phone} 
                      onChange={handlePhoneChange}
                      className={`input-field ${phoneError ? 'border-error-500' : ''}`}
                    />
                    {phoneError && (
                      <p className="text-error-500 text-sm mt-1">{phoneError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Passport</label>
                    <input 
                      placeholder="AB1234567" 
                      value={newUser.passport} 
                      onChange={e => setNewUser(u => ({ ...u, passport: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Tug'ilgan sana (dd/mm/yyyy)</label>
                    <input 
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={newUser.birth_date}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                        if (val.length > 4) val = val.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
                        else if (val.length > 2) val = val.replace(/(\d{2})(\d{0,2})/, '$1/$2');
                        setNewUser(u => ({ ...u, birth_date: val }));
                      }}
                      className="input-field"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Kategoriya</label>
                    <select 
                      value={newUser.category} 
                      onChange={e => setNewUser(u => ({ ...u, category: e.target.value }))}
                      className="input-field"
                    >
                      <option value="A">A - Mototsikl</option>
                      <option value="B">B - Avtomobil</option>
                      <option value="C">C - Yuk avtomobili</option>
                      <option value="BC">BC - Avtomobil va yuk avtomobili</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">O'qish boshlangan sana</label>
                    <input 
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={newUser.entry_date}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                        if (val.length > 4) val = val.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
                        else if (val.length > 2) val = val.replace(/(\d{2})(\d{0,2})/, '$1/$2');
                        setNewUser(u => ({ ...u, entry_date: val }));
                      }}
                      className="input-field"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">O'qish tugaydigan sana</label>
                    <input 
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={newUser.exit_date}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                        if (val.length > 4) val = val.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
                        else if (val.length > 2) val = val.replace(/(\d{2})(\d{0,2})/, '$1/$2');
                        setNewUser(u => ({ ...u, exit_date: val }));
                      }}
                      className="input-field"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Kurs narxi (so'm)</label>
                    <input 
                      type="number"
                      placeholder="0"
                      value={newUser.total_fee}
                      onChange={e => setNewUser(u => ({ ...u, total_fee: parseInt(e.target.value) || 0 }))}
                      className="input-field"
                    />
                    <p className="mt-1 text-xs text-secondary-500">{formatNumber(newUser.total_fee || 0)} so'm</p>
                  </div>
                  <div>
                    
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Guruh raqami</label>
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Guruh raqami"
                      value={newUser.user_number}
                      onChange={e => {
                        const digits = e.target.value.replace(/[^0-9]/g, "");
                        setNewUser(u => ({ ...u, user_number: digits }));
                      }}
                      className="input-field"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={addUser}
                      disabled={phoneError || !newUser.fio || !newUser.phone || !newUser.passport || !newUser.birth_date}
                      className="btn-success w-full"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Qo'shish</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-secondary-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  O'quvchilar ro'yxati ({filteredUsers.length})
                </h2>
                <button onClick={exportUsersToCSV} className="btn-secondary">Excel (CSV)</button>
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="O'quvchilarni qidirish..."
                  value={userSearchTerm}
                  onChange={e => filterUsers(e.target.value)}
                  className="input-field w-full max-w-md"
                />
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="min-w-full divide-y divide-secondary-200">
                    <thead className="bg-secondary-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">FIO</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Telefon</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Tug'ilgan sana</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Kategoriya</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Guruh</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Tugash</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">To'lanishi kerak</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-200">
                      {filteredUsers.map((u, idx) => (
                        <tr key={u.id} className="hover:bg-secondary-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 cursor-pointer" onClick={() => openUserDetail(u)}>{u.fio}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{u.phone}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{formatDate(u.birth_date)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              u.category === 'A' ? 'bg-warning-100 text-warning-800' :
                              u.category === 'B' ? 'bg-primary-100 text-primary-800' :
                              u.category === 'C' ? 'bg-success-100 text-success-800' :
                              'bg-accent-100 text-accent-800'
                            }`}>
                              {u.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{u.user_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{formatDate(u.exit_date)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${((u.remaining_fee || 0) === 0) ? 'text-success-600' : 'text-error-600'}`}>{formatNumber(u.remaining_fee || 0)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center space-x-3">
                            <button
                              onClick={() => openPayment(u)}
                              className="text-success-600 hover:text-success-700"
                              title="To'lov qo'shish"
                              aria-label="To'lov qo'shish"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                                <circle cx="12" cy="12" r="9" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8M8 12h8" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openEdit(u)}
                              className="text-primary-600 hover:text-primary-800"
                              title="Tahrirlash"
                              aria-label="Tahrirlash"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 013.182 3.182L8.25 18.463 4 20l1.537-4.25L16.862 3.487z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => deleteUser(u.id)}
                              className="text-error-600 hover:text-error-800"
                              title="O'chirish"
                              aria-label="O'chirish"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {isDetailOpen && detailUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black bg-opacity-40" onClick={closeUserDetail}></div>
                  <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                    <div className="px-6 py-4 border-b border-secondary-200 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-secondary-900">O'quvchi ma'lumotlari</h3>
                      <button onClick={closeUserDetail} className="text-secondary-500 hover:text-secondary-700">✕</button>
                    </div>
                    <div className="px-6 py-4 space-y-2 text-sm text-secondary-700">
                      <div><span className="font-medium">FIO:</span> {detailUser.fio}</div>
                      <div><span className="font-medium">Telefon:</span> {detailUser.phone}</div>
                      <div><span className="font-medium">Passport:</span> {detailUser.passport}</div>
                      <div><span className="font-medium">Tug'ilgan sana:</span> {formatDate(detailUser.birth_date)}</div>
                      <div><span className="font-medium">Kategoriya:</span> {detailUser.category}</div>
                      <div><span className="font-medium">Boshlanish:</span> {formatDate(detailUser.entry_date)}</div>
                      <div><span className="font-medium">Tugash:</span> {formatDate(detailUser.exit_date)}</div>
                      <div><span className="font-medium">Umumiy to'lov:</span> {formatNumber(detailUser.total_fee || 0)}</div>
                      <div><span className="font-medium">To'langan:</span> {formatNumber(detailUser.paid_fee || 0)}</div>
                      <div><span className="font-medium">Qolgan:</span> {formatNumber(detailUser.remaining_fee || 0)}</div>
                      <div><span className="font-medium">Guruh:</span> {detailUser.user_number}</div>
                    </div>
                    <div className="px-6 py-4 border-t border-secondary-200 flex justify-end">
                      <button onClick={closeUserDetail} className="btn-secondary">Yopish</button>
                    </div>
                  </div>
                </div>
              )}

              {isPaymentOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black bg-opacity-40" onClick={closePayment}></div>
                  <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
                    <div className="px-5 py-4 border-b border-secondary-200 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-secondary-900">To'lov qo'shish</h3>
                      <button onClick={closePayment} className="text-secondary-500 hover:text-secondary-700">✕</button>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <div className="text-sm text-secondary-700">
                        <div><span className="font-medium">O'quvchi:</span> {paymentUser?.fio}</div>
                        <div><span className="font-medium">Hozir to'langan:</span> {formatNumber(paymentUser?.paid_fee || 0)} so'm</div>
                        <div><span className="font-medium">Qolgan:</span> {formatNumber(paymentUser?.remaining_fee || 0)} so'm</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">Kurs narxi</label>
                        <input
                          placeholder="0"
                          value={paymentAmountStr}
                          onChange={e => setPaymentAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                          className="input-field"
                        />
                        <p className="mt-1 text-xs text-secondary-500">{formatNumber(parseInt(paymentAmountStr || '0', 10))} so'm</p>
                      </div>
                    </div>
                    <div className="px-5 py-4 border-t border-secondary-200 flex justify-end space-x-2">
                      <button onClick={closePayment} className="btn-secondary">Bekor qilish</button>
                      <button onClick={confirmPayment} className="btn-success">Tasdiqlash</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {isEditOpen && editUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black bg-opacity-40" onClick={closeEdit}></div>
              <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
                <div className="px-6 py-4 border-b border-secondary-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-secondary-900">O'quvchini tahrirlash</h3>
                  <button onClick={closeEdit} className="text-secondary-500 hover:text-secondary-700">✕</button>
                </div>
                <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">FIO</label>
                    <input
                      value={editUser.fio || ''}
                      onChange={e => setEditUser(u => ({ ...u, fio: e.target.value }))}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Telefon</label>
                    <input
                      value={editUser.phone || ''}
                      onChange={e => setEditUser(u => ({ ...u, phone: e.target.value }))}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Passport</label>
                    <input
                      value={editUser.passport || ''}
                      onChange={e => setEditUser(u => ({ ...u, passport: e.target.value }))}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Tug'ilgan sana (dd/mm/yyyy)</label>
                    <input
                      type="text"
                      value={editUser.birth_date || ''}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                        if (val.length > 4) val = val.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
                        else if (val.length > 2) val = val.replace(/(\d{2})(\d{0,2})/, '$1/$2');
                        setEditUser(u => ({ ...u, birth_date: val }));
                      }}
                      className="input-field w-full"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Kategoriya</label>
                    <select
                      value={editUser.category || 'B'}
                      onChange={e => setEditUser(u => ({ ...u, category: e.target.value }))}
                      className="input-field w-full"
                    >
                      <option value="A">A - Mototsikl</option>
                      <option value="B">B - Avtomobil</option>
                      <option value="C">C - Yuk avtomobili</option>
                      <option value="BC">BC - Avtomobil va yuk avtomobili</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Boshlanish (dd/mm/yyyy)</label>
                    <input
                      type="text"
                      value={editUser.entry_date || ''}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                        if (val.length > 4) val = val.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
                        else if (val.length > 2) val = val.replace(/(\d{2})(\d{0,2})/, '$1/$2');
                        setEditUser(u => ({ ...u, entry_date: val }));
                      }}
                      className="input-field w-full"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Tugash (dd/mm/yyyy)</label>
                    <input
                      type="text"
                      value={editUser.exit_date || ''}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
                        if (val.length > 4) val = val.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
                        else if (val.length > 2) val = val.replace(/(\d{2})(\d{0,2})/, '$1/$2');
                        setEditUser(u => ({ ...u, exit_date: val }));
                      }}
                      className="input-field w-full"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Umumiy to'lov (so'm)</label>
                    <input
                      type="number"
                      value={editUser.total_fee ?? 0}
                      onChange={e => setEditUser(u => ({ ...u, total_fee: parseInt(e.target.value) || 0 }))}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">To'langan (so'm)</label>
                    <input
                      type="number"
                      value={editUser.paid_fee ?? 0}
                      onChange={e => setEditUser(u => ({ ...u, paid_fee: parseInt(e.target.value) || 0 }))}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Guruh raqami</label>
                    <input
                      type="number"
                      value={editUser.user_number ?? 1}
                      onChange={e => setEditUser(u => ({ ...u, user_number: parseInt(e.target.value) || 1 }))}
                      className="input-field w-full"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-secondary-200 flex justify-end space-x-3">
                  <button onClick={closeEdit} className="btn-secondary">Bekor qilish</button>
                  <button onClick={saveEdit} className="btn-success">Saqlash</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        onCancel={() => setConfirmState(cs => ({ ...cs, open: false }))}
        onConfirm={confirmState.onConfirm}
      />
    </div>
  );
}

export default AdminUsers; 
