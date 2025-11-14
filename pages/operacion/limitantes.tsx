import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Popup from '../../components/Popup';

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
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState<{
    message: string;
    variant: 'success' | 'danger' | 'warning' | 'info';
    title?: string;
  } | null>(null);
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
      const payload = await res.json();
      if (!res.ok) {
        setLimitantesError(payload.message || 'No se pudieron obtener las limitantes.');
        setLimitantes([]);
        return;
      }
      setLimitantes(payload as Limitante[]);
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
      const data = await res.json();
      if (!res.ok) {
        setPortsError(data.message || 'No se pudieron obtener los puertos.');
        setPorts([]);
        return;
      }
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
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.equipmentId || !form.name || !form.bandwidth || !form.portId) {
      setPopup({
        variant: 'warning',
        message: 'Complete todos los campos para crear la limitante.',
        title: 'Información incompleta',
      });
      return;
    }

    const selectedPort = ports.find(p => String(p.id) === form.portId);
    if (!selectedPort) {
      setPopup({
        variant: 'danger',
        message: 'Seleccione un puerto válido.',
        title: 'Puerto no disponible',
      });
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
        setPopup({
          variant: 'danger',
          message: data.message || 'No se pudo crear la limitante.',
          title: 'Error al crear limitante',
        });
        return;
      }

      setPopup({
        variant: 'success',
        message: `Se creó la limitante ${form.name} correctamente.`,
        title: 'Limitante creada',
      });
      setForm({ equipmentId: form.equipmentId, name: '', bandwidth: '', portId: '' });
      loadLimitantes(form.equipmentId);
      if (!selectedEquipment) {
        setSelectedEquipment(form.equipmentId);
      }
    } catch (error) {
      setPopup({
        variant: 'danger',
        message: 'No se pudo crear la limitante.',
        title: 'Error de conexión',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (limitante: Limitante) => {
    const confirmed = window.confirm(`¿Desea eliminar la limitante ${limitante.name}?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/limitantes?id=${limitante.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo eliminar la limitante.');
      }
      setPopup({
        variant: 'success',
        message: `Se eliminó la limitante ${limitante.name}.`,
        title: 'Limitante eliminada',
      });
      const equipmentToReload = limitante.equipmentId ? String(limitante.equipmentId) : selectedEquipment;
      if (equipmentToReload) {
        setSelectedEquipment(equipmentToReload);
        loadLimitantes(equipmentToReload);
      }
    } catch (error: any) {
      setPopup({
        variant: 'danger',
        message: error?.message || 'No se pudo eliminar la limitante.',
        title: 'Error al eliminar',
      });
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
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {limitantes.map(limitante => (
                  <tr key={limitante.id}>
                    <td>{limitante.name}</td>
                    <td>{limitante.bandwidth}</td>
                    <td>{limitante.port}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(limitante)}
                      >
                        Eliminar
                      </button>
                    </td>
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

            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Creando...' : 'Crear limitante'}
            </button>
          </form>
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
