import React, { useState } from 'react';

const ADMIN_TOKEN_KEY = 'adminAuthToken'; // Token saqlanadigan kalit

function AdminLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Saqlangan tokenni tekshirish va kirishni ta'minlash
  const checkToken = () => {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Netlify Function'ga murojaat (API kalitlar serverda yashirin)
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        // Noto'g'ri login yoki parol
        if (response.status === 401) {
          setError("Noto'g'ri foydalanuvchi nomi yoki parol.");
        } else {
          setError('Kirishda kutilmagan xato ro‘y berdi.');
        }
        setLoading(false);
        return;
      }

      // 2. Javobni qabul qilish va tokenni olish
      const data = await response.json();
      const token = data.token; // Netlify Function qaytargan token

      if (!token) {
        setError('Serverdan token ololmayapti.');
        setLoading(false);
        return;
      }

      // 3. Tokenni xavfsiz saqlash
      localStorage.setItem(ADMIN_TOKEN_KEY, token);

      // 4. Muvaffaqiyatli kirish: Boshqaruv paneliga yo'naltirish
      console.log('Kirish muvaffaqiyatli! Token saqlandi.');
      // O'zingizning admin yo'lingizga yo'naltiring (masalan, /dashboard)
      window.location.href = '/dashboard';

    } catch (err) {
      console.error('Login xatosi:', err);
      setError('Serverga ulanishda xato. Iltimos, keyinroq urinib ko‘ring.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Admin Panelga Kirish</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="username">Login:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="password">Parol:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Kirilmoqda...' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}

// Tokenni olish uchun yordamchi funksiya
export const getAdminToken = () => {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
};

export default AdminLoginForm;


