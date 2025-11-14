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

  const summaryCards = [
    {
      title: 'Sitios registrados',
      value: dashboardData?.summary.totalSites ?? 0,
      description: `${dashboardData?.summary.totalClients ?? 0} clientes vinculados`,
      accent: 'primary',
      icon: '📍',
    },
    {
      title: 'Equipos monitoreados',
      value: dashboardData?.summary.totalEquipments ?? 0,
      description: 'Información consolidada desde inventario',
      accent: 'success',
      icon: '🖥️',
    },
    {
      title: 'Servicios activos',
      value: dashboardData?.summary.totalServices ?? 0,
      description: 'Distribución por tipo según catálogo',
      accent: 'info',
      icon: '🛠️',
    },
    {
      title: 'Respaldos registrados',
      value: dashboardData?.summary.totalBackups ?? 0,
      description: 'Histórico cargado desde la base de datos',
      accent: 'warning',
      icon: '💾',
    },
  ];

  const formatNumber = (value: number) => new Intl.NumberFormat('es-ES').format(value);

  return (
    <div className="d-flex dashboard-layout">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1 dashboard-content">
        <div className="hero-card card border-0 shadow-sm mb-4">
          <div className="card-body d-flex flex-column flex-lg-row align-items-lg-center justify-content-between">
            <div>
              <h1 className="mb-2 fw-semibold">Panel de indicadores</h1>
              <p className="text-muted mb-0">
                Visualiza indicadores clave construidos a partir de los datos reales registrados en la plataforma.
              </p>
            </div>
            <div className="hero-badge mt-3 mt-lg-0">
              <span className="badge rounded-pill bg-primary-subtle text-primary fw-semibold px-3 py-2">
                Información actualizada en tiempo real
              </span>
            </div>
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
              {summaryCards.map((card) => (
                <div className="col-12 col-sm-6 col-xl-3" key={card.title}>
                  <div className={`metric-card metric-card--${card.accent}`}>
                    <div className="metric-icon" aria-hidden="true">{card.icon}</div>
                    <div className="metric-content">
                      <h6 className="text-uppercase text-muted mb-2">{card.title}</h6>
                      <h2 className="metric-value mb-2">{formatNumber(card.value)}</h2>
                      <p className="metric-description text-muted mb-0">{card.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="row g-4 mb-4">
              <div className="col-12 col-lg-6">
                <div className="card shadow-sm border-0 h-100 chart-card">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="card-title mb-0">Inventario por sitio</h5>
                      <span className="badge bg-primary-subtle text-primary">Equipos</span>
                    </div>
                    <div className="position-relative flex-grow-1 chart-wrapper">
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
                <div className="card shadow-sm border-0 h-100 chart-card">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="card-title mb-0">Distribución por rol</h5>
                      <span className="badge bg-info-subtle text-info">Roles</span>
                    </div>
                    <div className="position-relative flex-grow-1 chart-wrapper">
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
                <div className="card shadow-sm border-0 h-100 chart-card">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="card-title mb-0">Equipos por tipo</h5>
                      <span className="badge bg-success-subtle text-success">Inventario</span>
                    </div>
                    <div className="position-relative flex-grow-1 chart-wrapper">
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
                <div className="card shadow-sm border-0 h-100 chart-card">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="card-title mb-0">Respaldos diarios</h5>
                      <span className="badge bg-warning-subtle text-warning">Backups</span>
                    </div>
                    <div className="position-relative flex-grow-1 chart-wrapper">
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

            <div className="card shadow-sm border-0 mb-4 data-card">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">Servicios por tipo</h5>
                <p className="text-muted">Resumen de servicios según la clasificación almacenada en la base de datos.</p>
                {dashboardData && dashboardData.servicesByType.length > 0 ? (
                  <div className="row g-3 service-grid">
                    {dashboardData.servicesByType.map((service) => (
                      <div className="col-6 col-md-3" key={service.label}>
                        <div className="service-tile">
                          <h6 className="text-uppercase text-muted small mb-2">{service.label}</h6>
                          <span className="fw-bold fs-4">{formatNumber(service.count)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted mb-0">No hay servicios registrados.</p>
                )}
              </div>
            </div>

            <div className="card shadow-sm border-0 data-card">
              <div className="card-body">
                <h5 className="card-title">Detalle de sitios y equipamiento</h5>
                <p className="text-muted">
                  Información consolidada desde el inventario para conocer la distribución de equipos por sitio.
                </p>
                <div className="table-responsive table-wrapper">
                  <table className="table table-striped align-middle mb-0 table-modern">
                    <thead>
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
                            <td className="text-center">{formatNumber(item.totalEquipments)}</td>
                            <td className="text-center">{formatNumber(item.nodeCount)}</td>
                            <td className="text-center">{formatNumber(item.clientCount)}</td>
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

      <style jsx>{`
        .dashboard-layout {
          background: var(--bs-gray-100);
          min-height: 100vh;
        }

        .dashboard-content {
          max-width: 100%;
        }

        .hero-card {
          border-radius: 1.25rem;
          background: linear-gradient(135deg, rgba(13, 110, 253, 0.08), rgba(13, 110, 253, 0));
        }

        .hero-card h1 {
          font-size: 1.75rem;
        }

        .metric-card {
          min-height: 180px;
          border-radius: 1.25rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 1rem;
          box-shadow: 0 18px 35px rgba(15, 23, 42, 0.08);
          border: 0;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 22px 45px rgba(15, 23, 42, 0.12);
        }

        .metric-card--primary {
          background: linear-gradient(135deg, rgba(13, 110, 253, 0.9), rgba(105, 161, 255, 0.9));
          color: #fff;
        }

        .metric-card--success {
          background: linear-gradient(135deg, rgba(25, 135, 84, 0.9), rgba(72, 220, 154, 0.85));
          color: #fff;
        }

        .metric-card--info {
          background: linear-gradient(135deg, rgba(13, 202, 240, 0.9), rgba(32, 201, 151, 0.85));
          color: #0b253a;
        }

        .metric-card--warning {
          background: linear-gradient(135deg, rgba(255, 193, 7, 0.9), rgba(255, 221, 128, 0.85));
          color: #4a3000;
        }

        .metric-card--primary .text-muted,
        .metric-card--success .text-muted,
        .metric-card--warning .text-muted {
          color: rgba(255, 255, 255, 0.85) !important;
        }

        .metric-card--info .text-muted {
          color: rgba(11, 37, 58, 0.7) !important;
        }

        .metric-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.18);
          display: grid;
          place-items: center;
          font-size: 1.75rem;
        }

        .metric-card--info .metric-icon {
          background: rgba(255, 255, 255, 0.35);
        }

        .metric-card--warning .metric-icon {
          background: rgba(255, 255, 255, 0.45);
        }

        .metric-value {
          font-size: 2.5rem;
          font-weight: 700;
        }

        .metric-description {
          font-size: 0.95rem;
        }

        .chart-card,
        .data-card {
          border-radius: 1.25rem;
          min-height: 360px;
        }

        .chart-wrapper {
          min-height: 260px;
        }

        .service-grid {
          margin-top: 0.5rem;
        }

        .service-tile {
          min-height: 150px;
          border-radius: 1rem;
          background: linear-gradient(135deg, rgba(248, 249, 250, 0.95), rgba(233, 236, 239, 0.95));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          text-align: center;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(222, 226, 230, 0.9);
        }

        .table-wrapper {
          border-radius: 1rem;
          overflow: hidden;
        }

        .table-modern thead {
          background: linear-gradient(135deg, rgba(13, 110, 253, 0.9), rgba(32, 201, 151, 0.9));
          color: #fff;
        }

        .table-modern tbody tr:hover {
          background-color: rgba(13, 110, 253, 0.08);
        }

        @media (max-width: 767.98px) {
          .metric-card {
            min-height: 160px;
          }

          .metric-value {
            font-size: 2rem;
          }
        }
      `}</style>
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
