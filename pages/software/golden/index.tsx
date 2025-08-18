import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState } from 'react';
import Sidebar from '../../../components/Sidebar';

interface Equipment {
  id: number;
  chassis: string;
}

interface GoldenImage {
  id: number;
  model: string;
  version: string;
  filename: string;
}

export default function GoldenImages({ role }: { role: string }) {
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [golden, setGolden] = useState<GoldenImage[]>([]);
  const [currentModel, setCurrentModel] = useState('');
  const [version, setVersion] = useState('');
  const [file, setFile] = useState<File | null>(null);

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

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Golden Images</h2>
        <div className="d-flex flex-wrap gap-2">
          {models.map(m => (
            <div key={m} className="mb-2">
              <span className="me-2">{m} - {goldenMap[m]?.version || '-'}</span>
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
