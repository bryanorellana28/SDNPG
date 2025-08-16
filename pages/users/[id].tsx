import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';

interface UserForm {
  username: string;
  password: string;
  role: string;
}

export default function EditUser({ role }: { role: string }) {
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState<UserForm>({ username: '', password: '', role: 'OPERATOR' });

  useEffect(() => {
    if (id) {
      fetch(`/api/users/${id}`).then(r => r.json()).then(u => setForm({ username: u.username, password: '', role: u.role }));
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    router.push('/users');
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Editar Usuario</h2>
        <form onSubmit={handleSubmit} className="mb-3">
          <input className="form-control mb-2" name="username" value={form.username} onChange={handleChange} placeholder="Usuario" required />
          <input className="form-control mb-2" type="password" name="password" value={form.password} onChange={handleChange} placeholder="Contraseña (opcional)" />
          <select className="form-select mb-2" name="role" value={form.role} onChange={handleChange}>
            <option value="ADMIN">ADMIN</option>
            <option value="OPERATOR">OPERATOR</option>
          </select>
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
    if (payload.role !== 'ADMIN') {
      return { redirect: { destination: '/dashboard', permanent: false } };
    }
    return { props: { role: payload.role } };
  } catch {
    return { redirect: { destination: '/', permanent: false } };
  }
};
