import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState, useRef } from 'react';
import { Modal } from 'bootstrap';
import Sidebar from '../../components/Sidebar';
import SearchBar from '../../components/SearchBar';

interface Site {
  id: number;
  nombre: string;
  clave: string;
  ubicacion: string;
  zona: string;
  direccion: string;
}

export default function Sites({ role }: { role: string }) {
  const [sites, setSites] = useState<Site[]>([]);
  const [form, setForm] = useState({ nombre: '', clave: '', ubicacion: '', zona: '', direccion: '' });
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const modalRef = useRef<Modal | null>(null);

  const fetchSites = async () => {
    const res = await fetch('/api/sites');
    const data = await res.json();
    setSites(data);
  };

  useEffect(() => {
    fetchSites();
    modalRef.current = new Modal(document.getElementById('messageModal')!);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.status === 201) {
      setMessage('Agregada con éxito');
      setForm({ nombre: '', clave: '', ubicacion: '', zona: '', direccion: '' });
      fetchSites();
    } else if (res.status === 409) {
      setMessage('La dirección ya se encuentra en la base de datos');
    } else {
      setMessage('Error al agregar');
    }
    modalRef.current?.show();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/sites/${id}`, { method: 'DELETE' });
    fetchSites();
  };

  const handleEdit = (s: Site) => {
    window.location.href = `/sites/${s.id}`;
  };

  const filtered = sites.filter(s =>
    Object.values(s).some(v => v.toString().toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Sitios</h2>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <SearchBar value={search} onChange={setSearch} />
          <button className="btn btn-primary" data-bs-toggle="offcanvas" data-bs-target="#addSite">
            Agregar
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Clave</th>
              <th>Ubicación</th>
              <th>Zona</th>
              <th>Dirección</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>{s.nombre}</td>
                <td>{s.clave}</td>
                <td>{s.ubicacion}</td>
                <td>{s.zona}</td>
                <td>{s.direccion}</td>
                <td>
                  <button className="btn btn-sm btn-secondary me-2" onClick={() => handleEdit(s)}>
                    Editar
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="offcanvas offcanvas-end" tabIndex={-1} id="addSite">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Agregar Sitio</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleAdd}>
            <div className="row g-2">
              <div className="col">
                <input className="form-control" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" required />
              </div>
              <div className="col">
                <input className="form-control" name="clave" value={form.clave} onChange={handleChange} placeholder="Clave" required />
              </div>
            </div>
            <div className="row g-2 mt-2">
              <div className="col">
                <input className="form-control" name="ubicacion" value={form.ubicacion} onChange={handleChange} placeholder="Ubicación" required />
              </div>
              <div className="col">
                <input className="form-control" name="zona" value={form.zona} onChange={handleChange} placeholder="Zona" required />
              </div>
            </div>
            <div className="mt-2">
              <input className="form-control" name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección" required />
            </div>
            <button className="btn btn-primary mt-2" type="submit">Agregar</button>
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
