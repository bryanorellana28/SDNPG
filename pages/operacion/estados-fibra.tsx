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

interface FiberResult {
  txPower: string;
  rxPower: string;
  status: 'OPTIMO' | 'ATENUADO' | 'REPARAR FIBRA';
  level: 'success' | 'warning' | 'danger';
}

export default function EstadosFibra({ role }: { role: string }) {
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [selectedInterface, setSelectedInterface] = useState('');
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resultado, setResultado] = useState<FiberResult | null>(null);
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

  const nodosMikrotik = useMemo(
    () =>
      equipos.filter(eq => {
        const isNodo = (eq.networkRole || '').toLowerCase().includes('nodo');
        return eq.type === 'Mikrotik' && isNodo;
      }),
    [equipos]
  );

  const handleEquipmentChange = async (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    setSelectedInterface('');
    setResultado(null);
    if (!equipmentId) {
      setInterfaces([]);
      return;
    }
    setLoadingInterfaces(true);
    try {
      const res = await fetch(`/api/ports/${equipmentId}`);
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.message || 'No se pudieron cargar las interfaces.');
      }
      const ports = (payload.ports as { physicalName: string }[]) || [];
      const sfpInterfaces = ports
        .map(port => port.physicalName)
        .filter(name => name && name.toLowerCase().startsWith('sfp'));
      setInterfaces(sfpInterfaces);
      if (!sfpInterfaces.length) {
        setPopup({
          variant: 'info',
          message: 'El equipo no reporta interfaces SFP en inventario.',
          title: 'Sin interfaces',
        });
      }
    } catch (error: any) {
      setInterfaces([]);
      setPopup({
        variant: 'danger',
        message: error?.message || 'No se pudieron cargar las interfaces.',
        title: 'Error al obtener interfaces',
      });
    } finally {
      setLoadingInterfaces(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedEquipment || !selectedInterface) {
      setPopup({
        variant: 'warning',
        message: 'Seleccione un equipo y una interfaz SFP para continuar.',
        title: 'Datos requeridos',
      });
      return;
    }

    setVerifying(true);
    setResultado(null);
    try {
      const res = await fetch('/api/operation/fiber-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: Number(selectedEquipment),
          interfaceName: selectedInterface,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo verificar el estado de la fibra.');
      }
      setResultado(data as FiberResult);
    } catch (error: any) {
      setPopup({
        variant: 'danger',
        message: error?.message || 'No se pudo verificar el estado de la fibra.',
        title: 'Error de verificación',
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2 className="mb-4">Estados de fibra</h2>
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <h5 className="card-title">Selecciona el equipo</h5>
                <p className="text-muted small">Solo se muestran nodos Mikrotik con inventario disponible.</p>
                <select
                  className="form-select mb-3"
                  value={selectedEquipment}
                  onChange={e => handleEquipmentChange(e.target.value)}
                >
                  <option value="">Selecciona un equipo</option>
                  {nodosMikrotik.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.hostname}
                    </option>
                  ))}
                </select>
                <label className="form-label">Interfaz SFP</label>
                <select
                  className="form-select mb-3"
                  value={selectedInterface}
                  onChange={e => {
                    setSelectedInterface(e.target.value);
                    setResultado(null);
                  }}
                  disabled={!selectedEquipment || loadingInterfaces || interfaces.length === 0}
                >
                  <option value="">Selecciona una interfaz</option>
                  {interfaces.map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {loadingInterfaces && <div className="text-muted small">Cargando interfaces...</div>}
                <button className="btn btn-primary" onClick={handleVerify} disabled={verifying}>
                  {verifying ? 'Verificando...' : 'Verificar'}
                </button>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body d-flex flex-column justify-content-center">
                {resultado ? (
                  <div className={`alert alert-${resultado.level} mb-0`}>
                    <h5 className="alert-heading">Estado {resultado.status}</h5>
                    <p className="mb-1">sfp-tx-power: {resultado.txPower}</p>
                    <p className="mb-0">sfp-rx-power: {resultado.rxPower}</p>
                  </div>
                ) : (
                  <div className="text-center text-muted">
                    Selecciona una interfaz y presiona verificar para obtener su estado óptico.
                  </div>
                )}
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
