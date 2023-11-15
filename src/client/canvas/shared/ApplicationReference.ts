import { Application } from "pixi.js";

export class ApplicationReference {
    private _app: Application;

    public constructor(app: Application) {
        this._app = app;
    }

    public get required() {
        if (!this._app)
            throw new Error("Application reference was invalidated");

        return this._app;
    }

    public get optional() {
        return this._app;
    }

    public invalidate() {
        this._app = null;
    }
}