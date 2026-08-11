/**
 * Servicio para calcular índices de calidad de agua (ICA/ICO)
 * Basado en las fórmulas de los archivos Excel FO-PO-PSM-64-02 y 03
 */

export interface WaterParameters {
    ph?: number;
    temp?: number;
    od?: number; // mg/L
    satOD?: number; // % Saturación
    dbo?: number; // mg/L
    coli?: number; // NMP/100mL
    cond?: number; // uS/cm
    hardness?: number; // mg/L as CaCO3
    alcalinity?: number; // mg/L as CaCO3
    sst?: number; // mg/L
    phosphorus?: number; // mg/L
}

export class WaterIndicesService {
    
    public static calculateICOMO(dbo?: number, coli?: number, satOD?: number) {
        if (dbo === undefined || coli === undefined || satOD === undefined) return null;

        // Indice Oxigeno
        const iOD = satOD < 100 ? (1 - 0.01 * satOD) : 0;
        
        // Indice DBO
        let iDBO = 0;
        if (dbo > 30) iDBO = 1;
        else if (dbo >= 2) iDBO = -0.05 + 0.7 * Math.log10(dbo);
        
        // Indice Coliformes
        let iColi = 0;
        if (coli > 20000) iColi = 1;
        else if (coli >= 500) iColi = -1.44 + 0.56 * Math.log10(coli);
        
        const value = (iOD + iDBO + iColi) / 3;
        return {
            value: Number(value.toFixed(3)),
            label: this.getContaminationLabel(value)
        };
    }

    public static calculateICOMI(cond?: number, hardness?: number, alcalinity?: number) {
        if (cond === undefined || hardness === undefined || alcalinity === undefined) return null;

        // Indice Conductividad
        let iCond = 0;
        if (cond > 110) iCond = 1;
        else if (cond >= 30) iCond = Math.pow(10, -9.09 + 4.4 * Math.log10(cond));
        
        // Indice Dureza
        let iHard = 0;
        if (hardness > 250) iHard = 1;
        else if (hardness >= 50) iHard = -0.25 + 0.005 * hardness;
        
        // Indice Alcalinidad (Simplificado)
        let iAlcal = 0;
        if (alcalinity > 250) iAlcal = 1;
        else if (alcalinity >= 50) iAlcal = -0.25 + 0.005 * alcalinity;

        const value = (iCond + iHard + iAlcal) / 3;
        return {
            value: Number(value.toFixed(3)),
            label: this.getContaminationLabel(value)
        };
    }

    public static calculateICOSUS(sst?: number) {
        if (sst === undefined) return null;
        let value = 0;
        if (sst > 340) value = 1;
        else if (sst >= 10) value = -0.02 + 0.003 * sst;
        
        return {
            value: Number(value.toFixed(3)),
            label: this.getContaminationLabel(value)
        };
    }

    public static calculateRemoval(inlet?: number, outlet?: number) {
        if (inlet === undefined || outlet === undefined || inlet === 0) return null;
        const value = ((inlet - outlet) / inlet) * 100;
        return {
            value: Number(value.toFixed(2)),
            label: value >= 80 ? "Alta" : value >= 50 ? "Media" : "Baja"
        };
    }

    private static getContaminationLabel(val: number): string {
        if (val <= 0.2) return "Ninguna";
        if (val <= 0.4) return "Bajo";
        if (val <= 0.6) return "Medio";
        if (val <= 0.8) return "Alto";
        return "Muy alto";
    }
}
