import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

interface Equipment { id: number; hostname: string }

const COMMAND_OPTIONS = [
  { key: 'interface-print', label: 'Interfaces disponibles', command: '/interface print' },
  { key: 'ethernet-detail', label: 'Detalle de interfaces ethernet', command: '/interface ethernet print detail' },
  { key: 'bridge-detail', label: 'Puentes configurados', command: '/interface bridge print detail' },
  { key: 'bridge-host', label: 'Hosts registrados en bridges', command: '/interface bridge host print' },
  { key: 'wireless-detail', label: 'Interfaces inalámbricas', command: '/interface wireless print detail' },
  { key: 'wireless-reg', label: 'Clientes inalámbricos asociados', command: '/interface wireless registration-table print' },
  { key: 'vlan-detail', label: 'Listado de VLAN', command: '/interface vlan print detail' },
  { key: 'ip-address', label: 'Direcciones IP configuradas', command: '/ip address print detail' },
  { key: 'ip-route-detail', label: 'Rutas detalladas', command: '/ip route print detail' },
  { key: 'ip-route-terse', label: 'Resumen de rutas', command: '/ip route print terse' },
  { key: 'ip-neighbor', label: 'Vecinos descubiertos', command: '/ip neighbor print detail' },
  { key: 'ip-arp', label: 'Tabla ARP', command: '/ip arp print detail' },
  { key: 'dhcp-server', label: 'Servidores DHCP', command: '/ip dhcp-server print detail' },
  { key: 'dhcp-leases', label: 'Arrendamientos DHCP', command: '/ip dhcp-server lease print detail' },
  { key: 'dhcp-client', label: 'Clientes DHCP', command: '/ip dhcp-client print detail' },
  { key: 'dns-cache', label: 'Caché DNS', command: '/ip dns cache print detail' },
  { key: 'fw-filter', label: 'Reglas de firewall (filter)', command: '/ip firewall filter print without-paging' },
  { key: 'fw-nat', label: 'Reglas de firewall (NAT)', command: '/ip firewall nat print without-paging' },
  { key: 'fw-mangle', label: 'Reglas de firewall (mangle)', command: '/ip firewall mangle print without-paging' },
  { key: 'fw-conn', label: 'Conteo de conexiones firewall', command: '/ip firewall connection print count-only' },
  { key: 'ip-service', label: 'Servicios habilitados', command: '/ip service print' },
  { key: 'queue-simple', label: 'Queues simples', command: '/queue simple print detail' },
  { key: 'system-resource', label: 'Recursos del sistema', command: '/system resource print' },
  { key: 'system-cpu', label: 'Detalle de CPU', command: '/system resource cpu print' },
  { key: 'system-monitor', label: 'Monitoreo rápido de recursos', command: '/system resource monitor once' },
  { key: 'system-clock', label: 'Reloj del sistema', command: '/system clock print' },
  { key: 'system-identity', label: 'Identidad del sistema', command: '/system identity print' },
  { key: 'system-health', label: 'Sensores de hardware', command: '/system health print' },
  { key: 'system-package', label: 'Paquetes instalados', command: '/system package print detail' },
  { key: 'routerboard', label: 'Información de routerboard', command: '/system routerboard print' },
  { key: 'netwatch', label: 'Entradas de Netwatch', command: '/tool netwatch print detail' },
  { key: 'graphing-interface', label: 'Estadísticas de graphing (interfaces)', command: '/tool graphing interface print' },
  { key: 'traceroute', label: 'Traceroute a 8.8.8.8', command: '/tool traceroute 8.8.8.8 count=3' },
  { key: 'ping', label: 'Ping a 8.8.8.8', command: '/tool ping 8.8.8.8 count=5' },
  { key: 'bgp-peer', label: 'Vecinos BGP', command: '/routing bgp peer print detail' },
  { key: 'ospf-neighbor', label: 'Vecinos OSPF', command: '/routing ospf neighbor print detail' },
  { key: 'routing-summary', label: 'Resumen de enrutamiento', command: '/routing route print summary' },
  { key: 'capsman-reg', label: 'Clientes CAPsMAN', command: '/caps-man registration-table print' },
  { key: 'logs', label: 'Logs recientes', command: '/log print without-paging' },
  { key: 'export', label: 'Exportar configuración (ocultando datos sensibles)', command: '/export hide-sensitive' },
];

export default function Diagnostico({ role }: { role: string }) {
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [equipmentId, setEquipmentId] = useState('');
  const [commandKey, setCommandKey] = useState(COMMAND_OPTIONS[0]?.key || '');
  const [customCommand, setCustomCommand] = useState('');
  const [output, setOutput] = useState('');

  useEffect(() => {
    fetch('/api/equipos')
      .then(r => r.json())
      .then(setEquipos);
  }, []);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    const selected = COMMAND_OPTIONS.find(c => c.key === commandKey);
    const commandToRun = commandKey === 'custom' ? customCommand.trim() : selected?.command;
    if (!commandToRun) {
      setOutput('Seleccione o escriba un comando válido.');
      return;
    }
    setOutput('Ejecutando comando...');
    const res = await fetch('/api/diagnostic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipmentId, command: commandToRun }),
    });
    const data = await res.json();
    setOutput(data.output || data.message);
  };

  return (
    <div className="d-flex">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <h2>Diagnóstico</h2>
        <form onSubmit={handleRun} className="mb-3">
          <div className="row g-2 align-items-end">
            <div className="col">
              <select className="form-select" value={equipmentId} onChange={e => setEquipmentId(e.target.value)} required>
                <option value="">Seleccione equipo</option>
                {equipos.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.hostname}
                  </option>
                ))}
              </select>
            </div>
            <div className="col">
              <select className="form-select" value={commandKey} onChange={e => setCommandKey(e.target.value)}>
                {COMMAND_OPTIONS.map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
                <option value="custom">Comando personalizado</option>
              </select>
            </div>
            {commandKey === 'custom' ? (
              <div className="col">
                <input
                  className="form-control"
                  value={customCommand}
                  onChange={e => setCustomCommand(e.target.value)}
                  placeholder="Escribe el comando Mikrotik"
                />
              </div>
            ) : (
              <div className="col">
                <input
                  className="form-control"
                  value={COMMAND_OPTIONS.find(c => c.key === commandKey)?.command || ''}
                  readOnly
                />
              </div>
            )}
            <div className="col-auto">
              <button className="btn btn-primary" type="submit">
                Ejecutar
              </button>
            </div>
          </div>
        </form>
        <pre className="bg-light p-3" style={{ whiteSpace: 'pre-wrap' }}>{output}</pre>
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
