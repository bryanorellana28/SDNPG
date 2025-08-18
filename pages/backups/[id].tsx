import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { Modal } from 'bootstrap';
import Sidebar from '../../components/Sidebar';

interface Backup {
  id: number;
  exportPath: string;
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
  const [config1, setConfig1] = useState('');
  const [config2, setConfig2] = useState('');
  const modalRef = useRef<Modal | null>(null);

  const fetchBackups = () => {
    if (!id) return;
    fetch(`/api/backup/${id}`).then(res => res.json()).then(setBackups);
  };

  useEffect(() => {
    if (!id) return;
    fetchBackups();
    fetch(`/api/equipos/${id}`).then(res => res.json()).then(setEquip);
  }, [id]);

  useEffect(() => {
    modalRef.current = new Modal(document.getElementById('compareModal')!);
  }, []);

  const handleRun = async () => {
    await fetch('/api/backup/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: Number(id) }),
    });
    fetchBackups();
  };

  const handleCompare = () => {
    if (!config1 || !config2) return;
    modalRef.current?.hide();
    window.open(`/api/backup/diff?id1=${config1}&id2=${config2}`, '_blank');
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <button className="btn btn-secondary mb-3" onClick={() => router.back()}>Regresar</button>
        <h3>Backups del equipo {equip ? `${equip.hostname} (${equip.ip})` : id}</h3>
        <button className="btn btn-primary mb-3" onClick={handleRun}>Ejecutar Backup</button>
        <button
          className="btn btn-secondary mb-3 ms-2"
          data-bs-toggle="modal"
          data-bs-target="#compareModal"
        >
          Ver diferencias
        </button>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Configuración</th>
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
                <td>{new Date(b.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="modal fade" id="compareModal" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Comparar configuraciones</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <select className="form-select" value={config1} onChange={e => setConfig1(e.target.value)}>
                    <option value="">Configuración 1</option>
                    {backups.map(b => (
                      <option key={b.id} value={b.id}>{b.id}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <select className="form-select" value={config2} onChange={e => setConfig2(e.target.value)}>
                    <option value="">Configuración 2</option>
                    {backups.map(b => (
                      <option key={b.id} value={b.id}>{b.id}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                  Cerrar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleCompare}>
                  Comparar
                </button>
              </div>
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
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
};
