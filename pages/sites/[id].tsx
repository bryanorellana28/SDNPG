import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';

export default function EditSite({ role }: { role: string }) {
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState({ nombre: '', clave: '', ubicacion: '', zona: '' });

  useEffect(() => {
    if (id) {
      fetch(`/api/sites/${id}`).then(r => r.json()).then(setForm);
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/sites/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    router.push('/sites');
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Editar Sitio</h2>
        <form onSubmit={handleSubmit} className="mb-3">
          <input className="form-control mb-2" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" required />
          <input className="form-control mb-2" name="clave" value={form.clave} onChange={handleChange} placeholder="Clave" required />
          <input className="form-control mb-2" name="ubicacion" value={form.ubicacion} onChange={handleChange} placeholder="Ubicación física" required />
          <input className="form-control mb-2" name="zona" value={form.zona} onChange={handleChange} placeholder="Zona" required />
          <button className="btn btn-primary" type="submit">Guardar</button>
        </form>
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
