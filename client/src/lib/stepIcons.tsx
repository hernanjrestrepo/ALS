import { FileText, Type, Image, FileUp, CheckSquare, PenTool } from 'lucide-react';
import type { StepType } from '@/types/sampling';

export function getStepIcon(type: string | StepType) {
    switch (type) {
        case 'TEXT': return <FileText className="h-4 w-4" />;
        case 'INPUT': return <Type className="h-4 w-4" />;
        case 'IMAGE': return <Image className="h-4 w-4" />;
        case 'DOCUMENT': return <FileUp className="h-4 w-4" />;
        case 'CHECKBOX': return <CheckSquare className="h-4 w-4" />;
        case 'SIGNATURE': return <PenTool className="h-4 w-4" />;
        default: return <FileText className="h-4 w-4" />;
    }
}
