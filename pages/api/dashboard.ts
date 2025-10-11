import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

type CountItem = {
  label: string;
  count: number;
};

type DashboardResponse = {
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
  siteDetails: {
    id: number;
    nombre: string;
    ubicacion: string | null;
    zona: string | null;
    direccion: string | null;
    totalEquipments: number;
    nodeCount: number;
    clientCount: number;
  }[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<DashboardResponse | { error: string }>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [sites, equipments, services, backups, totalClients] = await Promise.all([
      prisma.site.findMany({
        include: {
          equipments: {
            select: {
              id: true,
              networkRole: true,
              type: true,
            },
          },
        },
        orderBy: { nombre: 'asc' },
      }),
      prisma.equipment.findMany({
        select: {
          networkRole: true,
          type: true,
          site: {
            select: {
              nombre: true,
            },
          },
        },
      }),
      prisma.service.findMany({
        select: {
          type: true,
        },
      }),
      prisma.backup.findMany({
        select: {
          createdAt: true,
        },
      }),
      prisma.client.count(),
    ]);

    const summary = {
      totalSites: sites.length,
      totalEquipments: equipments.length,
      totalServices: services.length,
      totalBackups: backups.length,
      totalClients,
    };

    const equipmentBySite = sites
      .map(site => ({
        label: site.nombre,
        count: site.equipments.length,
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const equipmentByRoleMap = equipments.reduce<Record<string, number>>((acc, equipment) => {
      const key = equipment.networkRole || 'Sin rol';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const equipmentByTypeMap = equipments.reduce<Record<string, number>>((acc, equipment) => {
      const key = equipment.type || 'Sin tipo';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const servicesByTypeMap = services.reduce<Record<string, number>>((acc, service) => {
      const key = service.type || 'Sin tipo';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const backupsByDateMap = backups.reduce<Record<string, number>>((acc, backup) => {
      const date = backup.createdAt.toISOString().slice(0, 10);
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const toCountItems = (map: Record<string, number>): CountItem[] =>
      Object.entries(map)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

    const siteDetails = sites.map(site => {
      const nodeCount = site.equipments.filter(equipment => equipment.networkRole === 'Nodo').length;
      const clientCount = site.equipments.filter(equipment => equipment.networkRole === 'Cliente').length;

      return {
        id: site.id,
        nombre: site.nombre,
        ubicacion: site.ubicacion,
        zona: site.zona,
        direccion: site.direccion,
        totalEquipments: site.equipments.length,
        nodeCount,
        clientCount,
      };
    });

    const backupsByDate = Object.entries(backupsByDateMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.status(200).json({
      summary,
      equipmentBySite,
      equipmentByRole: toCountItems(equipmentByRoleMap),
      equipmentByType: toCountItems(equipmentByTypeMap),
      servicesByType: toCountItems(servicesByTypeMap),
      backupsByDate,
      siteDetails,
    });
  } catch (error) {
    console.error('Error fetching dashboard data', error);
    return res.status(500).json({ error: 'Error fetching dashboard data' });
  }
}
