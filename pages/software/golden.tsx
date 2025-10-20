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
  const [manageModel, setManageModel] = useState<string | null>(null);

  const fetchData = async () => {
    const eq = await fetch('/api/equipos').then(r => r.json());
    const gi = await fetch('/api/golden').then(r => r.json());
    setEquipos(eq);
    setGolden(gi);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const models = Array.from(
    new Set([
      ...equipos.map(e => e.chassis).filter(Boolean),
      ...golden.map(g => g.model),
    ])
  )
    .filter((model): model is string => Boolean(model))
    .sort((a, b) => a.localeCompare(b));
  const managedImages = manageModel ? golden.filter(g => g.model === manageModel) : [];

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
        <div className="card">
          <div className="card-body">
            <table className="table table-striped align-middle">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {models.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      No hay modelos disponibles para gestionar.
                    </td>
                  </tr>
                )}
                {models.map(model => {
                  const existing = golden.filter(g => g.model === model);
                  const current = existing[0];
                  return (
                    <tr key={model}>
                      <td>{model}</td>
                      <td>
                        {current ? (
                          <div>
                            <div className="fw-semibold">Versión: {current.version || 'N/D'}</div>
                            <small className="text-muted d-block">Archivo: {current.filename}</small>
                            <small className="text-muted">Equipos asociados: {current.count}</small>
                          </div>
                        ) : (
                          <span className="text-muted">Sin golden image registrada</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary me-2"
                          data-bs-toggle="offcanvas"
                          data-bs-target="#uploadGolden"
                          onClick={() => {
                            setCurrentModel(model);
                            setVersion(current?.version || '');
                            setFile(null);
                          }}
                        >
                          Agregar golden image
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          data-bs-toggle="offcanvas"
                          data-bs-target="#manageGolden"
                          onClick={() => setManageModel(model)}
                        >
                          Gestionar golden image
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

      <div className="offcanvas offcanvas-end" tabIndex={-1} id="manageGolden">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Gestionar Golden - {manageModel}</h5>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
            onClick={() => setManageModel(null)}
          ></button>
        </div>
        <div className="offcanvas-body">
          {manageModel ? (
            managedImages.length ? (
              <ul className="list-group">
                {managedImages.map(img => (
                  <li key={img.id} className="list-group-item d-flex justify-content-between align-items-start">
                    <div>
                      <div className="fw-semibold">{img.filename}</div>
                      <small className="text-muted d-block">Versión: {img.version || 'N/D'}</small>
                      <small className="text-muted">SHA256: {img.sha256.slice(0, 12)}...</small>
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(img.id)}>
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mb-0">No hay golden images registradas para este modelo.</p>
            )
          ) : (
            <p className="text-muted mb-0">Selecciona un modelo para gestionar sus golden images.</p>
          )}
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

