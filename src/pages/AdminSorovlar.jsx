import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.jsx";
import api from '../lib/adminApi';
import { useAuth } from "../AuthContext.jsx";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import ConfirmModal from "../components/ConfirmModal.jsx";
import { formatDateTime } from "../utils/dateUtils.js";

function AdminSorovlar() {
  const [sorovlar, setSorovlar] = useState([]);
  const [filteredSorovlar, setFilteredSorovlar] = useState([]);
  const [sorovSearchTerm, setSorovSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmState, setConfirmState] = useState({ open: false, title: '', description: '', onConfirm: null });
  const unhandledCount = sorovlar.filter(s => !s.handled).length;

  useEffect(() => {
    fetchSorovlar();
    
    // Set up automatic refresh every 3 seconds
    const intervalId = setInterval(() => {
      fetchSorovlar(false); // false means don't show loading state
    }, 3000);

    // Cleanup interval on component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  async function fetchSorovlar(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }
    setError("");
    
    try {
      const data = await api.adminSelect('aloqa', { select: '*', order: [{ column: 'created_at', ascending: false }] });
      setSorovlar(data || []);
      setFilteredSorovlar(data || []);
    } catch (error) {
      console.error("So'rovlarni yuklashda xatolik:", error);
      if (showLoading) {
        setError("So'rovlarni yuklashda xatolik yuz berdi");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function toggleHandled(sorov) {
    try {
      try {
        await api.adminUpdate('aloqa', { id: sorov.id }, { handled: !sorov.handled });
        setSorovlar(prev => prev.map(s => s.id === sorov.id ? { ...s, handled: !sorov.handled } : s));
        setFilteredSorovlar(prev => prev.map(s => s.id === sorov.id ? { ...s, handled: !sorov.handled } : s));
      } catch (e) {
        throw e;
      }
    } catch (e) {
      console.error("Handled flag update error:", e);
      alert("'aloqa' jadvalida 'handled' ustuni (boolean, default false) kerak.");
    }
  }

  function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {}, () => {});
  }

  function filterSorovlar(searchTerm) {
    setSorovSearchTerm(searchTerm);
    if (!searchTerm.trim()) {
      setFilteredSorovlar(sorovlar);
      return;
    }
    const filtered = sorovlar.filter(sorov =>
      sorov.ism?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sorov.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sorov.telefon?.includes(searchTerm) ||
      sorov.xabar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatDate(sorov.created_at)?.includes(searchTerm)
    );
    setFilteredSorovlar(filtered);
  }

  async function deleteSorov(id) {
    setConfirmState({
      open: true,
      title: "So'rovni o'chirish",
      description: "Bu so'rovni o'chirishni xohlaysizmi?",
      onConfirm: async () => {
        try {
          try {
            await api.adminDelete('aloqa', { id });
            setSorovlar(prev => prev.filter(sorov => sorov.id !== id));
            setFilteredSorovlar(prev => prev.filter(sorov => sorov.id !== id));
          } catch (error) {
            throw error;
          }
        } catch (error) {
          console.error("So'rovni o'chirishda xatolik:", error);
          alert("So'rovni o'chirishda xatolik yuz berdi");
        } finally {
          setConfirmState(cs => ({ ...cs, open: false }));
        }
      }
    });
  }

  function formatDate(dateString) {
    return formatDateTime(dateString);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">So'rovlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-secondary-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card">
          <div className="px-6 py-4 border-b border-secondary-200 bg-gradient-to-r from-warning-50 to-error-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-warning-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-secondary-900">Aloqa so'rovlari</h1>
                <p className="text-secondary-600">O'quvchilardan kelgan xabarlar (3 soniyada avtomatik yangilanadi)</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-error-700 font-medium">{error}</span>
                </div>
              </motion.div>
            )}

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-secondary-900 flex items-center">
                <svg className="w-5 h-5 text-warning-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                So'rovlar ro'yxati ({filteredSorovlar.length})
                <span className="ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  Yangi: {unhandledCount}
                </span>
              </h2>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="So'rovlarni qidirish..."
                  value={sorovSearchTerm}
                  onChange={e => filterSorovlar(e.target.value)}
                  className="px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-warning-500 w-64"
                />
                <button
                  onClick={() => fetchSorovlar(true)}
                  className="btn-secondary"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Qayta yuklash</span>
                  </div>
                </button>
              </div>
            </div>

            {sorovlar.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-24 h-24 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">So'rovlar yo'q</h3>
                <p className="text-secondary-600">Hozircha hech qanday so'rov kelmagan</p>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {filteredSorovlar.map((sorov, index) => (
                  <motion.div
                    key={sorov.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-secondary-900">{sorov.ism}</h3>
                          <p className="text-sm text-secondary-500">#{sorov.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${sorov.handled ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-500'}`}>
                          {formatDate(sorov.created_at)}
                        </span>
                        <button
                          onClick={() => toggleHandled(sorov)}
                          className={`ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full border ${sorov.handled ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-secondary-300 text-secondary-400 hover:bg-secondary-50'}`}
                          title={sorov.handled ? "Javob berilgan" : "Javob berilmagan"}
                        >
                          {sorov.handled ? '✔' : '✓'}
                        </button>
                        <button
                          onClick={() => deleteSorov(sorov.id)}
                          className="text-error-600 hover:text-error-800 transition-colors"
                          title="O'chirish"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {sorov.email && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-secondary-600 flex items-center space-x-2">
                            <a 
                              href={`mailto:${sorov.email}`}
                              className="text-primary-600 hover:text-primary-700 transition-colors underline"
                            >
                              {sorov.email}
                            </a>
                            <button
                              onClick={() => copyToClipboard(sorov.email)}
                              className="text-secondary-400 hover:text-secondary-600"
                              title="Nusxalash"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </span>
                        </div>
                      )}
                      {sorov.telefon && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-sm text-secondary-600">
                            <a 
                              href={`tel:${sorov.telefon}`}
                              className="text-primary-600 hover:text-primary-700 transition-colors"
                            >
                              {sorov.telefon}
                            </a>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="bg-secondary-50 rounded-lg p-4">
                      <h4 className="font-medium text-secondary-900 mb-2">Xabar:</h4>
                      <p className="text-secondary-700 leading-relaxed">{sorov.xabar}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    <ConfirmModal
      open={confirmState.open}
      title={confirmState.title}
      description={confirmState.description}
      onCancel={() => setConfirmState(cs => ({ ...cs, open: false }))}
      onConfirm={confirmState.onConfirm}
    />
    </>
  );
}

export default AdminSorovlar; 