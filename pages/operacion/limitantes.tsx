import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';

interface Equipment {
  id: number;
  hostname: string;
  networkRole?: string;
}

interface Limitante {
  id: number;
  name: string;
  bandwidth: string;
  port: string;
  equipmentId: number;
}

interface Port {
  id: number;
  physicalName: string;
  status: string;
}

const DEFAULT_QUEUE = 'hotspot-default/hotspot-default';

export default function Limitantes({ role }: { role: string }) {
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [limitantes, setLimitantes] = useState<Limitante[]>([]);
  const [loadingLimitantes, setLoadingLimitantes] = useState(false);
  const [limitantesError, setLimitantesError] = useState('');
  const [ports, setPorts] = useState<Port[]>([]);
  const [portsLoading, setPortsLoading] = useState(false);
  const [portsError, setPortsError] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    equipmentId: '',
    name: '',
    bandwidth: '',
    portId: '',
  });

  const nodos = useMemo(() => {
    return equipos.filter(eq => {
      const normalized = (eq.networkRole || '').toLowerCase();
      return normalized.includes('nodo') && !normalized.includes('cliente');
    });
  }, [equipos]);

  useEffect(() => {
    const loadEquipos = async () => {
      const res = await fetch('/api/equipos');
      if (!res.ok) {
        setLimitantesError('No se pudo obtener la lista de equipos.');
        return;
      }
      const data: Equipment[] = await res.json();
      setEquipos(data);
    };
    loadEquipos();
  }, []);

  const loadLimitantes = async (equipmentId: string) => {
    if (!equipmentId) {
      setLimitantes([]);
      return;
    }
    setLoadingLimitantes(true);
    setLimitantesError('');
    try {
      const res = await fetch(`/api/limitantes?equipmentId=${equipmentId}`);
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ message: 'No se pudieron obtener las limitantes.' }));
        setLimitantesError(msg.message || 'No se pudieron obtener las limitantes.');
        setLimitantes([]);
        return;
      }
      const data: Limitante[] = await res.json();
      setLimitantes(data);
    } catch (error) {
      setLimitantesError('No se pudieron obtener las limitantes.');
      setLimitantes([]);
    } finally {
      setLoadingLimitantes(false);
    }
  };

  const loadPorts = async (equipmentId: string) => {
    if (!equipmentId) {
      setPorts([]);
      setPortsError('');
      return;
    }
    setPortsLoading(true);
    setPortsError('');
    try {
      const res = await fetch(`/api/ports/${equipmentId}`);
      if (!res.ok) {
        const msg = await res.json().catch(() => ({ message: 'No se pudieron obtener los puertos.' }));
        setPortsError(msg.message || 'No se pudieron obtener los puertos.');
        setPorts([]);
        return;
      }
      const data = await res.json();
      const available = (data.ports as Port[]) || [];
      setPorts(available);
    } catch (error) {
      setPortsError('No se pudieron obtener los puertos.');
      setPorts([]);
    } finally {
      setPortsLoading(false);
    }
  };

  const handleEquipmentChange = (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    loadLimitantes(equipmentId);
    setForm(prev => ({ ...prev, equipmentId, portId: equipmentId === prev.equipmentId ? prev.portId : '' }));
    if (equipmentId) {
      loadPorts(equipmentId);
    } else {
      setPorts([]);
      setPortsError('');
    }
  };

  const handleFormChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      if (name === 'equipmentId') {
        loadPorts(value);
        return { equipmentId: value, name: '', bandwidth: '', portId: '' };
      }
      return { ...prev, [name]: value };
    });
    setFormError('');
    setFormSuccess('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!form.equipmentId || !form.name || !form.bandwidth || !form.portId) {
      setFormError('Complete todos los campos para crear la limitante.');
      return;
    }

    const selectedPort = ports.find(p => String(p.id) === form.portId);
    if (!selectedPort) {
      setFormError('Seleccione un puerto válido.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/limitantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: form.equipmentId,
          name: form.name,
          bandwidth: form.bandwidth,
          port: selectedPort.physicalName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message || 'No se pudo crear la limitante.');
        return;
      }

      setFormSuccess('Limitante creada correctamente.');
      setForm({ equipmentId: form.equipmentId, name: '', bandwidth: '', portId: '' });
      loadLimitantes(form.equipmentId);
      if (!selectedEquipment) {
        setSelectedEquipment(form.equipmentId);
      }
    } catch (error) {
      setFormError('No se pudo crear la limitante.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (selectedEquipment) {
      loadPorts(selectedEquipment);
    }
  }, [selectedEquipment]);

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Limitantes</h2>
        <div className="mb-3">
          <label className="form-label" htmlFor="equipmentFilter">
            Seleccione un nodo
          </label>
          <select
            id="equipmentFilter"
            className="form-select"
            value={selectedEquipment}
            onChange={e => handleEquipmentChange(e.target.value)}
          >
            <option value="">Seleccione nodo</option>
            {nodos.map(eq => (
              <option key={eq.id} value={eq.id}>
                {eq.hostname}
              </option>
            ))}
          </select>
          {!nodos.length && <div className="form-text">No hay nodos disponibles.</div>}
        </div>

        <button
          className="btn btn-primary mb-3"
          data-bs-toggle="offcanvas"
          data-bs-target="#addLimitante"
          onClick={() => {
            const equipmentId = selectedEquipment || (nodos[0] ? String(nodos[0].id) : '');
            setForm({ equipmentId, name: '', bandwidth: '', portId: '' });
            setPortsError('');
            if (equipmentId) {
              loadPorts(equipmentId);
            } else {
              setPorts([]);
            }
          }}
          disabled={!nodos.length}
        >
          Añadir nueva limitante
        </button>

        {loadingLimitantes && <div className="alert alert-info">Cargando limitantes...</div>}
        {limitantesError && <div className="alert alert-danger">{limitantesError}</div>}

        {!loadingLimitantes && !limitantesError && selectedEquipment && limitantes.length === 0 && (
          <div className="alert alert-warning">No se registran limitantes para este equipo.</div>
        )}

        {!loadingLimitantes && !limitantesError && limitantes.length > 0 && (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ancho de banda</th>
                  <th>Puerto</th>
                </tr>
              </thead>
              <tbody>
                {limitantes.map(limitante => (
                  <tr key={limitante.id}>
                    <td>{limitante.name}</td>
                    <td>{limitante.bandwidth}</td>
                    <td>{limitante.port}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="offcanvas offcanvas-end" tabIndex={-1} id="addLimitante" aria-labelledby="addLimitanteLabel">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="addLimitanteLabel">
            Nueva limitante
          </h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          <p className="text-muted">
            Se ejecutará el comando{' '}
            <code>/queue simple add</code> con <code>queue={DEFAULT_QUEUE}</code>.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="formEquipment">
                Equipo
              </label>
              <select
                id="formEquipment"
                className="form-select"
                name="equipmentId"
                value={form.equipmentId}
                onChange={handleFormChange}
                required
              >
                <option value="">Seleccione nodo</option>
                {nodos.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.hostname}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="formName">
                Nombre de la limitante
              </label>
              <input
                id="formName"
                className="form-control"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="Ej. LIMITANTE-50MBPS-CLIENTE"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="formBandwidth">
                Ancho de banda (max-limit)
              </label>
              <input
                id="formBandwidth"
                className="form-control"
                name="bandwidth"
                value={form.bandwidth}
                onChange={handleFormChange}
                placeholder="Ej. 51200k/51200k"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="formPort">
                Puerto (target)
              </label>
              <select
                id="formPort"
                className="form-select"
                name="portId"
                value={form.portId}
                onChange={handleFormChange}
                disabled={!form.equipmentId || portsLoading || ports.length === 0}
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
              {portsError && <div className="text-danger small">{portsError}</div>}
            </div>

            {formError && <div className="alert alert-danger">{formError}</div>}
            {formSuccess && <div className="alert alert-success">{formSuccess}</div>}

            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Creando...' : 'Crear limitante'}
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
