import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';

interface Equipment {
  id: number;
  chassis: string;
}

interface GoldenImage {
  id: number;
  model: string;
  version: string;
  filename: string;
  count: number;
}

export default function Golden({ role }: { role: string }) {
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

  const handleDelete = async (id: number) => {
    await fetch('/api/golden', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Golden Images</h2>
        <div className="d-flex flex-wrap gap-2 mb-3">
          {models.map(m => {
            const existing = golden.find(g => g.model === m);
            return (
              <div key={m}>
                <span className="me-2">{m}</span>
                {!existing ? (
                  <button
                    className="btn btn-sm btn-secondary"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#uploadGolden"
                    onClick={() => {
                      setCurrentModel(m);
                      setVersion('');
                    }}
                  >
                    Agregar golden image
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-sm btn-secondary me-2"
                      data-bs-toggle="offcanvas"
                      data-bs-target="#uploadGolden"
                      onClick={() => {
                        setCurrentModel(m);
                        setVersion(existing.version || '');
                      }}
                    >
                      Actualizar golden image
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(existing.id)}>
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="card-body">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>Equipos</th>
                  <th>Versión</th>
                  <th>Archivo</th>
                </tr>
              </thead>
              <tbody>
                {golden.map(g => (
                  <tr key={g.id}>
                    <td>{g.model}</td>
                    <td>{g.count}</td>
                    <td>{g.version}</td>
                    <td>{g.filename}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

