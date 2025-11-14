import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Sidebar from '../components/Sidebar';

interface DashboardProps {
  role: string;
}

interface CountItem {
  label: string;
  count: number;
}

interface SiteDetail {
  id: number;
  nombre: string;
  ubicacion: string | null;
  zona: string | null;
  totalEquipments: number;
  nodeCount: number;
  clientCount: number;
}

interface DashboardData {
  summary: {
    totalSites: number;
    totalEquipments: number;
    totalServices: number;
    totalBackups: number;
    totalClients: number;
  };
  equipmentBySite: CountItem[];
  equipmentByRole: CountItem[];
  equipmentByType: CountItem[];
  servicesByType: CountItem[];
  backupsByDate: { date: string; count: number }[];
  siteDetails: SiteDetail[];
}

export default function Dashboard({ role }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState(false);

  const sitesChartRef = useRef<HTMLCanvasElement | null>(null);
  const rolesChartRef = useRef<HTMLCanvasElement | null>(null);
  const typesChartRef = useRef<HTMLCanvasElement | null>(null);
  const backupsChartRef = useRef<HTMLCanvasElement | null>(null);

  const sitesChartInstance = useRef<any>(null);
  const rolesChartInstance = useRef<any>(null);
  const typesChartInstance = useRef<any>(null);
  const backupsChartInstance = useRef<any>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('No se pudo obtener la información del dashboard');
        }
        const data: DashboardData = await response.json();
        setDashboardData(data);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar la información desde la base de datos.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  useEffect(() => {
    if (!chartReady || !dashboardData) {
      return;
    }

    const Chart = (window as any).Chart;
    if (!Chart) {
      return;
    }

    const topSites = dashboardData.equipmentBySite.slice(0, 12);
    const siteLabels = topSites.map((item) => item.label);
    const siteCounts = topSites.map((item) => item.count);

    const roleLabels = dashboardData.equipmentByRole.map((item) => item.label);
    const roleCounts = dashboardData.equipmentByRole.map((item) => item.count);

    const typeLabels = dashboardData.equipmentByType.map((item) => item.label);
    const typeCounts = dashboardData.equipmentByType.map((item) => item.count);

    const backupsLabels = dashboardData.backupsByDate.map((item) => item.date);
    const backupsCounts = dashboardData.backupsByDate.map((item) => item.count);

    sitesChartInstance.current?.destroy();
    rolesChartInstance.current?.destroy();
    typesChartInstance.current?.destroy();
    backupsChartInstance.current?.destroy();

    if (sitesChartRef.current && siteLabels.length > 0) {
      sitesChartInstance.current = new Chart(sitesChartRef.current, {
        type: 'bar',
        data: {
          labels: siteLabels,
          datasets: [
            {
              label: 'Equipos por sitio',
              data: siteCounts,
              backgroundColor: '#0d6efd',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              ticks: { maxRotation: 45, minRotation: 45 },
            },
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0,
              },
            },
          },
        },
      });
    }

    if (rolesChartRef.current && roleLabels.length > 0) {
      rolesChartInstance.current = new Chart(rolesChartRef.current, {
        type: 'doughnut',
        data: {
          labels: roleLabels,
          datasets: [
            {
              data: roleCounts,
              backgroundColor: ['#0d6efd', '#20c997', '#ffc107', '#dc3545'],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
            },
          },
        },
      });
    }

    if (typesChartRef.current && typeLabels.length > 0) {
      typesChartInstance.current = new Chart(typesChartRef.current, {
        type: 'bar',
        data: {
          labels: typeLabels,
          datasets: [
            {
              label: 'Equipos por tipo',
              data: typeCounts,
              backgroundColor: '#198754',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0,
              },
            },
          },
        },
      });
    }

    if (backupsChartRef.current && backupsLabels.length > 0) {
      backupsChartInstance.current = new Chart(backupsChartRef.current, {
        type: 'line',
        data: {
          labels: backupsLabels,
          datasets: [
            {
              label: 'Respaldos por día',
              data: backupsCounts,
              borderColor: '#6610f2',
              backgroundColor: 'rgba(102, 16, 242, 0.2)',
              tension: 0.3,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0,
              },
            },
          },
        },
      });
    }

    return () => {
      sitesChartInstance.current?.destroy();
      rolesChartInstance.current?.destroy();
      typesChartInstance.current?.destroy();
      backupsChartInstance.current?.destroy();
    };
  }, [chartReady, dashboardData]);

  return (
    <div className="d-flex bg-light">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4">
          <div>
            <h1 className="mb-1">Dashboard</h1>
            <p className="text-muted mb-0">
              Visualiza indicadores clave construidos a partir de los datos reales registrados en la plataforma.
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {loading && !dashboardData ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="row g-4 mb-4">
              <div className="col-12 col-md-6 col-xl-3">
                <div className="card shadow-sm border-0 h-100">
                  <div
                    className="card-body d-flex flex-column justify-content-between"
                    style={{ minHeight: '160px' }}
                  >
                    <h6 className="text-uppercase text-muted">Sitios registrados</h6>
                    <h3 className="fw-bold mb-0">{dashboardData?.summary.totalSites ?? 0}</h3>
                    <small className="text-muted">{dashboardData?.summary.totalClients ?? 0} clientes vinculados</small>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <div className="card shadow-sm border-0 h-100">
                  <div
                    className="card-body d-flex flex-column justify-content-between"
                    style={{ minHeight: '160px' }}
                  >
                    <h6 className="text-uppercase text-muted">Equipos monitoreados</h6>
                    <h3 className="fw-bold mb-0">{dashboardData?.summary.totalEquipments ?? 0}</h3>
                    <small className="text-muted">Información consolidada desde inventario</small>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <div className="card shadow-sm border-0 h-100">
                  <div
                    className="card-body d-flex flex-column justify-content-between"
                    style={{ minHeight: '160px' }}
                  >
                    <h6 className="text-uppercase text-muted">Servicios activos</h6>
                    <h3 className="fw-bold mb-0">{dashboardData?.summary.totalServices ?? 0}</h3>
                    <small className="text-muted">Distribución por tipo según catálogo</small>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-xl-3">
                <div className="card shadow-sm border-0 h-100">
                  <div
                    className="card-body d-flex flex-column justify-content-between"
                    style={{ minHeight: '160px' }}
                  >
                    <h6 className="text-uppercase text-muted">Respaldos registrados</h6>
                    <h3 className="fw-bold mb-0">{dashboardData?.summary.totalBackups ?? 0}</h3>
                    <small className="text-muted">Histórico cargado desde la base de datos</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-12 col-lg-6">
                <div className="card shadow-sm border-0 h-100">
                  <div
                    className="card-body d-flex flex-column"
                    style={{ minHeight: '360px' }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="card-title mb-0">Inventario por sitio</h5>
                      <span className="badge bg-primary-subtle text-primary">Equipos</span>
                    </div>
                    <div className="position-relative flex-grow-1" style={{ minHeight: '260px' }}>
                      {dashboardData && dashboardData.equipmentBySite.length > 0 ? (
                        <canvas ref={sitesChartRef} />
                      ) : (
                        <div className="text-muted text-center pt-5">No hay datos disponibles.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-6">
                <div className="card shadow-sm border-0 h-100">
                  <div
                    className="card-body d-flex flex-column"
                    style={{ minHeight: '360px' }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="card-title mb-0">Distribución por rol</h5>
                      <span className="badge bg-info-subtle text-info">Roles</span>
                    </div>
                    <div className="position-relative flex-grow-1" style={{ minHeight: '260px' }}>
                      {dashboardData && dashboardData.equipmentByRole.length > 0 ? (
                        <canvas ref={rolesChartRef} />
                      ) : (
                        <div className="text-muted text-center pt-5">No hay datos disponibles.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-12 col-lg-6">
                <div className="card shadow-sm border-0 h-100">
                  <div
                    className="card-body d-flex flex-column"
                    style={{ minHeight: '360px' }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="card-title mb-0">Equipos por tipo</h5>
                      <span className="badge bg-success-subtle text-success">Inventario</span>
                    </div>
                    <div className="position-relative flex-grow-1" style={{ minHeight: '260px' }}>
                      {dashboardData && dashboardData.equipmentByType.length > 0 ? (
                        <canvas ref={typesChartRef} />
                      ) : (
                        <div className="text-muted text-center pt-5">No hay datos disponibles.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-6">
                <div className="card shadow-sm border-0 h-100">
                  <div
                    className="card-body d-flex flex-column"
                    style={{ minHeight: '360px' }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="card-title mb-0">Respaldos diarios</h5>
                      <span className="badge bg-warning-subtle text-warning">Backups</span>
                    </div>
                    <div className="position-relative flex-grow-1" style={{ minHeight: '260px' }}>
                      {dashboardData && dashboardData.backupsByDate.length > 0 ? (
                        <canvas ref={backupsChartRef} />
                      ) : (
                        <div className="text-muted text-center pt-5">No hay datos disponibles.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card shadow-sm border-0 mb-4">
              <div
                className="card-body d-flex flex-column"
                style={{ minHeight: '320px' }}
              >
                <h5 className="card-title">Servicios por tipo</h5>
                <p className="text-muted">Resumen de servicios según la clasificación almacenada en la base de datos.</p>
                {dashboardData && dashboardData.servicesByType.length > 0 ? (
                  <div className="row g-3">
                    {dashboardData.servicesByType.map((service) => (
                      <div className="col-6 col-md-3" key={service.label}>
                        <div
                          className="bg-light rounded-3 p-3 text-center h-100 d-flex flex-column justify-content-center"
                          style={{ minHeight: '140px' }}
                        >
                          <h6 className="text-uppercase text-muted small mb-1">{service.label}</h6>
                          <span className="fw-bold fs-4">{service.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted mb-0">No hay servicios registrados.</p>
                )}
              </div>
            </div>

            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h5 className="card-title">Detalle de sitios y equipamiento</h5>
                <p className="text-muted">
                  Información consolidada desde el inventario para conocer la distribución de equipos por sitio.
                </p>
                <div className="table-responsive">
                  <table className="table table-striped align-middle mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>Sitio</th>
                        <th>Zona</th>
                        <th>Ubicación</th>
                        <th className="text-center">Equipos</th>
                        <th className="text-center">Nodos</th>
                        <th className="text-center">Clientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData && dashboardData.siteDetails.length > 0 ? (
                        dashboardData.siteDetails.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div className="fw-semibold">{item.nombre}</div>
                            </td>
                            <td>{item.zona || '-'}</td>
                            <td>{item.ubicacion || '-'}</td>
                            <td className="text-center">{item.totalEquipments}</td>
                            <td className="text-center">{item.nodeCount}</td>
                            <td className="text-center">{item.clientCount}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">
                            No hay sitios registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Script
        src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"
        strategy="lazyOnload"
        onLoad={() => setChartReady(true)}
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
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
};
