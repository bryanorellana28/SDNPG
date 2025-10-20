import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

interface Client {
  id: number;
  name: string;
  nit?: string | null;
  contact?: string | null;
  phone?: string | null;
}

export default function Clientes({ role }: { role: string }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({ name: '', nit: '', contact: '', phone: '' });

  const fetchClients = async () => {
    const res = await fetch('/api/clients');
    const data = await res.json();
    setClients(data);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ name: '', nit: '', contact: '', phone: '' });
    fetchClients();
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Clientes</h2>
        <button className="btn btn-primary mb-2" data-bs-toggle="offcanvas" data-bs-target="#addClient">
          Agregar cliente
        </button>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>NIT</th>
              <th>Contacto</th>
              <th>Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.nit}</td>
                <td>{c.contact}</td>
                <td>{c.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="offcanvas offcanvas-end" tabIndex={-1} id="addClient">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Nuevo cliente</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleAdd}>
            <div className="mb-2">
              <input
                className="form-control"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nombre"
                required
              />
            </div>
            <div className="mb-2">
              <input
                className="form-control"
                name="nit"
                value={form.nit}
                onChange={handleChange}
                placeholder="NIT"
              />
            </div>
            <div className="mb-2">
              <input
                className="form-control"
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="Nombre contacto"
              />
            </div>
            <div className="mb-2">
              <input
                className="form-control"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Teléfono"
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
    return { props: { role: payload.role } };
  } catch {
    return { redirect: { destination: '/', permanent: false } };
  }
};

