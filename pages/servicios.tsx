import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';

interface Client { id: number; name: string }
interface Equipment {
  id: number;
  hostname: string;
  networkRole?: string;
}

interface Port {
  id: number;
  physicalName: string;
  description: string;
  status: string;
}
interface Service {
  id: number;
  type: string;
  client: Client;
  equipment?: Equipment;
  port?: string;
  deviceModel?: string;
  locationDescription: string;
  serviceIdentifier: string;
}

const managedDevices = [
  'hAP lite (RB941-2nD)',
  'hAP ac²',
  'hAP ac³',
  'RB750Gr3 (hEX)',
  'RB760iGS (hEX S)',
  'hAP ax²',
  'CSS106-5G-1S',
  'CRS106-1C-5S',
  'CRS112-8P-4S-IN',
  'CRS305-1G-4S+IN',
  'CRS328-4C-20S-4S+RM',
];

export default function Servicios({ role }: { role: string }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [portsLoading, setPortsLoading] = useState(false);
  const [portError, setPortError] = useState('');
  const [form, setForm] = useState({
    clientId: '',
    type: 'CAPA2',
    equipmentId: '',
    portId: '',
    deviceModel: '',
    serviceIdentifier: '',
    locationDescription: '',
  });
  const [search, setSearch] = useState('');

  const fetchAll = async () => {
    const [cl, eq, sv] = await Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/equipos').then(r => r.json()),
      fetch('/api/services').then(r => r.json()),
    ]);
    setClients(cl);
    setEquipos(eq);
    setServices(sv);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const loadPorts = async (equipmentId: string) => {
    if (!equipmentId) {
      setPorts([]);
      setPortError('');
      return;
    }
    setPortsLoading(true);
    setPortError('');
    try {
      const res = await fetch(`/api/ports/${equipmentId}`);
      if (!res.ok) {
        const msg = await res
          .json()
          .catch(() => ({ message: 'Error al cargar puertos del equipo seleccionado' }));
        setPortError(msg.message || 'Error al cargar puertos del equipo seleccionado');
        setPorts([]);
        return;
      }
      const data = await res.json();
      const allowedStatuses = new Set(['puerto libre', 'asignado']);
      const filtered = (data.ports as Port[]).filter(port => {
        const status = port.status?.toLowerCase() || '';
        return allowedStatuses.has(status);
      });
      setPorts(filtered);
    } catch (error) {
      setPortError('No se pudo obtener la lista de puertos.');
      setPorts([]);
    } finally {
      setPortsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      if (name === 'type') {
        return {
          ...prev,
          type: value,
          equipmentId: '',
          portId: '',
          deviceModel: '',
        };
      }
      if (name === 'equipmentId') {
        return {
          ...prev,
          equipmentId: value,
          portId: '',
        };
      }
      return { ...prev, [name]: value };
    });

    if (name === 'type') {
      setPorts([]);
      setPortError('');
    }

    if (name === 'equipmentId') {
      loadPorts(value);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!response.ok) {
      const msg = await response
        .json()
        .catch(() => ({ message: 'No se pudo guardar el servicio.' }));
      alert(msg.message || 'No se pudo guardar el servicio.');
      return;
    }
    setForm({
      clientId: '',
      type: 'CAPA2',
      equipmentId: '',
      portId: '',
      deviceModel: '',
      serviceIdentifier: '',
      locationDescription: '',
    });
    setPorts([]);
    setPortError('');
    fetchAll();
  };

  const additionalNodes = equipos.filter(eq => {
    const normalized = (eq.networkRole || '').toLowerCase();
    return normalized.includes('nodo') && !normalized.includes('cliente');
  });

  const filteredServices = services.filter(service => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const values = [
      service.client?.name || '',
      service.type || '',
      service.port || '',
      service.deviceModel || '',
      service.locationDescription || '',
      service.serviceIdentifier || '',
      service.equipment?.hostname || '',
      String(service.id),
    ];
    return values.some(value => value.toLowerCase().includes(term));
  });

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Servicios</h2>
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <SearchBar value={search} onChange={setSearch} />
          <button className="btn btn-primary" data-bs-toggle="offcanvas" data-bs-target="#addService">
            Agregar servicio
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID Servicio</th>
              <th>Cliente</th>
              <th>Descripción ubicación</th>
              <th>Tipo</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map(s => {
              const detalle =
                s.type === 'CAPA2'
                  ? `${s.equipment?.hostname || ''} ${s.port ? `- ${s.port}` : ''}`.trim()
                  : [
                      s.deviceModel,
                      s.equipment ? `Nodo: ${s.equipment.hostname}` : '',
                      s.port ? `Puerto: ${s.port}` : '',
                    ]
                      .filter(Boolean)
                      .join(' | ');

              return (
                <tr key={s.id}>
                  <td>{s.serviceIdentifier}</td>
                  <td>{s.client.name}</td>
                  <td>{s.locationDescription}</td>
                  <td>{s.type}</td>
                  <td>{detalle}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="offcanvas offcanvas-end" tabIndex={-1} id="addService">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Nuevo servicio</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <form onSubmit={handleAdd}>
            <div className="mb-2">
              <select className="form-select" name="clientId" value={form.clientId} onChange={handleChange} required>
                <option value="">Seleccione cliente</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-2">
              <select className="form-select" name="type" value={form.type} onChange={handleChange}>
                <option value="CAPA2">Servicio Capa 2</option>
                <option value="GESTIONADO">Servicio Gestionado</option>
              </select>
            </div>
            <div className="mb-2">
              <input
                className="form-control"
                name="serviceIdentifier"
                value={form.serviceIdentifier}
                onChange={handleChange}
                placeholder="ID de servicio"
                required
              />
            </div>
            <div className="mb-3">
              <input
                className="form-control"
                name="locationDescription"
                value={form.locationDescription}
                onChange={handleChange}
                placeholder="Descripción ubicación del servicio"
                required
              />
            </div>
            {form.type === 'CAPA2' && (
              <>
                <div className="mb-2">
                  <select
                    className="form-select"
                    name="equipmentId"
                    value={form.equipmentId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccione equipo</option>
                    {additionalNodes.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.hostname}
                      </option>
                    ))}
                  </select>
                  {!additionalNodes.length && (
                    <div className="text-warning small mt-1">
                      No hay equipos con rol de nodo adicional disponibles.
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  <select
                    className="form-select"
                    name="portId"
                    value={form.portId}
                    onChange={handleChange}
                    disabled={!form.equipmentId || portsLoading || !ports.length}
                    required
                  >
                    <option value="">Seleccione puerto</option>
                    {ports.map(port => (
                      <option key={port.id} value={port.id}>
                        {port.physicalName} ({port.status})
                      </option>
                    ))}
                  </select>
                  {portsLoading && <div className="form-text">Cargando puertos disponibles...</div>}
                  {portError && <div className="text-danger small">{portError}</div>}
                  {!portsLoading && !portError && form.equipmentId && !ports.length && (
                    <div className="text-warning small">No hay puertos disponibles para asignar.</div>
                  )}
                </div>
              </>
            )}
            {form.type === 'GESTIONADO' && (
              <>
                <div className="mb-2">
                  <select className="form-select" name="deviceModel" value={form.deviceModel} onChange={handleChange} required>
                    <option value="">Seleccione modelo</option>
                    {managedDevices.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <select
                    className="form-select"
                    name="equipmentId"
                    value={form.equipmentId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccione nodo</option>
                    {additionalNodes.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.hostname}
                      </option>
                    ))}
                  </select>
                  {!additionalNodes.length && (
                    <div className="text-warning small mt-1">
                      No hay nodos disponibles para asignar.
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  <select
                    className="form-select"
                    name="portId"
                    value={form.portId}
                    onChange={handleChange}
                    disabled={!form.equipmentId || portsLoading || !ports.length}
                    required
                  >
                    <option value="">Seleccione puerto</option>
                    {ports.map(port => (
                      <option key={port.id} value={port.id}>
                        {port.physicalName} ({port.status})
                      </option>
                    ))}
                  </select>
                  {portsLoading && <div className="form-text">Cargando puertos disponibles...</div>}
                  {portError && <div className="text-danger small">{portError}</div>}
                  {!portsLoading && !portError && form.equipmentId && !ports.length && (
                    <div className="text-warning small">No hay puertos disponibles para asignar.</div>
                  )}
                </div>
              </>
            )}
            <button className="btn btn-primary" type="submit">
              Guardar
            </button>
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

