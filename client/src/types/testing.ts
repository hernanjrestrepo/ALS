export type TestStatus = 'pending' | 'tested' | 'failed' | 'not_applicable';
export type CommentPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TemplateTestComment {
  id: string;
  text: string;
  field?: string;
  priority: CommentPriority;
  createdAt: string;
}

export interface TemplateTest {
  templateId: string;
  matrix: string;
  fileName: string;
  status: TestStatus;
  hasErrors: boolean;
  comments: TemplateTestComment[];
  lastTestedAt?: string;
  testedBy?: string;
}

export interface TestsExport {
  exportedAt: string;
  exportedBy?: string;
  version: string;
  tests: TemplateTest[];
}

export const TEMPLATE_TEST_ITEMS: Omit<TemplateTest, 'status' | 'hasErrors' | 'comments' | 'lastTestedAt' | 'testedBy'>[] = [
  { templateId: 'agua-marina', matrix: 'Agua Marina', fileName: 'PLANTILLA_AGUA_MARINA_DOCXTEMPLATER.docx' },
  { templateId: 'biota', matrix: 'Biota Marina', fileName: 'PLANTILLA_BIOTA_DOCXTEMPLATER.docx' },
  { templateId: 'ca-calidad', matrix: 'Calidad de Aire', fileName: 'PLANTILLA_CA_CALIDAD_AIRE_DOCXTEMPLATER.docx' },
  { templateId: 'ca-olores', matrix: 'Olores Ofensivos', fileName: 'PLANTILLA_CA_OLORES_DOCXTEMPLATER.docx' },
  { templateId: 'ca-automaticos', matrix: 'CA Automáticos', fileName: 'PLANTILLA_CA_AUTOMATICOS_DOCXTEMPLATER.docx' },
  { templateId: 'emision-ruido', matrix: 'Emisión de Ruido', fileName: 'PLANTILLA_EMISION_RUIDO_DOCXTEMPLATER.docx' },
  { templateId: 'er-ra', matrix: 'ER/RA Unificado', fileName: 'PLANTILLA_ER_RA_UNIFICADO_DOCXTEMPLATER.docx' },
  { templateId: 'fuentes-fijas', matrix: 'Fuentes Fijas', fileName: 'PLANTILLA_FF_DOCXTEMPLATER.docx' },
  { templateId: 'particulas', matrix: 'Partículas Viables', fileName: 'PLANTILLA_PARTICULAS_VIABLES_DOCXTEMPLATER.docx' },
  { templateId: 'punto-seco', matrix: 'Punto Seco (Agua)', fileName: 'PLANTILLA_PUNTO_SECO_DOCXTEMPLATER.docx' },
  { templateId: 'respel', matrix: 'RESPEL', fileName: 'PLANTILLA_RESPEL_DOCXTEMPLATER.docx' },
  { templateId: 'ruido-ambiental', matrix: 'Ruido Ambiental', fileName: 'PLANTILLA_RUIDO_AMBIENTAL_DOCXTEMPLATER.docx' },
  { templateId: 'suelo', matrix: 'Suelo', fileName: 'PLANTILLA_SUELO_DOCXTEMPLATER.docx' },
  { templateId: 'ruido-intradomiciliario', matrix: 'Ruido Intradomiciliario', fileName: 'PLANTILLA_RUIDO_INTRADOMICILIARIO_DOCXTEMPLATER.docx' },
  { templateId: 'fuentes-fijas-previo', matrix: 'Fuentes Fijas (Previo)', fileName: 'PLANTILLA_FF_PREVIO_DOCXTEMPLATER.docx' },
];
