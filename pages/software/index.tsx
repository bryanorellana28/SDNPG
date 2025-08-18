import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import SearchBar from '../../components/SearchBar';

interface Equipment {
  id: number;
  hostname: string;
  ip: string;
  chassis: string;
  serial: string;
  version: string;
  type: string;
}

interface GoldenImage {
  id: number;
  model: string;
  version: string;
  filename: string;
}

export default function Software({ role }: { role: string }) {
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [golden, setGolden] = useState<GoldenImage[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [version, setVersion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    const eq = await fetch('/api/equipos').then(r => r.json());
    const gi = await fetch('/api/golden').then(r => r.json());
    setEquipos(eq);
    setGolden(gi);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const models = Array.from(new Set(equipos.map(e => e.chassis)));
  const goldenMap: Record<string, GoldenImage> = {};
  golden.forEach(g => (goldenMap[g.model] = g));

  const filtered = equipos.filter(e =>
    Object.values(e).some(v => v && v.toString().toLowerCase().includes(search.toLowerCase()))
  );
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const buf = await file.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    await fetch('/api/golden', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: currentModel, version, filename: file.name, file: base64 }),
    });
    setVersion('');
    setFile(null);
    fetchData();
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleId) return;
    const model = equipos.find(eq => eq.id === scheduleId)?.chassis || '';
    const g = goldenMap[model];
    if (!g) return;
    await fetch('/api/golden/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: scheduleId, goldenImageId: g.id, date: scheduleDate }),
    });
    fetchData();
    setScheduleId(null);
    setScheduleDate('');
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Software de equipos</h2>
        <div className="d-flex flex-wrap gap-2 mb-3">
          {models.map(m => (
            <div key={m}>
              <span className="me-2">{m}</span>
              <button
                className="btn btn-sm btn-secondary"
                data-bs-toggle="offcanvas"
                data-bs-target="#uploadGolden"
                onClick={() => setCurrentModel(m)}
              >
                Subir golden imagen
              </button>
            </div>
          ))}
        </div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Golden</th>
              <th>Equipo</th>
              <th>Versión actual</th>
              <th>Estado de versión</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => {
              const g = goldenMap[e.chassis];
              const match = g && e.version === g.version;
              return (
                <tr key={e.id}>
                  <td>{e.chassis}</td>
                  <td>{g?.version || '-'}</td>
                  <td>{e.hostname}</td>
                  <td>{e.version}</td>
                  <td>
                    {match ? (
                      '✅'
                    ) : (
                      <button
                        className="btn btn-sm btn-warning"
                        data-bs-toggle="offcanvas"
                        data-bs-target="#scheduleJob"
                        onClick={() => setScheduleId(e.id)}
                      >
                        Calendarizar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="offcanvas offcanvas-end" tabIndex={-1} id="uploadGolden">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Subir Golden - {currentModel}</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleUpload}>
            <div className="mb-2">
              <input
                className="form-control"
                value={version}
                onChange={e => setVersion(e.target.value)}
                placeholder="Versión"
                required
              />
            </div>
            <div className="mb-2">
              <input className="form-control" type="file" onChange={e => setFile(e.target.files?.[0] || null)} required />
            </div>
            <button className="btn btn-primary" type="submit">Guardar</button>
          </form>
        </div>
      </div>
      <div className="offcanvas offcanvas-end" tabIndex={-1} id="scheduleJob">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Calendarizar</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleSchedule}>
            <div className="mb-2">
              <input
                type="date"
                className="form-control"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit">Guardar</button>
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
