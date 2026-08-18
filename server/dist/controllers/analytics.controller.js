"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardMetrics = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getDashboardMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [oits, reportVersions, activeTemplatesCount, trashedTemplatesCount, quotations,] = yield Promise.all([
            prisma.oIT.findMany({ select: { id: true, status: true, quotationId: true, createdAt: true } }),
            prisma.oITReportVersion.findMany({
                where: { isActive: true },
                select: { id: true, oitId: true, name: true, type: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.samplingTemplate.count({ where: { deletedAt: null } }),
            prisma.samplingTemplate.count({ where: { deletedAt: { not: null } } }),
            prisma.quotation.findMany({ select: { id: true, clientName: true } }),
        ]);
        // OITs por estado
        const oitsByStatus = {};
        for (const oit of oits) {
            oitsByStatus[oit.status] = (oitsByStatus[oit.status] || 0) + 1;
        }
        // Informes por mes (ultimos 12 meses con datos)
        const reportsByMonthMap = {};
        for (const v of reportVersions) {
            const monthKey = v.createdAt.toISOString().slice(0, 7); // YYYY-MM
            reportsByMonthMap[monthKey] = (reportsByMonthMap[monthKey] || 0) + 1;
        }
        const reportsByMonth = Object.entries(reportsByMonthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, count]) => ({ month, count }));
        // Informes por matriz/tipo (top 10)
        const reportsByMatrixMap = {};
        for (const v of reportVersions) {
            reportsByMatrixMap[v.name] = (reportsByMatrixMap[v.name] || 0) + 1;
        }
        const reportsByMatrix = Object.entries(reportsByMatrixMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));
        // Uso por cliente (top 10)
        const quotationClientMap = new Map(quotations.map(q => [q.id, q.clientName || 'Sin nombre']));
        const oitsByClientMap = {};
        for (const oit of oits) {
            if (!oit.quotationId)
                continue;
            const clientName = quotationClientMap.get(oit.quotationId) || 'Sin nombre';
            oitsByClientMap[clientName] = (oitsByClientMap[clientName] || 0) + 1;
        }
        const topClients = Object.entries(oitsByClientMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));
        // Informes recientes (ultimos 10)
        const oitNumberMap = new Map();
        if (reportVersions.length > 0) {
            const oitIds = [...new Set(reportVersions.slice(0, 10).map(v => v.oitId))];
            const relatedOits = yield prisma.oIT.findMany({ where: { id: { in: oitIds } }, select: { id: true, oitNumber: true } });
            relatedOits.forEach(o => oitNumberMap.set(o.id, o.oitNumber));
        }
        const recentReports = reportVersions.slice(0, 10).map(v => ({
            id: v.id,
            name: v.name,
            type: v.type,
            oitNumber: oitNumberMap.get(v.oitId) || v.oitId,
            createdAt: v.createdAt,
        }));
        res.json({
            totalOITs: oits.length,
            totalReports: reportVersions.length,
            activeTemplatesCount,
            trashedTemplatesCount,
            oitsByStatus,
            reportsByMonth,
            reportsByMatrix,
            topClients,
            recentReports,
        });
    }
    catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        res.status(500).json({ error: 'Error al obtener metricas del dashboard' });
    }
});
exports.getDashboardMetrics = getDashboardMetrics;
