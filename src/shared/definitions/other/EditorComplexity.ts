export enum EditorComplexity {
    Workshop1 = 1,
    Workshop2 = 2,
    Workshop3 = 3,
    Workshop4 = 4,
    Production = 5
}

export const defaultComplexitySetting = EditorComplexity.Production;

export function passComplexityGate(nodeComplexity: number, editorSettingComplexity: number) {
    return editorSettingComplexity >= nodeComplexity;
}