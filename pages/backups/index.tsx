import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';

interface Backup {
  id: number;
  deviceId: number;
  exportPath: string;
  binaryPath: string;
  diffPath?: string | null;
  createdAt: string;
}

export default function Backups({ role }: { role: string }) {
  const [backups, setBackups] = useState<Backup[]>([]);

  useEffect(() => {
    fetch('/api/backup').then(res => res.json()).then(setBackups);
  }, []);

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Backups</h2>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Device</th>
              <th>Export</th>
              <th>Binary</th>
              <th>Diff</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{b.deviceId}</td>
                <td>{b.exportPath}</td>
                <td>{b.binaryPath}</td>
                <td>{b.diffPath || ''}</td>
                <td>{new Date(b.createdAt).toLocaleString()}</td>
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
