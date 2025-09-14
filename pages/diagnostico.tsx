import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

interface Equipment { id: number; hostname: string }

export default function Diagnostico({ role }: { role: string }) {
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [equipmentId, setEquipmentId] = useState('');
  const [action, setAction] = useState('port');
  const [output, setOutput] = useState('');

  useEffect(() => {
    fetch('/api/equipos')
      .then(r => r.json())
      .then(setEquipos);
  }, []);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/diagnostic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipmentId, action }),
    });
    const data = await res.json();
    setOutput(data.output || data.message);
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Diagnóstico</h2>
        <form onSubmit={handleRun} className="mb-3">
          <div className="row g-2 align-items-end">
            <div className="col">
              <select className="form-select" value={equipmentId} onChange={e => setEquipmentId(e.target.value)} required>
                <option value="">Seleccione equipo</option>
                {equipos.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.hostname}
                  </option>
                ))}
              </select>
            </div>
            <div className="col">
              <select className="form-select" value={action} onChange={e => setAction(e.target.value)}>
                <option value="port">Estado de puertos</option>
                <option value="communication">Ver comunicación</option>
                <option value="cpu">Ver CPU</option>
                <option value="memory">Ver memoria</option>
                <option value="logs">Ver logs</option>
              </select>
            </div>
            <div className="col-auto">
              <button className="btn btn-primary" type="submit">
                Ejecutar
              </button>
            </div>
          </div>
        </form>
        <pre className="bg-light p-3" style={{ whiteSpace: 'pre-wrap' }}>{output}</pre>
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
