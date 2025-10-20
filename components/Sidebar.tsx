import Link from 'next/link';
import { useState } from 'react';

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const [showAdmin, setShowAdmin] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showSoftware, setShowSoftware] = useState(false);
  const [showClients, setShowClients] = useState(false);
  const [showOperation, setShowOperation] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/logout');
    window.location.href = '/';
  };

  return (
    <div
      className="d-flex flex-column flex-shrink-0 p-3 bg-dark text-white"
      style={{ width: '280px', minHeight: '100vh' }}
    >
      <Link
        href="/dashboard"
        className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none"
      >
        <span className="fs-4">SDNPG</span>
      </Link>
      <hr className="border-secondary" />
      <ul className="nav nav-pills flex-column mb-auto">
        <li className="nav-item">
          <Link href="/dashboard" className="nav-link text-white">
            Dashboard
          </Link>
        </li>

        <li className="nav-item mt-3">
          <button
            className="nav-link text-start w-100 bg-transparent border-0 text-white"
            onClick={() => setShowInventory(!showInventory)}
          >
            Inventario
          </button>
          {showInventory && (
            <ul className="btn-toggle-nav list-unstyled fw-normal pb-1 small">
              <li>
                <Link href="/equipos" className="nav-link link-light ms-3">
                  Equipos
                </Link>
              </li>
              <li>
                <Link href="/equipos/puertos" className="nav-link link-light ms-3">
                  Inventario puertos
                </Link>
              </li>
              <li>
                <Link href="/sites" className="nav-link link-light ms-3">
                  Sitios
                </Link>
              </li>
              <li>
                <Link href="/backups" className="nav-link link-light ms-3">
                  Backups
                </Link>
              </li>
            </ul>
          )}
        </li>

        <li className="nav-item mt-3">
          <button
            className="nav-link text-start w-100 bg-transparent border-0 text-white"
            onClick={() => setShowSoftware(!showSoftware)}
          >
            Gestión de software
          </button>
          {showSoftware && (
            <ul className="btn-toggle-nav list-unstyled fw-normal pb-1 small">
              <li>
                <Link href="/software/golden" className="nav-link link-light ms-3">
                  Golden Image
                </Link>
              </li>
              <li>
                <Link href="/software/actualizaciones" className="nav-link link-light ms-3">
                  Actualizaciones
                </Link>
              </li>
            </ul>
          )}
        </li>

        {role === 'ADMIN' && (
          <li className="nav-item mt-3">
            <button
              className="nav-link text-start w-100 bg-transparent border-0 text-white"
              onClick={() => setShowAdmin(!showAdmin)}
            >
              &#9881; Administración
            </button>
            {showAdmin && (
              <ul className="btn-toggle-nav list-unstyled fw-normal pb-1 small">
                <li>
                  <Link href="/users" className="nav-link link-light ms-3">
                    Gestionar Usuarios
                  </Link>
                </li>
                <li>
                  <Link href="/passwords" className="nav-link link-light ms-3">
                    Gestionar Contraseñas
                  </Link>
                </li>
              </ul>
            )}
          </li>
        )}

        <li className="nav-item mt-3">
          <button
            className="nav-link text-start w-100 bg-transparent border-0 text-white"
            onClick={() => setShowClients(!showClients)}
          >
            Clientes y Servicios
          </button>
          {showClients && (
            <ul className="btn-toggle-nav list-unstyled fw-normal pb-1 small">
              <li>
                <Link href="/clientes" className="nav-link link-light ms-3">
                  Clientes
                </Link>
              </li>
              <li>
                <Link href="/servicios" className="nav-link link-light ms-3">
                  Servicios
                </Link>
              </li>
            </ul>
          )}
        </li>

        <li className="nav-item mt-3">
          <button
            className="nav-link text-start w-100 bg-transparent border-0 text-white"
            onClick={() => setShowOperation(!showOperation)}
          >
            Operación
          </button>
          {showOperation && (
            <ul className="btn-toggle-nav list-unstyled fw-normal pb-1 small">
              <li>
                <Link href="/diagnostico" className="nav-link link-light ms-3">
                  Diagnóstico
                </Link>
              </li>
              <li>
                <Link href="/operacion/rastreo-clientes" className="nav-link link-light ms-3">
                  Rastreo de clientes
                </Link>
              </li>
              <li>
                <Link href="/operacion/limitantes" className="nav-link link-light ms-3">
                  Limitantes
                </Link>
              </li>
            </ul>
          )}
        </li>
      </ul>
      <hr className="border-secondary" />
      <button className="btn btn-danger w-100 mt-auto" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
