export class TranslatedError extends Error {
    public constructor(
        public translationKey: string,
        public interpolationOptions: any = {}
    ) {
        super(`TranslatedError(${translationKey}) (${JSON.stringify(interpolationOptions)})`);
        this.name = "TranslatedError";
    }
}