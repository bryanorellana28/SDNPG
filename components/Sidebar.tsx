import Link from 'next/link';
import { useState } from 'react';

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const [showAdmin, setShowAdmin] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/logout');
    window.location.href = '/';
  };

  return (
    <div className="d-flex flex-column bg-light p-3" style={{ width: '250px', minHeight: '100vh' }}>
      {role === 'ADMIN' && (
        <>
          <button
            className="btn btn-link text-start"
            onClick={() => setShowAdmin(!showAdmin)}
          >
            &#9881; Opciones
          </button>
          {showAdmin && (
            <div className="ms-3 d-flex flex-column">
              <Link className="btn btn-link text-start" href="/users">
                Gestionar Usuarios
              </Link>
              <Link className="btn btn-link text-start" href="/passwords">
                Gestionar Contraseñas
              </Link>
            </div>
          )}
        </>
      )}
      <div className="mt-auto">
        <button className="btn btn-danger w-100" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
