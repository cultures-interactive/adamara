import { Application, Container, DisplayObject, Extract } from "pixi.js";
import { dataConstants } from "../../../shared/data/dataConstants";
import { calcScaleToFit } from "../../helper/pixiHelpers";
import { ReactionDisposerGroup } from "../../helper/ReactionDisposerGroup";

const debugLifecycle = false;

const { thumbnailSize } = dataConstants;
//const thumbnailRectangle = new Rectangle(0, 0, thumbnailSize.width, thumbnailSize.height);

export class BackgroundRenderer {
    private debugName: string;
    private creationTime: string;
    private app: Application;
    //private appReference: ApplicationReference;

    //private renderViaStageGate = new TokenGate(1);

    private isAttached: boolean;

    private reactionDisposers = new ReactionDisposerGroup();

    //private wasDisposed = false;

    public constructor() {
        this.debugName = "BackgroundRenderer";

        this.creationTime = Date.now().toString();
        this.lifecycleDebugOutput("created");

        this.app = new Application({
            backgroundAlpha: 0,
            ...thumbnailSize
        });

        this.app.stop();

        //this.appReference = new ApplicationReference(this.app);
    }

    public attach(parent: HTMLElement) {
        if (this.app.view.parentElement === parent)
            return;

        this.isAttached = true;

        this.lifecycleDebugOutput(`attaching to ${parent}`);

        parent.appendChild(this.app.view);
    }

    public detach() {
        if (!this.isAttached)
            return;

        this.isAttached = false;

        this.lifecycleDebugOutput("detaching");

        this.app.view.remove();
    }

    public dispose() {
        this.lifecycleDebugOutput("disposing...");

        this.detach();

        this.app.destroy(true, {
            children: true,
            texture: false,
            baseTexture: false
        });

        this.reactionDisposers.disposeAll();

        //this.wasDisposed = true;
        //this.appReference.invalidate();
        this.app = null;

        this.lifecycleDebugOutput("disposed");
    }

    public get parentElement() {
        return this.app.view.parentElement;
    }

    private lifecycleDebugOutput(message: string) {
        if (debugLifecycle)
            console.log("[" + this.debugName + " #" + this.creationTime + "] " + message);
    }

    /**
     * Renders a display object to a blob:
     * - Only renders the displayObject
     * - Ignores transform (position, rotating, scale etc.) of displayObject
     * - Output size is always the bounds of the displayObject rendered
     * - Always creates a separate canvas
     * - Seems to have the same performance/memory usage as renderStageToBlob()
     */
    private renderDisplayObjectToBlob(displayObject: DisplayObject) {
        return new Promise<Blob>((resolve, reject) => {
            try {
                const extract = this.app.renderer.plugins.extract as Extract;
                extract.canvas(displayObject).toBlob(resolve);
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Renders the stage to a blob:
     * - Uses the already created canvas
     * - Output size is always the size of the renderer
     * - Seems to have the same performance/memory usage as renderDisplayObjectToBlob()
     */
    private renderStageToBlob() {
        return new Promise<Blob>((resolve, reject) => {
            try {
                this.app.renderer.once("postrender", () => {
                    try {
                        this.app.view.toBlob(resolve);
                    } catch (e) {
                        reject(e);
                    }
                });
                this.app.render();
            } catch (e) {
                reject(e);
            }
        });
    }

    public async render(displayObject: DisplayObject) {
        const container = new Container();
        container.addChild(displayObject);

        const bounds = displayObject.getLocalBounds();
        const scaleFactor = calcScaleToFit(bounds, thumbnailSize.width, thumbnailSize.height);
        container.scale.set(scaleFactor, scaleFactor);
        container.position.x = (-bounds.x - bounds.width / 2) * scaleFactor + thumbnailSize.width / 2;
        container.position.y = (-bounds.y - bounds.height / 2) * scaleFactor + thumbnailSize.height / 2;

        const outerContainer = new Container();
        outerContainer.addChild(container);

        const blob = await this.renderDisplayObjectToBlob(outerContainer);

        // If renderStageToBlob() is used, ensure that the stage doesn't change before it is finished.
        /*
        const blob = await this.renderViaStageGate.executeWhenTokenIsFree(async () => {
            this.app.stage.addChild(outerContainer);
            const blob = await this.renderStageToBlob();
            this.app.stage.removeChild(outerContainer);
            return blob;
        });
        */

        displayObject.parent = null;

        return blob;
    }
}

let backgroundRenderer: BackgroundRenderer;

export function createBackgroundRenderer() {
    if (backgroundRenderer)
        return;

    backgroundRenderer = new BackgroundRenderer();

    /*
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.zIndex = "100000";
    backgroundRenderer.attach(div);
    document.body.appendChild(div);
    */
}

export function getOrCreateBackgroundRenderer() {
    createBackgroundRenderer();
    return backgroundRenderer;
}

export function disposeBackgroundRenderer() {
    if (backgroundRenderer) {
        backgroundRenderer.dispose();
        backgroundRenderer = null;
    }
}
if (module.hot) {
    const { data } = module.hot;
    if (data && data.parent) {
        createBackgroundRenderer();
        backgroundRenderer.attach(data.parent);
    }

    module.hot.dispose(data => {
        if (backgroundRenderer) {
            data.parent = backgroundRenderer.parentElement;
            disposeBackgroundRenderer();
        }
    });
}
