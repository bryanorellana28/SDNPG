import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Link from 'next/link';

interface Equipment {
  id: number;
  hostname: string;
  ip: string;
}

export default function Backups({ role }: { role: string }) {
  const [equipos, setEquipos] = useState<Equipment[]>([]);

  useEffect(() => {
    fetch('/api/equipos').then(res => res.json()).then(setEquipos);
  }, []);

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Backups</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Hostname</th>
              <th>IP</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {equipos.map(e => (
              <tr key={e.id}>
                <td>{e.hostname}</td>
                <td>{e.ip}</td>
                <td>
                  <Link className="btn btn-sm btn-primary" href={`/backups/${e.id}`}>
                    Backup
                  </Link>
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
    return { props: { role: payload.role } };
  } catch {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
};
