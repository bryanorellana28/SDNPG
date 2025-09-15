import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';

interface Equipment {
  id: number;
  hostname: string;
}

interface PortInventory {
  id: number;
  physicalName: string;
  description: string;
  status: string;
}

interface PortStats {
  total: number;
  inUse: number;
  free: number;
  usagePercent: number;
  freePercent: number;
}

export default function InventarioPuertos({ role }: { role: string }) {
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [ports, setPorts] = useState<PortInventory[]>([]);
  const [stats, setStats] = useState<PortStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/equipos')
      .then(r => r.json())
      .then((data: Equipment[]) => setEquipos(data.map(({ id, hostname }) => ({ id, hostname }))))
      .catch(() => setEquipos([]));
  }, []);

  useEffect(() => {
    if (!selectedEquipment) {
      setPorts([]);
      setStats(null);
      setError('');
      return;
    }
    const controller = new AbortController();
    const loadPorts = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/ports/${selectedEquipment}`, { signal: controller.signal });
        if (!res.ok) {
          const msg = await res.json().catch(() => ({ message: 'Error al cargar inventario de puertos' }));
          setError(msg.message || 'Error al cargar inventario de puertos');
          setPorts([]);
          setStats(null);
        } else {
          const data = await res.json();
          setPorts(data.ports || []);
          setStats(data.stats || null);
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError('No se pudo obtener el inventario de puertos.');
        }
        setPorts([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    loadPorts();
    return () => controller.abort();
  }, [selectedEquipment]);

  const equipmentName = useMemo(() => {
    const eq = equipos.find(e => e.id.toString() === selectedEquipment);
    return eq?.hostname || '';
  }, [equipos, selectedEquipment]);

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Inventario de puertos</h2>
        <div className="row g-3 align-items-end mb-4">
          <div className="col-md-6">
            <label className="form-label" htmlFor="equipmentSelect">
              Selecciona un equipo
            </label>
            <select
              id="equipmentSelect"
              className="form-select"
              value={selectedEquipment}
              onChange={e => setSelectedEquipment(e.target.value)}
            >
              <option value="">Seleccione equipo</option>
              {equipos.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.hostname}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedEquipment && stats && (
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card text-bg-primary h-100">
                <div className="card-body">
                  <h5 className="card-title">Puertos totales</h5>
                  <p className="card-text display-6">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-bg-success h-100">
                <div className="card-body">
                  <h5 className="card-title">Puertos libres</h5>
                  <p className="card-text display-6">{stats.free}</p>
                  <p className="card-text mb-0">{stats.freePercent.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-bg-warning h-100">
                <div className="card-body">
                  <h5 className="card-title">Puertos en uso</h5>
                  <p className="card-text display-6">{stats.inUse}</p>
                  <p className="card-text mb-0">{stats.usagePercent.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-bg-secondary h-100">
                <div className="card-body">
                  <h5 className="card-title">Equipo</h5>
                  <p className="card-text fs-5 mb-0">{equipmentName}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && <div className="alert alert-info">Cargando inventario de puertos...</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {!loading && selectedEquipment && ports.length === 0 && !error && (
          <div className="alert alert-warning">No se encontraron puertos para este equipo.</div>
        )}

        {!loading && ports.length > 0 && (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Puerto físico</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ports.map(port => (
                  <tr key={port.id}>
                    <td>{port.physicalName}</td>
                    <td>{port.description}</td>
                    <td>
                      <span
                        className={`badge ${
                          port.status.toLowerCase() === 'puerto libre' ? 'text-bg-success' : 'text-bg-warning'
                        }`}
                      >
                        {port.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
