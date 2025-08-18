import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState, useRef } from 'react';
import { Modal } from 'bootstrap';
import Sidebar from '../../components/Sidebar';
import SearchBar from '../../components/SearchBar';

interface Equipment {
  id: number;
  hostname: string;
  ip: string;
  chassis: string;
  serial: string;
  version: string;
  type: string;
  site?: { nombre: string } | null;
}

interface Credential {
  id: number;
  username: string;
}

interface SiteOption {
  id: number;
  nombre: string;
}

export default function Equipos({ role }: { role: string }) {
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [ip, setIp] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [type, setType] = useState('Mikrotik');
  const [search, setSearch] = useState('');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [message, setMessage] = useState('');
  const modalRef = useRef<Modal | null>(null);

  const fetchEquipos = async () => {
    const res = await fetch('/api/equipos');
    const data = await res.json();
    setEquipos(data);
  };

  useEffect(() => {
    fetchEquipos();
    fetch('/api/passwords').then(r => r.json()).then(setCredentials);
    fetch('/api/sites').then(r => r.json()).then(setSites);
    modalRef.current = new Modal(document.getElementById('messageModal')!);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/equipos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, credentialId: Number(credentialId), siteId: siteId ? Number(siteId) : null, type }),
    });
    if (res.status === 201) {
      setMessage('Agregado con éxito');
      setIp('');
      setCredentialId('');
      setSiteId('');
      setType('Mikrotik');
      fetchEquipos();
    } else if (res.status === 409) {
      setMessage('El equipo ya se encuentra en la base de datos');
    } else {
      setMessage('Error al agregar');
    }
    modalRef.current?.show();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/equipos/${id}`, { method: 'DELETE' });
    fetchEquipos();
  };

  const filtered = equipos.filter(e =>
    Object.values(e).some(v => v && v.toString().toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Equipos</h2>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <SearchBar value={search} onChange={setSearch} />
          <button className="btn btn-primary" data-bs-toggle="offcanvas" data-bs-target="#addEquipo">
            Agregar
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Hostname</th>
              <th>IP</th>
              <th>Chassis</th>
              <th>Serial</th>
              <th>Versión</th>
              <th>Tipo</th>
              <th>Sitio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td>{e.hostname}</td>
                <td>{e.ip}</td>
                <td>{e.chassis}</td>
                <td>{e.serial}</td>
                <td>{e.version}</td>
                <td>{e.type}</td>
                <td>{e.site?.nombre || ''}</td>
                <td>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(e.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="offcanvas offcanvas-end" tabIndex={-1} id="addEquipo">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Agregar Equipo</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleAdd}>
            <div className="mb-2">
              <input className="form-control" value={ip} onChange={e => setIp(e.target.value)} placeholder="IP equipo" required />
            </div>
            <div className="mb-2">
              <select className="form-select" value={credentialId} onChange={e => setCredentialId(e.target.value)} required>
                <option value="">Credencial</option>
                {credentials.map(c => (
                  <option key={c.id} value={c.id}>{c.username}</option>
                ))}
              </select>
            </div>
            <div className="mb-2">
              <select className="form-select" value={siteId} onChange={e => setSiteId(e.target.value)}>
                <option value="">Sitio</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div className="mb-2">
              <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                <option value="Cisco">Cisco</option>
                <option value="Mikrotik">Mikrotik</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit">Guardar</button>
          </form>
        </div>
      </div>
      <div className="modal fade" id="messageModal" tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-body">{message}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.token || '';
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    return { props: { role: payload.role } };
  } catch {
    return { redirect: { destination: '/', permanent: false } };
  }
};
