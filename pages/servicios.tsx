import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

interface Client { id: number; name: string }
interface Equipment { id: number; hostname: string }
interface Service {
  id: number;
  type: string;
  client: Client;
  equipment?: Equipment;
  port?: string;
  deviceModel?: string;
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
  const [form, setForm] = useState({ clientId: '', type: 'CAPA2', equipmentId: '', port: '', deviceModel: '' });

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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ clientId: '', type: 'CAPA2', equipmentId: '', port: '', deviceModel: '' });
    fetchAll();
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Servicios</h2>
        <button className="btn btn-primary mb-2" data-bs-toggle="offcanvas" data-bs-target="#addService">
          Agregar servicio
        </button>
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {services.map(s => (
              <tr key={s.id}>
                <td>{s.client.name}</td>
                <td>{s.type}</td>
                <td>
                  {s.type === 'CAPA2'
                    ? `${s.equipment?.hostname || ''} - ${s.port}`
                    : s.deviceModel}
                </td>
              </tr>
            ))}
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
            {form.type === 'CAPA2' && (
              <>
                <div className="mb-2">
                  <select className="form-select" name="equipmentId" value={form.equipmentId} onChange={handleChange} required>
                    <option value="">Seleccione equipo</option>
                    {equipos.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.hostname}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <input
                    className="form-control"
                    name="port"
                    value={form.port}
                    onChange={handleChange}
                    placeholder="Puerto"
                    required
                  />
                </div>
              </>
            )}
            {form.type === 'GESTIONADO' && (
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

