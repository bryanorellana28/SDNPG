import { useState } from 'react';
import { useRouter } from 'next/router';
import Popup from '../components/Popup';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      router.push('/dashboard');
    } else {
      const data = await res.json();
      setError(data.message || 'Credenciales inválidas');
      setShowPopup(true);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{
        background: 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 45%, #415a77 100%)',
      }}
    >
      <div className="bg-white rounded-4 shadow-lg p-4 p-md-5" style={{ width: '100%', maxWidth: '420px' }}>
        <div className="text-center mb-4">
          <div className="fw-bold text-primary mb-2" style={{ letterSpacing: '0.2rem' }}>
            SDNTELCO
          </div>
          <h1 className="h4 fw-bold mb-1 text-dark">Bienvenido de nuevo</h1>
          <p className="text-muted mb-0">Accede a tu panel de operación</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-muted text-uppercase small">Usuario</label>
            <input
              type="text"
              className="form-control form-control-lg"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              required
            />
          </div>
          <div className="mb-4">
            <label className="form-label text-muted text-uppercase small">Contraseña</label>
            <input
              type="password"
              className="form-control form-control-lg"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-100">
            Ingresar
          </button>
        </form>
      </div>
      <Popup
        show={showPopup}
        onClose={() => {
          setShowPopup(false);
          setError('');
        }}
        message={error}
        variant="danger"
      />
    </div>
  );
}
