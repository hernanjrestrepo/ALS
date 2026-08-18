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
exports.restoreTemplateVersion = exports.restoreTemplate = exports.deleteTemplate = exports.updateTemplate = exports.createTemplate = exports.getTemplateVersions = exports.getTemplateById = exports.getTrashedTemplates = exports.getTemplates = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const TRASH_RETENTION_DAYS = 90;
// Borra permanentemente cualquier plantilla que lleve mas de 90 dias en la papelera.
// Se ejecuta de forma perezosa en cada lectura de plantillas/papelera, sin necesitar
// infraestructura de cron aparte.
function sweepExpiredTrash() {
    return __awaiter(this, void 0, void 0, function* () {
        const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        yield prisma.samplingTemplate.deleteMany({
            where: { deletedAt: { not: null, lt: cutoff } },
        });
    });
}
// Guarda un snapshot del estado ACTUAL de la plantilla como una nueva version
// en el historial, antes de sobreescribirla. Nunca se pierde una version anterior.
function snapshotVersion(templateId) {
    return __awaiter(this, void 0, void 0, function* () {
        const current = yield prisma.samplingTemplate.findUnique({ where: { id: templateId } });
        if (!current)
            return;
        const lastVersion = yield prisma.samplingTemplateVersion.findFirst({
            where: { samplingTemplateId: templateId },
            orderBy: { versionNumber: 'desc' },
        });
        const nextVersionNumber = ((lastVersion === null || lastVersion === void 0 ? void 0 : lastVersion.versionNumber) || 0) + 1;
        yield prisma.samplingTemplateVersion.create({
            data: {
                samplingTemplateId: templateId,
                versionNumber: nextVersionNumber,
                name: current.name,
                description: current.description,
                oitType: current.oitType,
                steps: current.steps,
                reportTemplateFile: current.reportTemplateFile,
                startMessage: current.startMessage,
            },
        });
    });
}
const getTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield sweepExpiredTrash();
        const templates = yield prisma.samplingTemplate.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' }
        });
        res.json(templates);
    }
    catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Error al obtener plantillas' });
    }
});
exports.getTemplates = getTemplates;
const getTrashedTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield sweepExpiredTrash();
        const templates = yield prisma.samplingTemplate.findMany({
            where: { deletedAt: { not: null } },
            orderBy: { deletedAt: 'desc' }
        });
        const withExpiry = templates.map(t => {
            const deletedAt = t.deletedAt;
            const expiresAt = new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
            const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
            return Object.assign(Object.assign({}, t), { expiresAt, daysRemaining });
        });
        res.json(withExpiry);
    }
    catch (error) {
        console.error('Error fetching trashed templates:', error);
        res.status(500).json({ error: 'Error al obtener la papelera' });
    }
});
exports.getTrashedTemplates = getTrashedTemplates;
const getTemplateById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const template = yield prisma.samplingTemplate.findUnique({
            where: { id }
        });
        if (!template) {
            return res.status(404).json({ error: 'Plantilla no encontrada' });
        }
        res.json(template);
    }
    catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Error al obtener plantilla' });
    }
});
exports.getTemplateById = getTemplateById;
const getTemplateVersions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const versions = yield prisma.samplingTemplateVersion.findMany({
            where: { samplingTemplateId: id },
            orderBy: { versionNumber: 'desc' },
        });
        res.json(versions);
    }
    catch (error) {
        console.error('Error fetching template versions:', error);
        res.status(500).json({ error: 'Error al obtener el historial de versiones' });
    }
});
exports.getTemplateVersions = getTemplateVersions;
const createTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, oitType, steps } = req.body;
        const template = yield prisma.samplingTemplate.create({
            data: {
                name,
                description,
                oitType,
                steps: JSON.stringify(steps)
            }
        });
        res.status(201).json(template);
    }
    catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Error al crear plantilla' });
    }
});
exports.createTemplate = createTemplate;
const updateTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description, oitType, steps } = req.body;
        // El usuario aprueba el cambio al guardar: se conserva el estado anterior
        // como una version nueva en el historial antes de sobreescribir.
        yield snapshotVersion(id);
        const template = yield prisma.samplingTemplate.update({
            where: { id },
            data: {
                name,
                description,
                oitType,
                steps: JSON.stringify(steps)
            }
        });
        res.json(template);
    }
    catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Error al actualizar plantilla' });
    }
});
exports.updateTemplate = updateTemplate;
// Envia la plantilla a la papelera (soft-delete). Se conserva 90 dias y se puede
// restaurar; despues de ese plazo, el sweep perezoso la borra definitivamente.
const deleteTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.samplingTemplate.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
        res.json({ message: 'Plantilla movida a la papelera' });
    }
    catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Error al eliminar plantilla' });
    }
});
exports.deleteTemplate = deleteTemplate;
const restoreTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const template = yield prisma.samplingTemplate.update({
            where: { id },
            data: { deletedAt: null }
        });
        res.json(template);
    }
    catch (error) {
        console.error('Error restoring template:', error);
        res.status(500).json({ error: 'Error al restaurar plantilla' });
    }
});
exports.restoreTemplate = restoreTemplate;
// Restaura una version anterior del historial como el estado actual. El estado
// que estaba activo antes de restaurar tambien se guarda como version (nunca se
// pierde nada), asi que esto es siempre reversible.
const restoreTemplateVersion = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, versionId } = req.params;
        const version = yield prisma.samplingTemplateVersion.findUnique({ where: { id: versionId } });
        if (!version || version.samplingTemplateId !== id) {
            return res.status(404).json({ error: 'Version no encontrada' });
        }
        yield snapshotVersion(id);
        const template = yield prisma.samplingTemplate.update({
            where: { id },
            data: {
                name: version.name,
                description: version.description,
                oitType: version.oitType,
                steps: version.steps,
                reportTemplateFile: version.reportTemplateFile,
                startMessage: version.startMessage,
            },
        });
        res.json(template);
    }
    catch (error) {
        console.error('Error restoring template version:', error);
        res.status(500).json({ error: 'Error al restaurar la version' });
    }
});
exports.restoreTemplateVersion = restoreTemplateVersion;
