import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useState } from 'react';
import Sidebar from '../../components/Sidebar';

interface TraceResult {
  equipmentId: number;
  hostname: string;
  ip: string;
  success: boolean;
  output: string;
}

export default function RastreoClientes({ role }: { role: string }) {
  const [mac, setMac] = useState('');
  const [results, setResults] = useState<TraceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [searchedMac, setSearchedMac] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setResults([]);
    setSearchedMac('');

    const requestedMac = mac.trim();
    if (!requestedMac) {
      setError('Indique una dirección MAC para realizar el rastreo.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/operation/client-trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac: requestedMac }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Error al realizar el rastreo.');
        return;
      }
      setResults(data.results || []);
      setSearchedMac(data.mac || requestedMac.toUpperCase());
      if (data.message) {
        setInfo(data.message);
      } else if (!data.results || data.results.length === 0) {
        setInfo('No se encontraron resultados en los nodos consultados.');
      }
    } catch (err) {
      setError('No se pudo completar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Rastreo de clientes</h2>
        <form onSubmit={handleSubmit} className="mb-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-6">
              <label className="form-label" htmlFor="macInput">
                Indicar MAC a buscar en los nodos
              </label>
              <input
                id="macInput"
                className="form-control"
                value={mac}
                onChange={e => setMac(e.target.value)}
                placeholder="Ej. AA:BB:CC:DD:EE:FF"
              />
            </div>
            <div className="col-auto">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>
        </form>
        {loading && <div className="alert alert-info">Consultando nodos...</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {info && !error && <div className="alert alert-info">{info}</div>}
        {searchedMac && results.length > 0 && (
          <p className="text-muted">
            Resultados para: <strong>{searchedMac}</strong>
          </p>
        )}
        {results.map(result => (
          <div className="card mb-3" key={result.equipmentId}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <strong>{result.hostname || 'Nodo sin nombre'}</strong>
                <div className="small text-muted">{result.ip}</div>
              </div>
              <span className={`badge ${result.success ? 'text-bg-success' : 'text-bg-danger'}`}>
                {result.success ? 'Comando ejecutado' : 'Error'}
              </span>
            </div>
            <div className="card-body">
              {result.success ? (
                <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {result.output}
                </pre>
              ) : (
                <p className="mb-0 text-danger">{result.output}</p>
              )}
            </div>
          </div>
        ))}
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

