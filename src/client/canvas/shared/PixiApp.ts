import { Application, GC_MODES, IApplicationOptions, Renderer } from "pixi.js";
import { EventEmitter } from "eventemitter3";
import { ReactionDisposerGroup } from "../../helper/ReactionDisposerGroup";
import { PerformanceInfoDisplay } from "./optimization/PerformanceInfoDisplay";
import { autorun } from "mobx";
import { Stage as PixiLayersStage } from "@pixi/layers";
import { getInteractionManagerFromApplication } from "../../helper/pixiHelpers";
import { ApplicationReference } from "./ApplicationReference";
import * as Sentry from "@sentry/react";
import { ErrorType } from "../../stores/editor/ErrorNotification";
import { localSettingsStore } from "../../stores/LocalSettingsStore";
import { errorStore } from "../../stores/ErrorStore";
import { gameStats } from "../../integration/GameStatsIntegration";

const debugLifecycle = false;

interface GlobalAppData {
    app: Application;
    free: boolean;
}

export enum AppContext {
    Main,
    AnimationPreview
}

const globalAppDataByContext = new Map<AppContext, GlobalAppData>();

function createApp(options: IApplicationOptions) {
    const app = new Application(options);
    app.view.addEventListener("webglcontextlost", () => {
        const message = "WebGL Context Lost";
        Sentry.captureMessage(message, "error");
        errorStore.addError(ErrorType.General, "editor.untranslated_client_error", { error: message });
    });

    gameStats.registerPixiApp(app);

    if (window.TouchEvent) {
        // NOTE(Lena): This hack is needed so touch events are fired on non-mobile platforms, like Microsoft Surface Tablets where
        // for some reason supportsTouchEvents is false despite touch events being available.
        // supportsTouchEvents is normally a readonly property, see: https://api.pixijs.io/@pixi/interaction/src/InteractionManager.ts.html#215
        (app.renderer.plugins.interaction as any).supportsTouchEvents = true;
        // Calling setTargetElement() recreates the event listeners.
        app.renderer.plugins.interaction.setTargetElement(app.renderer.view, app.renderer.resolution);
    }

    return app;
}

function getOrCreateGlobalAppData(appContext: AppContext) {
    let globalAppData = globalAppDataByContext.get(appContext);
    if (!globalAppData) {
        globalAppData = {
            app: null,
            free: true
        };
        globalAppDataByContext.set(appContext, globalAppData);
    }
    return globalAppData;
}

function getApp(appContext: AppContext, options: PixiAppOptions) {
    const globalAppData = getOrCreateGlobalAppData(appContext);

    if (!globalAppData.free)
        throw new Error("globalApp was not freed before it was reused");

    globalAppData.free = false;

    if (!globalAppData.app) {
        globalAppData.app = createApp({
            width: options.width,
            height: options.height
        });
    } else {
        if (options.width || options.height) {
            const { renderer } = globalAppData.app;
            renderer.resize(options.width || renderer.width, options.height || renderer.height);
        }
    }

    (globalAppData.app.renderer as Renderer).textureGC.mode = options.manualTextureGarbageCollectionMode ? GC_MODES.MANUAL : GC_MODES.AUTO;

    return globalAppData.app;
}

function freeApp(appContext: AppContext) {
    const globalAppData = getOrCreateGlobalAppData(appContext);

    if (!globalAppData.app)
        throw new Error("freeApp was called despite not having an app");

    if (globalAppData.free)
        throw new Error("globalApp was freed twice");

    globalAppData.free = true;
}

interface PixiAppOptions {
    width?: number;
    height?: number;
    manualTextureGarbageCollectionMode?: boolean;
}

export class PixiApp extends EventEmitter {
    public static readonly EventAttached = "EventAttached";
    public static readonly EventDetached = "EventDetached";

    protected creationTime: string;
    protected app: Application;
    protected appReference: ApplicationReference;

    private performanceInfoDisplay: PerformanceInfoDisplay;

    protected isAttached: boolean;

    protected reactionDisposers = new ReactionDisposerGroup();

    protected wasDisposed = false;

    public constructor(
        protected debugName: string,
        private appContext: AppContext,
        options: PixiAppOptions
    ) {
        super();

        this.creationTime = Date.now().toString();
        this.lifecycleDebugOutput("created");

        const app = getApp(appContext, options);
        this.app = app;
        this.app.renderer.backgroundColor = 0x000000;

        this.appReference = new ApplicationReference(app);

        const stage = new PixiLayersStage();
        stage.sortableChildren = true;
        this.app.stage = stage;

        this.app.ticker.start();
        this.app.start();

        this.reactionDisposers.push(autorun(this.showPerformanceInfoRefresher.bind(this)));
    }

    public attach(parent: HTMLElement) {
        if (this.app.view.parentElement === parent)
            return;

        this.isAttached = true;

        this.lifecycleDebugOutput(`attaching to ${parent}`);

        parent.appendChild(this.app.view);

        this.emit(PixiApp.EventAttached);

        // Render once to avoid flashing when the initial state is once shown
        this.app.render();
    }

    public detach() {
        if (!this.isAttached)
            return;

        this.isAttached = false;

        this.lifecycleDebugOutput("detaching");

        this.app.view.remove();

        this.emit(PixiApp.EventDetached);
    }

    public dispose() {
        this.lifecycleDebugOutput("disposing...");

        this.detach();

        this.app.stage.destroy({
            children: true,
            texture: false,
            baseTexture: false
        });
        this.app.stage = null;

        this.app.ticker.stop();
        this.app.stop();

        const interactionManager = getInteractionManagerFromApplication(this.app);
        interactionManager.removeAllListeners();

        this.reactionDisposers.disposeAll();

        this.wasDisposed = true;
        this.appReference.invalidate();
        this.app = null;

        freeApp(this.appContext);

        this.lifecycleDebugOutput("disposed");
    }

    public get parentElement() {
        return this.app.view.parentElement;
    }

    private lifecycleDebugOutput(message: string) {
        if (debugLifecycle)
            console.log("[" + this.debugName + " #" + this.creationTime + "] " + message);
    }

    public showPerformanceInfoRefresher() {
        const { showPerformanceInfo } = localSettingsStore;
        if (showPerformanceInfo === !!this.performanceInfoDisplay)
            return;

        if (showPerformanceInfo) {
            this.performanceInfoDisplay = new PerformanceInfoDisplay(this.appReference);
            this.performanceInfoDisplay.zIndex = 1000000;
            this.app.stage.addChild(this.performanceInfoDisplay);
        } else {
            this.performanceInfoDisplay.destroy({ children: true });
            this.performanceInfoDisplay = null;
        }
    }

    /**
     * Collects all textures that were not rendered (or otherwise used, I assume) in the last
     * `textureGC.maxIdle` frames. The default value of `textureGC.maxIdle` is `settings.GC_MAX_IDLE`,
     * whose default value is `3600` (at 60 FPS that's 1 minute).
     * 
     * @param maxIdleFramesOverride Overrides maxIdle for this garbage collection call.
     */
    public triggerManualTextureGarbageCollection(maxIdleFramesOverride: number = undefined) {
        const { textureGC } = (this.app.renderer as Renderer);

        const previousMaxIdle = textureGC.maxIdle;
        if (maxIdleFramesOverride !== undefined) {
            textureGC.maxIdle = maxIdleFramesOverride;
        }

        textureGC.run();

        if (maxIdleFramesOverride !== undefined) {
            textureGC.maxIdle = previousMaxIdle;
        }
    }
}

/*
// tw: This doesn't work, and I have no idea why, so for now, it'll stay in all extending classes
export function makeHot(instance: PixiApp, hot?: __WebpackModuleApi.Hot) {
    if (hot) {
        const { data } = hot;
        if (data) {
            instance.attach(data.parent);
        }

        module.hot.dispose(data => {
            data.parent = instance.app.view.parentElement;
            instance.dispose();
        });
    }
}
*/
