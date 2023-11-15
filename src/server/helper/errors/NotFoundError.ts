export class NotFoundError extends Error {
    public constructor() {
        super("Not found");
        this.name = "NotFoundError";
    }
}