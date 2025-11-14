import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import SearchBar from '../../components/SearchBar';

interface Entry {
  id: number;
  username: string;
  password: string;
  description: string;
}

export default function Passwords({ role }: { role: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');

  const fetchEntries = async () => {
    const res = await fetch('/api/passwords');
    const data = await res.json();
    setEntries(data);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/passwords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, description }),
    });
    setUsername('');
    setPassword('');
    setDescription('');
    fetchEntries();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/passwords/${id}`, { method: 'DELETE' });
    fetchEntries();
  };

  const handleEdit = (e: Entry) => {
    window.location.href = `/passwords/${e.id}`;
  };

  const filtered = entries.filter(e =>
    Object.values(e).some(v => v.toString().toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Contraseñas</h2>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <SearchBar value={search} onChange={setSearch} />
          <button className="btn btn-primary" data-bs-toggle="offcanvas" data-bs-target="#addPass">
            Agregar
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Contraseña</th>
              <th>Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td>{e.username}</td>
                <td>*****</td>
                <td>{e.description}</td>
                <td>
                  <button className="btn btn-sm btn-secondary me-2" onClick={() => handleEdit(e)}>
                    Editar
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(e.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="offcanvas offcanvas-end" tabIndex={-1} id="addPass">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Agregar Contraseña</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleAdd}>
            <div className="mb-2">
              <input
                className="form-control"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Usuario"
                required
              />
            </div>
            <div className="mb-2">
              <input
                className="form-control"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
              />
            </div>
            <div className="mb-2">
              <input
                className="form-control"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descripción"
                required
              />
            </div>
            <button className="btn btn-primary" type="submit">
              Guardar
            </button>
          </form>
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
    if (payload.role !== 'ADMIN') {
      return { redirect: { destination: '/dashboard', permanent: false } };
    }
    return { props: { role: payload.role } };
  } catch {
    return {
      redirect: { destination: '/', permanent: false },
    };
  }
};
