import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient.jsx";
import { useAuth } from "../AuthContext.jsx";
import { Navigate } from "react-router-dom";
import { formatDate } from "../utils/dateUtils.js";

function AdminDarsliklar() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  async function fetchUsers() {
    setLoading(true);
    try {
      let { data } = await supabase.from("users").select("*");
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error("O'quvchilarni yuklashda xatolik:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterUsers(term) {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredUsers(users);
      return;
    }
    const t = term.toLowerCase();
    const filtered = users.filter(u =>
      u.fio?.toLowerCase().includes(t) ||
      u.phone?.includes(term) ||
      u.passport?.toLowerCase().includes(t) ||
      String(u.user_number || "").includes(term)
    );
    setFilteredUsers(filtered);
  }

  // Group users by user_number
  const groups = useMemo(() => {
    const map = new Map();
    for (const u of filteredUsers) {
      const key = u.user_number || 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(u);
    }
    const entries = Array.from(map.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
    return entries;
  }, [filteredUsers]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card">
          <div className="px-6 py-4 border-b border-secondary-200 bg-gradient-to-r from-accent-50 to-primary-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-secondary-900">Guruhlar</h1>
                <p className="text-secondary-600">O'quvchilar guruhlari bo'yicha</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-secondary-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                  Guruhlar ro'yxati ({groups.length})
              </h2>
                <input
                  type="text"
                  placeholder="O'quvchilarni qidirish..."
                  value={searchTerm}
                  onChange={e => filterUsers(e.target.value)}
                  className="input-field w-full max-w-md"
                />
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="card p-6 text-center text-secondary-600">Ma'lumot topilmadi</div>
            ) : (
              <div className="space-y-8">
                {groups.map(([groupNumber, groupUsers]) => (
                  <div key={groupNumber} className="card">
                    <div className="px-6 py-4 border-b border-secondary-200 bg-secondary-50 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-secondary-900">{groupNumber}. guruh</h3>
                      <span className="text-sm text-secondary-600">Jami: {groupUsers.length}</span>
                    </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="min-w-full divide-y divide-secondary-200">
                    <thead className="bg-secondary-50">
                      <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">FIO</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Telefon</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Kategoriya</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Boshlanish</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Tugash</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Qolgan (so'm)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-200">
                          {groupUsers.map((u, idx) => (
                            <tr key={u.id} className="hover:bg-secondary-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{idx + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{u.fio}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{u.phone}</td>
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{formatDate(u.entry_date)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{formatDate(u.exit_date)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${((u.remaining_fee || 0) === 0) ? 'text-success-600' : 'text-error-600'}`}>{(u.remaining_fee || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
                ))}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDarsliklar; 