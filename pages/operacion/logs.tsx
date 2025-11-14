import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Popup from '../../components/Popup';

interface Equipment {
  id: number;
  hostname: string;
  type: string;
  networkRole?: string | null;
}

export default function OperationLogs({ role }: { role: string }) {
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [popup, setPopup] = useState<{
    message: string;
    variant: 'success' | 'danger' | 'warning' | 'info';
    title?: string;
  } | null>(null);

  useEffect(() => {
    const loadEquipos = async () => {
      const res = await fetch('/api/equipos');
      if (!res.ok) {
        setPopup({
          variant: 'danger',
          message: 'No se pudo cargar la lista de equipos.',
          title: 'Error de datos',
        });
        return;
      }
      const data: Equipment[] = await res.json();
      setEquipos(data);
    };
    loadEquipos();
  }, []);

  const mikrotikNodes = useMemo(
    () =>
      equipos
        .filter((eq) => eq.type === 'Mikrotik')
        .sort((a, b) => a.hostname.localeCompare(b.hostname, 'es', { sensitivity: 'base' })),
    [equipos]
  );

  const handleFetchLogs = async () => {
    if (!selectedEquipment) {
      setPopup({
        variant: 'warning',
        message: 'Seleccione un equipo para consultar sus logs.',
        title: 'Datos requeridos',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/operation/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentId: Number(selectedEquipment), search }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'No se pudieron obtener los logs.');
      }
      setLogs((data.entries as string[]) || []);
      setLastUpdated(new Date());
      if (!data.entries || data.entries.length === 0) {
        setPopup({
          variant: 'info',
          message: 'El equipo no devolvió registros que coincidan con el filtro indicado.',
          title: 'Sin registros',
        });
      }
    } catch (error: any) {
      setLogs([]);
      setPopup({
        variant: 'danger',
        message: error?.message || 'No se pudieron obtener los logs del equipo.',
        title: 'Error en consulta',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4">
          <div>
            <h2 className="mb-1">Logs del equipo</h2>
            <p className="text-muted mb-0">
              Consulta los registros más recientes disponibles desde RouterOS con filtros opcionales por texto.
            </p>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-12 col-lg-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <h5 className="card-title">Selecciona el origen</h5>
                <p className="text-muted small">Solo se listan equipos Mikrotik disponibles en inventario.</p>
                <label className="form-label">Equipo</label>
                <select
                  className="form-select mb-3"
                  value={selectedEquipment}
                  onChange={(e) => {
                    setSelectedEquipment(e.target.value);
                    setLogs([]);
                    setLastUpdated(null);
                  }}
                >
                  <option value="">Selecciona un equipo</option>
                  {mikrotikNodes.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.hostname}
                    </option>
                  ))}
                </select>

                <label className="form-label">Filtro por texto</label>
                <input
                  type="text"
                  className="form-control mb-3"
                  value={search}
                  placeholder="Ejemplo: error"
                  onChange={(e) => setSearch(e.target.value)}
                />

                <button className="btn btn-primary w-100" onClick={handleFetchLogs} disabled={loading}>
                  {loading ? 'Consultando...' : 'Consultar logs'}
                </button>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-8">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body d-flex flex-column" style={{ minHeight: '420px' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Registros del sistema</h5>
                  {lastUpdated && (
                    <span className="text-muted small">Última actualización: {lastUpdated.toLocaleString()}</span>
                  )}
                </div>
                <div className="bg-light rounded-3 p-3 flex-grow-1 overflow-auto" style={{ maxHeight: '320px' }}>
                  {logs.length > 0 ? (
                    <ul className="list-unstyled mb-0 small">
                      {logs.map((line, index) => (
                        <li key={`${line}-${index}`} className="mb-2">
                          <code className="text-dark">{line}</code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-muted text-center py-5">
                      {loading ? 'Cargando registros...' : 'No hay registros para mostrar.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Popup
        show={!!popup}
        onClose={() => setPopup(null)}
        message={popup?.message || ''}
        title={popup?.title}
        variant={popup?.variant || 'info'}
      />
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
