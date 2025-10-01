import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.jsx";
import { useAuth } from "../AuthContext.jsx";
import { formatDate, toInputDateFormat, fromInputDateFormat, isValidDisplayDate, displayToIso, formatDateTime } from "../utils/dateUtils.js";
import ConfirmModal from "../components/ConfirmModal.jsx";

function Admin() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('sorovlar');
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archived, setArchived] = useState([]);
  const [archivedFiltered, setArchivedFiltered] = useState([]);
  const [archiveSearch, setArchiveSearch] = useState('');

  // Users state
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
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
    user_number: 1
  });
  const [detailUser, setDetailUser] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false, title: '', description: '', onConfirm: null });

  // Format number with spaces every 3 digits
  function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // So'rovlar state
  const [sorovlar, setSorovlar] = useState([]);
  const [filteredSorovlar, setFilteredSorovlar] = useState([]);
  const [sorovSearchTerm, setSorovSearchTerm] = useState('');
  const unhandledSorovCount = sorovlar.filter(s => !s.handled).length;

  // To'lovlar tarixi state
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentsError, setPaymentsError] = useState("");

  // Tests state
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [testSearchTerm, setTestSearchTerm] = useState('');
  const [newTest, setNewTest] = useState({
    question_text: "",
    image_url: ""
  });
  const [choices, setChoices] = useState([]);
  const [newChoices, setNewChoices] = useState([
    { choice_text: "", is_correct: false },
    { choice_text: "", is_correct: false },
    { choice_text: "", is_correct: false },
    { choice_text: "", is_correct: false }
  ]);

  // Darsliklar state
  const [darsliklar, setDarsliklar] = useState([]);
  const [filteredDarsliklar, setFilteredDarsliklar] = useState([]);
  const [darslikSearchTerm, setDarslikSearchTerm] = useState('');
  const [newDarslik, setNewDarslik] = useState({
    title: "",
    description: "",
    video_url: "",
    order_number: 1
  });

  useEffect(() => {
    if (isAdmin) {
      // Users are managed on a separate page now
      fetchUsers();
      fetchSorovlar();
      fetchTests();
      fetchDarsliklar();
      fetchArchived();
      fetchPayments();
    }
  }, [isAdmin]);

  // Background refresh for new inquiries (notifications)
  useEffect(() => {
    if (!isAdmin) return;
    const id = setInterval(() => {
      fetchSorovlar(false);
    }, 5000);
    return () => clearInterval(id);
  }, [isAdmin]);

  // Users CRUD
  async function fetchUsers() {
    let { data } = await supabase.from("users").select("*");
    setUsers(data || []);
    setFilteredUsers(data || []);
  }

  // So'rovlar CRUD
  async function fetchSorovlar() {
    let { data } = await supabase
      .from("aloqa")
      .select("*")
      .order("created_at", { ascending: false });
    setSorovlar(data || []);
    setFilteredSorovlar(data || []);
  }

  async function toggleSorovHandled(s) {
    try {
      const { error } = await supabase
        .from('aloqa')
        .update({ handled: !s.handled })
        .eq('id', s.id);
      if (error) throw error;
      setSorovlar(prev => prev.map(x => x.id === s.id ? { ...x, handled: !s.handled } : x));
      setFilteredSorovlar(prev => prev.map(x => x.id === s.id ? { ...x, handled: !s.handled } : x));
    } catch (e) {
      alert("'aloqa' jadvalida 'handled' (boolean, default false) ustuni kerak.");
    }
  }

  function filterSorovlar(searchTerm) {
    setSorovSearchTerm(searchTerm);
    if (!searchTerm.trim()) {
      setFilteredSorovlar(sorovlar);
      return;
    }
    const t = searchTerm.toLowerCase();
    const filtered = sorovlar.filter(sorov =>
      sorov.ism?.toLowerCase().includes(t) ||
      sorov.email?.toLowerCase().includes(t) ||
      sorov.telefon?.includes(searchTerm) ||
      sorov.xabar?.toLowerCase().includes(t) ||
      formatDateTime(sorov.created_at)?.toLowerCase().includes(t)
    );
    setFilteredSorovlar(filtered);
  }

  async function deleteSorov(id) {
    setConfirmState({
      open: true,
      title: "So'rovni o'chirish",
      description: "Bu so'rovni o'chirishni xohlaysizmi?",
      onConfirm: async () => {
        const { error } = await supabase.from("aloqa").delete().eq("id", id);
        if (error) {
          alert("Xatolik: " + error.message);
        } else {
          setSorovlar(prev => prev.filter(s => s.id !== id));
          setFilteredSorovlar(prev => prev.filter(s => s.id !== id));
        }
        setConfirmState(cs => ({ ...cs, open: false }));
      }
    });
  }

  // Payments CRUD
  async function fetchPayments() {
    setPaymentsError("");
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      setPayments(data || []);
      setFilteredPayments(data || []);
    } catch (e) {
      console.error('Payments fetch error:', e);
      setPayments([]);
      setFilteredPayments([]);
      setPaymentsError("To'lovlar tarixi uchun 'payments' jadvali topilmadi yoki xatolik yuz berdi. Agar tarixni ko'rishni istasangiz, jadvalni yarating.");
    }
  }

  function filterPayments(term) {
    setPaymentSearch(term);
    if (!term.trim()) { setFilteredPayments(payments); return; }
    const t = term.toLowerCase();
    const filtered = payments.filter(p => {
      const u = users.find(x => x.id === p.user_id);
      const fio = u?.fio?.toLowerCase() || '';
      const phone = u?.phone || '';
      const dateStr = formatDateTime(p.payment_date)?.toLowerCase() || '';
      const amountStr = String(p.amount || '').toLowerCase();
      return fio.includes(t) || phone.includes(term) || dateStr.includes(t) || amountStr.includes(t);
    });
    setFilteredPayments(filtered);
  }

  // Search functions
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

  async function addUser() {
    if (!newUser.fio || !newUser.phone || !newUser.passport || !newUser.birth_date) {
      alert("Barcha maydonlarni to'ldiring!");
      return;
    }
    if (!isValidDisplayDate(newUser.birth_date)) {
      alert("Sana to'liq va to'g'ri formatda kiritilishi kerak: dd/mm/yyyy");
      return;
    }
    
    // remaining_fee GENERATED STORED — yuborilmaydi
    const { remaining_fee, ...newUserWithoutRemaining } = newUser;
    // Convert to ISO before sending to backend
    const userToSave = {
      ...newUserWithoutRemaining,
      birth_date: displayToIso(newUser.birth_date),
      entry_date: newUser.entry_date ? displayToIso(newUser.entry_date) : null,
      exit_date: newUser.exit_date ? displayToIso(newUser.exit_date) : null
    };
    
    try {
      const { error } = await supabase.from("users").insert([userToSave]);
      if (!error) {
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
          user_number: 1
        });
        fetchUsers();
        alert("O'quvchi muvaffaqiyatli qo'shildi!");
      } else {
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

  function openEdit(user) {
    setEditUser({
      ...user,
      // format existing ISO dates to display format for inputs
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
      // convert display dates back to ISO for backend
      birth_date: displayToIso(editUser.birth_date),
      entry_date: editUser.entry_date ? displayToIso(editUser.entry_date) : null,
      exit_date: editUser.exit_date ? displayToIso(editUser.exit_date) : null,
      // ensure numbers are numbers
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

  async function addPayment(user) {
    const input = window.prompt("To'lov summasini kiriting (so'm):", "0");
    if (input === null) return;
    const amount = parseInt(String(input).replace(/[^0-9-]/g, ''), 10);
    if (Number.isNaN(amount) || amount <= 0) {
      alert("Ijobiy butun son kiriting");
      return;
    }
    const currentPaid = Number(user.paid_fee || 0);
    const newPaid = currentPaid + amount;
    try {
      const { error } = await supabase
        .from("users")
        .update({ paid_fee: newPaid })
        .eq("id", user.id);
      if (error) {
        alert("Xatolik: " + error.message);
        return;
      }
      await fetchUsers();
      alert("To'lov qo'shildi");
    } catch (e) {
      alert("Xatolik: " + e.message);
    }
  }

  async function deleteUser(id) {
    if (window.confirm("O'quvchini o'chirishni xohlaysizmi?")) {
      try {
        const { error } = await supabase.from("users").delete().eq("id", id);
        if (!error) {
          setUsers(users.filter(u => u.id !== id));
          alert("O'quvchi o'chirildi!");
        } else {
          alert("Xatolik: " + error.message);
        }
      } catch (error) {
        alert("Xatolik: " + error.message);
      }
    }
  }

  // Tests CRUD
  async function fetchTests() {
    let { data } = await supabase.from("questions").select("*");
    setTests(data || []);
    
    let { data: choicesData } = await supabase.from("choices").select("*");
    setChoices(choicesData || []);
    setFilteredTests(data || []);
  }

  // Search functions
  function filterTests(searchTerm) {
    setTestSearchTerm(searchTerm);
    if (!searchTerm.trim()) {
      setFilteredTests(tests);
      return;
    }
    const filtered = tests.filter(test =>
      test.question_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.image_url?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTests(filtered);
  }

  async function addTest() {
    if (!newTest.question_text) {
      alert("Savol matnini kiriting!");
      return;
    }
    
    if (newChoices.filter(c => c.choice_text.trim()).length < 2) {
      alert("Kamida 2 ta javob variantini kiriting!");
      return;
    }
    
    if (newChoices.filter(c => c.is_correct).length !== 1) {
      alert("Aniq 1 ta to'g'ri javobni belgilang!");
      return;
    }

    try {
      // Savolni qo'shamiz
      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .insert([newTest])
        .select();

      if (questionError) throw questionError;

      const questionId = questionData[0].id;

      // Javob variantlarini qo'shamiz
      const choicesToInsert = newChoices
        .filter(c => c.choice_text.trim())
        .map(c => ({ ...c, question_id: questionId }));

      const { error: choicesError } = await supabase
        .from("choices")
        .insert(choicesToInsert);

      if (choicesError) throw choicesError;

      setNewTest({ question_text: "", image_url: "" });
      setNewChoices([
        { choice_text: "", is_correct: false },
        { choice_text: "", is_correct: false },
        { choice_text: "", is_correct: false },
        { choice_text: "", is_correct: false }
      ]);
      fetchTests();
      alert("Test muvaffaqiyatli qo'shildi!");
    } catch (error) {
      alert("Xatolik: " + error.message);
    }
  }

  async function deleteTest(id) {
    setConfirmState({
      open: true,
      title: "Testni o'chirish",
      description: "Testni o'chirishni xohlaysizmi?",
      onConfirm: async () => {
        try {
        await supabase.from("choices").delete().eq("question_id", id);
        const { error } = await supabase.from("questions").delete().eq("id", id);
        if (!error) {
          setTests(tests.filter(t => t.id !== id));
        } else {
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

  // Darsliklar CRUD
  async function fetchDarsliklar() {
    let { data } = await supabase.from("darsliklar").select("*").order("order_number");
    setDarsliklar(data || []);
    setFilteredDarsliklar(data || []);
  }

  // Search functions
  function filterDarsliklar(searchTerm) {
    setDarslikSearchTerm(searchTerm);
    if (!searchTerm.trim()) {
      setFilteredDarsliklar(darsliklar);
      return;
    }
    const filtered = darsliklar.filter(darslik =>
      darslik.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      darslik.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      darslik.video_url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      darslik.order_number?.toString().includes(searchTerm)
    );
    setFilteredDarsliklar(filtered);
  }

  async function addDarslik() {
    if (!newDarslik.title || !newDarslik.video_url) {
      alert("Sarlavha va video URL ni kiriting!");
      return;
    }

    const { error } = await supabase.from("darsliklar").insert([newDarslik]);
    if (!error) {
      setNewDarslik({ title: "", description: "", video_url: "", order_number: 1 });
      fetchDarsliklar();
      alert("Darslik muvaffaqiyatli qo'shildi!");
    } else {
      alert("Xatolik: " + error.message);
    }
  }

  async function deleteDarslik(id) {
    setConfirmState({
      open: true,
      title: "Darslikni o'chirish",
      description: "Darslikni o'chirishni xohlaysizmi?",
      onConfirm: async () => {
      const { error } = await supabase.from("darsliklar").delete().eq("id", id);
      if (!error) {
        setDarsliklar(darsliklar.filter(d => d.id !== id));
      } else {
        alert("Xatolik: " + error.message);
      }
        setConfirmState(cs => ({ ...cs, open: false }));
    }
    });
  }

  async function fetchArchived() {
    let { data } = await supabase.from('users_archive').select('*');
    setArchived(data || []);
    setArchivedFiltered(data || []);
  }

  function filterArchived(term) {
    setArchiveSearch(term);
    if (!term.trim()) { setArchivedFiltered(archived); return; }
    const t = term.toLowerCase();
    setArchivedFiltered(
      archived.filter(u =>
        u.fio?.toLowerCase().includes(t) ||
        u.phone?.includes(term) ||
        u.passport?.toLowerCase().includes(t)
      )
    );
  }

  function updateChoice(index, field, value) {
    const updated = [...newChoices];
    updated[index] = { ...updated[index], [field]: value };
    setNewChoices(updated);
  }

  if (!isAdmin) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Faqat admin uchun!</h1>
        <p className="text-gray-600">Bu sahifaga kirish uchun admin huquqlari kerak.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('sorovlar')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sorovlar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="relative inline-flex items-center">
                  So'rovlar
                  {activeTab !== 'sorovlar' && unhandledSorovCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs font-semibold">
                      {unhandledSorovCount}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Testlar
              </button>
              <button
                onClick={() => setActiveTab('darsliklar')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'darsliklar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Darsliklar
              </button>
              <button
                onClick={() => setActiveTab('arxiv')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'arxiv'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Arxiv
              </button>
                      <button 
                onClick={() => setActiveTab('payments')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'payments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                To'lovlar tarixi
                      </button>
            </nav>
                </div>

          <div className="p-6">
            {/* So'rovlar Tab */}
            {activeTab === 'sorovlar' && (
                <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">So'rovlar ro'yxati</h2>
                  <div className="mb-4">
                    <input
                      type="text"
                    placeholder="So'rovlarni qidirish..."
                    value={sorovSearchTerm}
                    onChange={e => filterSorovlar(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-md"
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ism</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sana</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Xabar</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Javob</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amallar</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSorovlar.map(s => (
                        <tr key={s.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{s.ism}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            {s.email ? (
                              <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            {s.telefon ? (
                              <a href={`tel:${s.telefon}`} className="hover:underline">{s.telefon}</a>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(s.created_at)}</td>
                          <td className="px-6 py-4 text-sm text-gray-700 max-w-md truncate">{s.xabar}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                              onClick={() => toggleSorovHandled(s)}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${s.handled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                              title={s.handled ? "Javob berilgan" : "Javob berilmagan"}
                            >
                              <span className="mr-1">{s.handled ? '✔' : '—'}</span>
                              {s.handled ? 'Berildi' : 'Kutilmoqda'}
                              </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button 
                              onClick={() => deleteSorov(s.id)}
                                className="text-red-600 hover:text-red-900"
                              title="O'chirish"
                              >
                                O'chirish
                              </button>
                            </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
              </div>
            )}

            {/* Tests Tab */}
            {activeTab === 'tests' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Yangi test qo'shish</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Savol</label>
                      <textarea
                        placeholder="Savol matnini kiriting..."
                        value={newTest.question_text}
                        onChange={e => setNewTest(t => ({ ...t, question_text: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rasm URL (ixtiyoriy)</label>
                      <input
                        placeholder="https://example.com/image.jpg"
                        value={newTest.image_url}
                        onChange={e => setNewTest(t => ({ ...t, image_url: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Javob variantlari</label>
                      <div className="space-y-2">
                        {newChoices.map((choice, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              placeholder={`Variant ${index + 1}`}
                              value={choice.choice_text}
                              onChange={e => updateChoice(index, 'choice_text', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="radio"
                              name="correct"
                              checked={choice.is_correct}
                              onChange={() => {
                                const updated = newChoices.map((c, i) => ({
                                  ...c,
                                  is_correct: i === index
                                }));
                                setNewChoices(updated);
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-sm text-gray-500">To'g'ri</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={addTest}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Test qo'shish
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Testlar ro'yxati</h2>
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Testlarni qidirish..."
                      value={testSearchTerm}
                      onChange={e => filterTests(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-md"
                    />
                  </div>
                  <div className="space-y-4">
                    {filteredTests.map(test => {
                      const testChoices = choices.filter(c => c.question_id === test.id);
                      return (
                        <div key={test.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-900">{test.question_text}</h3>
                            <button 
                              onClick={() => deleteTest(test.id)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              O'chirish
                            </button>
                          </div>
                          {test.image_url && (
                            <img src={test.image_url} alt="Test rasmi" className="w-32 h-20 object-cover rounded mb-2" />
                          )}
                          <div className="text-sm text-gray-600">
                            <p>Javob variantlari:</p>
                            <ul className="list-disc list-inside ml-2">
                              {testChoices.map(choice => (
                                <li key={choice.id} className={choice.is_correct ? 'text-green-600 font-medium' : ''}>
                                  {choice.choice_text} {choice.is_correct && '(To\'g\'ri)'}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Darsliklar Tab */}
            {activeTab === 'darsliklar' && (
              <div>
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Yangi darslik qo'shish</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sarlavha</label>
                      <input 
                        placeholder="Sarlavha" 
                        value={newDarslik.title} 
                        onChange={e => setNewDarslik(d => ({ ...d, title: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Video URL (YouTube)</label>
                      <input 
                        placeholder="Video URL (YouTube)" 
                        value={newDarslik.video_url} 
                        onChange={e => setNewDarslik(d => ({ ...d, video_url: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tartib raqami</label>
                      <input 
                        type="number"
                        placeholder="Tartib raqami" 
                        value={newDarslik.order_number} 
                        onChange={e => setNewDarslik(d => ({ ...d, order_number: parseInt(e.target.value) || 1 }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={addDarslik}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                      >
                        Darslik qo'shish
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Darslik tavsifi (ixtiyoriy)</label>
                    <textarea
                      placeholder="Darslik tavsifi (ixtiyoriy)"
                      value={newDarslik.description}
                      onChange={e => setNewDarslik(d => ({ ...d, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Darsliklar ro'yxati</h2>
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Darsliklarni qidirish..."
                      value={darslikSearchTerm}
                      onChange={e => filterDarsliklar(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-md"
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tartib</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sarlavha</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tavsif</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Video URL</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amallar</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredDarsliklar.map(d => (
                          <tr key={d.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{d.order_number}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{d.title}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{d.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <a href={d.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                Ko'rish
                              </a>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button 
                                onClick={() => deleteDarslik(d.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                O'chirish
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Arxiv Tab */}
            {activeTab === 'arxiv' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Arxiv</h2>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Arxivdan qidirish..."
                    value={archiveSearch}
                    onChange={e => filterArchived(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-md"
                  />
          </div>
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FIO</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tug'ilgan sana</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {archivedFiltered.map((u, idx) => (
                        <tr key={u.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.fio}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.phone}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(u.birth_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
        </div>
      </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">To'lovlar tarixi</h2>
                {paymentsError && (
                  <div className="mb-4 p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm">
                    {paymentsError}
                  </div>
                )}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Qidirish (ism, telefon, sana, summa)"
                    value={paymentSearch}
                    onChange={e => filterPayments(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-md"
                  />
                </div>
                <div className="mb-4">
                  <button
                    onClick={() => {
                      const headers = ['Sana', "O'quvchi", 'Telefon', 'Summa'];
                      const escapeCell = (v) => {
                        if (v === null || v === undefined) return '';
                        const str = String(v);
                        if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
                        return str;
                      };
                      const rows = filteredPayments.map(p => {
                        const u = users.find(x => x.id === p.user_id);
                        return [
                          `'${formatDateTime(p.payment_date) || ''}`,
                          (u?.fio || `ID: ${p.user_id}`),
                          (u?.phone ? `'${u.phone}` : ''),
                          Number(p.amount || 0)
                        ];
                      });
                      const csv = [headers, ...rows].map(r => r.map(escapeCell).join(',')).join('\n');
                      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      const today = new Date().toISOString().slice(0,10);
                      link.setAttribute('download', `tolovlar_tarixi_${today}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
                  >
                    Excel (CSV)
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sana</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">O'quvchi</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summa</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPayments.map(p => {
                        const u = users.find(x => x.id === p.user_id);
                        return (
                          <tr key={p.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(p.payment_date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u?.fio || `ID: ${p.user_id}`}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{u?.phone || '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">{formatNumber(p.amount || 0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
    </div>
  );
}

export default Admin;