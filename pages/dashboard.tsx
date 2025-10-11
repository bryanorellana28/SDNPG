import { GetServerSideProps } from 'next';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import Sidebar from '../components/Sidebar';

interface DashboardProps {
  role: string;
}

interface NetworkMetric {
  site: string;
  uptime: number;
  incidents: number;
  latency: number;
  throughput: number;
  satisfaction: number;
}

interface AggregatedSatisfaction {
  excellent: number;
  good: number;
  fair: number;
}

export default function Dashboard({ role }: DashboardProps) {
  const [chartReady, setChartReady] = useState(false);
  const availabilityChartRef = useRef<HTMLCanvasElement | null>(null);
  const incidentsChartRef = useRef<HTMLCanvasElement | null>(null);
  const throughputChartRef = useRef<HTMLCanvasElement | null>(null);
  const satisfactionChartRef = useRef<HTMLCanvasElement | null>(null);

  const availabilityChartInstance = useRef<any>(null);
  const incidentsChartInstance = useRef<any>(null);
  const throughputChartInstance = useRef<any>(null);
  const satisfactionChartInstance = useRef<any>(null);

  const networkData = useMemo<NetworkMetric[]>(
    () => [
      { site: 'Nodo Norte', uptime: 99.2, incidents: 1, latency: 22, throughput: 940, satisfaction: 94 },
      { site: 'Nodo Sur', uptime: 98.7, incidents: 2, latency: 28, throughput: 880, satisfaction: 91 },
      { site: 'Nodo Centro', uptime: 99.6, incidents: 0, latency: 19, throughput: 1010, satisfaction: 97 },
      { site: 'Nodo Este', uptime: 98.1, incidents: 3, latency: 34, throughput: 860, satisfaction: 88 },
      { site: 'Nodo Oeste', uptime: 97.9, incidents: 4, latency: 36, throughput: 820, satisfaction: 85 },
      { site: 'Data Center 1', uptime: 99.9, incidents: 0, latency: 15, throughput: 1200, satisfaction: 99 },
      { site: 'Data Center 2', uptime: 99.4, incidents: 1, latency: 18, throughput: 1105, satisfaction: 96 },
      { site: 'Sucursal A', uptime: 97.2, incidents: 5, latency: 41, throughput: 720, satisfaction: 82 },
      { site: 'Sucursal B', uptime: 96.8, incidents: 6, latency: 45, throughput: 690, satisfaction: 78 },
      { site: 'Sucursal C', uptime: 97.5, incidents: 4, latency: 39, throughput: 705, satisfaction: 81 },
      { site: 'Sucursal D', uptime: 98.3, incidents: 3, latency: 33, throughput: 760, satisfaction: 86 },
      { site: 'Nodo Frontera', uptime: 99.1, incidents: 1, latency: 25, throughput: 915, satisfaction: 92 },
      { site: 'Nodo Internacional', uptime: 98.8, incidents: 2, latency: 27, throughput: 940, satisfaction: 90 },
      { site: 'Nodo Satelital', uptime: 95.9, incidents: 7, latency: 58, throughput: 610, satisfaction: 74 },
      { site: 'Nodo Marino', uptime: 97.7, incidents: 4, latency: 37, throughput: 780, satisfaction: 83 },
      { site: 'Nodo Urbano', uptime: 98.9, incidents: 2, latency: 29, throughput: 905, satisfaction: 89 },
      { site: 'Nodo Rural', uptime: 96.3, incidents: 6, latency: 47, throughput: 655, satisfaction: 77 },
      { site: 'Nodo Montaña', uptime: 97.1, incidents: 5, latency: 43, throughput: 700, satisfaction: 80 },
      { site: 'Nodo Selva', uptime: 95.5, incidents: 8, latency: 61, throughput: 580, satisfaction: 72 },
      { site: 'Nodo Desierto', uptime: 96.6, incidents: 6, latency: 49, throughput: 640, satisfaction: 76 },
    ],
    [],
  );

  const summary = useMemo(() => {
    const totalSites = networkData.length;
    const totalIncidents = networkData.reduce((acc, item) => acc + item.incidents, 0);
    const averageAvailability =
      networkData.reduce((acc, item) => acc + item.uptime, 0) / totalSites;
    const averageLatency = networkData.reduce((acc, item) => acc + item.latency, 0) / totalSites;
    const averageThroughput =
      networkData.reduce((acc, item) => acc + item.throughput, 0) / totalSites;
    const excellentSatisfaction = networkData.filter((item) => item.satisfaction >= 90).length;

    return {
      totalSites,
      totalIncidents,
      averageAvailability,
      averageLatency,
      averageThroughput,
      excellentSatisfaction,
    };
  }, [networkData]);

  const satisfactionBuckets = useMemo<AggregatedSatisfaction>(() => {
    return networkData.reduce(
      (acc, item) => {
        if (item.satisfaction >= 90) {
          acc.excellent += 1;
        } else if (item.satisfaction >= 80) {
          acc.good += 1;
        } else {
          acc.fair += 1;
        }
        return acc;
      },
      { excellent: 0, good: 0, fair: 0 },
    );
  }, [networkData]);

  useEffect(() => {
    if (!chartReady) {
      return;
    }

    const Chart = (window as any).Chart;
    if (!Chart) {
      return;
    }

    const labels = networkData.map((item) => item.site);
    const availabilityData = networkData.map((item) => item.uptime);
    const incidentData = networkData.map((item) => item.incidents);
    const throughputData = networkData.map((item) => item.throughput);
    const satisfactionData = [
      satisfactionBuckets.excellent,
      satisfactionBuckets.good,
      satisfactionBuckets.fair,
    ];

    availabilityChartInstance.current?.destroy();
    incidentsChartInstance.current?.destroy();
    throughputChartInstance.current?.destroy();
    satisfactionChartInstance.current?.destroy();

    if (availabilityChartRef.current) {
      availabilityChartInstance.current = new Chart(availabilityChartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Disponibilidad (%)',
              data: availabilityData,
              borderColor: '#0d6efd',
              backgroundColor: 'rgba(13, 110, 253, 0.2)',
              tension: 0.3,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false },
          },
          scales: {
            y: {
              suggestedMin: 90,
              suggestedMax: 100,
              ticks: {
                callback: (value: number | string) => `${value}%`,
              },
            },
          },
        },
      });
    }

    if (incidentsChartRef.current) {
      incidentsChartInstance.current = new Chart(incidentsChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Incidentes',
              data: incidentData,
              backgroundColor: '#dc3545',
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

    if (throughputChartRef.current) {
      throughputChartInstance.current = new Chart(throughputChartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Ancho de banda (Mbps)',
              data: throughputData,
              borderColor: '#198754',
              backgroundColor: 'rgba(25, 135, 84, 0.2)',
              fill: true,
              tension: 0.3,
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
              beginAtZero: false,
            },
          },
        },
      });
    }

    if (satisfactionChartRef.current) {
      satisfactionChartInstance.current = new Chart(satisfactionChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Excelente (≥90%)', 'Buena (80-89%)', 'Regular (<80%)'],
          datasets: [
            {
              data: satisfactionData,
              backgroundColor: ['#20c997', '#0dcaf0', '#ffc107'],
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

    return () => {
      availabilityChartInstance.current?.destroy();
      incidentsChartInstance.current?.destroy();
      throughputChartInstance.current?.destroy();
      satisfactionChartInstance.current?.destroy();
    };
  }, [chartReady, networkData, satisfactionBuckets]);

  return (
    <div className="d-flex bg-light">
      <Sidebar role={role} />
      <div className="p-4 flex-grow-1">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4">
          <div>
            <h1 className="mb-1">Dashboard</h1>
            <p className="text-muted mb-0">
              Visualiza el estado general de los nodos con métricas clave y tendencias.
            </p>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <h6 className="text-uppercase text-muted">Disponibilidad promedio</h6>
                <h3 className="fw-bold mb-0">{summary.averageAvailability.toFixed(2)}%</h3>
                <small className="text-success">{summary.totalSites} nodos monitoreados</small>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <h6 className="text-uppercase text-muted">Incidentes reportados</h6>
                <h3 className="fw-bold mb-0">{summary.totalIncidents}</h3>
                <small className="text-danger">Consolidado de los últimos 30 días</small>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <h6 className="text-uppercase text-muted">Latencia promedio</h6>
                <h3 className="fw-bold mb-0">{summary.averageLatency.toFixed(1)} ms</h3>
                <small className="text-muted">Medición regional consolidada</small>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <h6 className="text-uppercase text-muted">Satisfacción destacada</h6>
                <h3 className="fw-bold mb-0">{summary.excellentSatisfaction}</h3>
                <small className="text-success">Nodos con satisfacción ≥ 90%</small>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Tendencia de disponibilidad</h5>
                  <span className="badge bg-primary-subtle text-primary">% Uptime</span>
                </div>
                <div className="position-relative" style={{ minHeight: '280px' }}>
                  <canvas ref={availabilityChartRef} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Incidentes por nodo</h5>
                  <span className="badge bg-danger-subtle text-danger">Eventos</span>
                </div>
                <div className="position-relative" style={{ minHeight: '280px' }}>
                  <canvas ref={incidentsChartRef} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Ancho de banda promedio</h5>
                  <span className="badge bg-success-subtle text-success">Mbps</span>
                </div>
                <div className="position-relative" style={{ minHeight: '280px' }}>
                  <canvas ref={throughputChartRef} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Distribución de satisfacción</h5>
                  <span className="badge bg-info-subtle text-info">Clientes</span>
                </div>
                <div className="position-relative" style={{ minHeight: '280px' }}>
                  <canvas ref={satisfactionChartRef} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border-0">
          <div className="card-body">
            <h5 className="card-title">Detalle de métricas por nodo</h5>
            <p className="text-muted">
              20 puntos de datos recopilados para evaluar la estabilidad, incidencias y satisfacción por ubicación.
            </p>
            <div className="table-responsive">
              <table className="table table-striped align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Ubicación</th>
                    <th className="text-center">Disponibilidad (%)</th>
                    <th className="text-center">Incidentes</th>
                    <th className="text-center">Latencia (ms)</th>
                    <th className="text-center">Ancho de banda (Mbps)</th>
                    <th className="text-center">Satisfacción (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {networkData.map((item) => (
                    <tr key={item.site}>
                      <td>{item.site}</td>
                      <td className="text-center">{item.uptime.toFixed(1)}</td>
                      <td className="text-center">{item.incidents}</td>
                      <td className="text-center">{item.latency}</td>
                      <td className="text-center">{item.throughput}</td>
                      <td className="text-center">{item.satisfaction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
