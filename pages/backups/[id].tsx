import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';

interface Backup {
  id: number;
  exportPath: string;
  diffPath?: string | null;
  createdAt: string;
}

interface Equipment {
  hostname: string;
  ip: string;
}

export default function DeviceBackups({ role }: { role: string }) {
  const router = useRouter();
  const { id } = router.query;
  const [backups, setBackups] = useState<Backup[]>([]);
  const [equip, setEquip] = useState<Equipment | null>(null);

  const fetchBackups = () => {
    if (!id) return;
    fetch(`/api/backup/${id}`).then(res => res.json()).then(setBackups);
  };

  useEffect(() => {
    if (!id) return;
    fetchBackups();
    fetch(`/api/equipos/${id}`).then(res => res.json()).then(setEquip);
  }, [id]);

  const handleRun = async () => {
    await fetch('/api/backup/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: Number(id) }),
    });
    fetchBackups();
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <button className="btn btn-secondary mb-3" onClick={() => router.back()}>Regresar</button>
        <h3>Backups del equipo {equip ? `${equip.hostname} (${equip.ip})` : id}</h3>
        <button className="btn btn-primary mb-3" onClick={handleRun}>Ejecutar Backup</button>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Configuración</th>
              <th>Diff</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>
                  <a
                    href={`/api/backup/config?path=${encodeURIComponent(b.exportPath)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver configuración
                  </a>
                </td>
                <td>
                  {b.diffPath ? (
                    <a
                      href={`/api/backup/diff?path=${encodeURIComponent(b.diffPath)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver diferencias
                    </a>
                  ) : (
                    ''
                  )}
                </td>
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
