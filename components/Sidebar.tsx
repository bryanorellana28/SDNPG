import Link from 'next/link';
import { useState } from 'react';

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const [showAdmin, setShowAdmin] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/logout');
    window.location.href = '/';
  };

  return (
    <div
      className="d-flex flex-column flex-shrink-0 p-3 bg-light"
      style={{ width: '280px', minHeight: '100vh' }}
    >
      <Link
        href="/dashboard"
        className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-dark text-decoration-none"
      >
        <span className="fs-4">SDNPG</span>
      </Link>
      <hr />
      <ul className="nav nav-pills flex-column mb-auto">
        <li className="nav-item">
          <button
            className="nav-link text-start w-100 bg-transparent border-0"
            onClick={() => setShowInventory(!showInventory)}
          >
            Inventario
          </button>
          {showInventory && (
            <ul className="btn-toggle-nav list-unstyled fw-normal pb-1 small">
              <li>
                <Link href="/equipos" className="nav-link link-dark ms-3">
                  Equipos
                </Link>
              </li>
              <li>
                <Link href="/sites" className="nav-link link-dark ms-3">
                  Sitios
                </Link>
              </li>
              <li>
                <Link href="/backups" className="nav-link link-dark ms-3">
                  Backups
                </Link>
              </li>
              <li>
                <Link href="/software" className="nav-link link-dark ms-3">
                  Software de equipos
                </Link>
              </li>
            </ul>
          )}
        </li>

        {role === 'ADMIN' && (
          <li className="nav-item mt-3">
            <button
              className="nav-link text-start w-100 bg-transparent border-0"
              onClick={() => setShowAdmin(!showAdmin)}
            >
              &#9881; Administración
            </button>
            {showAdmin && (
              <ul className="btn-toggle-nav list-unstyled fw-normal pb-1 small">
                <li>
                  <Link href="/users" className="nav-link link-dark ms-3">
                    Gestionar Usuarios
                  </Link>
                </li>
                <li>
                  <Link href="/passwords" className="nav-link link-dark ms-3">
                    Gestionar Contraseñas
                  </Link>
                </li>
              </ul>
            )}
          </li>
        )}
      </ul>
      <hr />
      <button className="btn btn-danger w-100 mt-auto" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
