import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

interface User {
  id: number;
  username: string;
  role: string;
}

export default function Users({ role }: { role: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState('OPERATOR');

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role: userRole }),
    });
    setUsername('');
    setPassword('');
    setUserRole('OPERATOR');
    fetchUsers();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    fetchUsers();
  };

  const handleEdit = async (u: User) => {
    const newUsername = prompt('Nuevo usuario', u.username) || u.username;
    const newPassword = prompt('Nueva contraseña (dejar vacío para mantener)', '');
    const newRole = prompt('Rol (ADMIN u OPERATOR)', u.role) || u.role;
    await fetch(`/api/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
    });
    fetchUsers();
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Usuarios</h2>
        <form className="mb-3" onSubmit={handleAdd}>
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
              type="password"
              className="form-control"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña"
              required
            />
          </div>
          <div className="mb-2">
            <select
              className="form-select"
              value={userRole}
              onChange={e => setUserRole(e.target.value)}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="OPERATOR">OPERATOR</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit">
            Agregar
          </button>
        </form>
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td>
                  <button
                    className="btn btn-sm btn-secondary me-2"
                    onClick={() => handleEdit(u)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(u.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
