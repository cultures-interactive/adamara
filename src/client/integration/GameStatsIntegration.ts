import GameStats from "gamestats.js";
import * as PIXI from "pixi.js";

export class GameStatsIntegration {
    private stats: GameStats;
    private app: PIXI.Application;
    private parent: HTMLElement;

    private showing = false;

    private get shouldShow() {
        return Boolean(this.app && this.parent);
    }

    private ensureInitialization() {
        if (this.stats)
            return;

        this.stats = new GameStats({
            autoPlace: false, /* auto place in the dom */
            targetFPS: 60, /* the target max FPS */
            redrawInterval: 50, /* the interval in MS for redrawing the FPS graph */
            maximumHistory: 100, /* the length of the visual graph history in frames */
            scale: 1.0, /* the scale of the canvas */
            memoryUpdateInterval: 1000, /* the interval for measuring the memory */
            memoryMaxHistory: 60 * 10, /* the max amount of memory measures */

            // Styling props
            FONT_FAMILY: 'Arial',
            COLOR_FPS_BAR: '#34cfa2',
            COLOR_FPS_AVG: '#FFF',
            COLOR_TEXT_LABEL: '#FFF',
            COLOR_TEXT_TO_LOW: '#eee207',
            COLOR_TEXT_BAD: '#d34646',
            COLOR_TEXT_TARGET: '#d249dd',
            COLOR_BG: '#333333'
        });

        (this.stats as any).enableExtension('pixi', [PIXI, this.app]);
    }

    public registerPixiApp(app: PIXI.Application) {
        this.app = app;
        this.updateState();
    }

    public addGameStatsToDom(parent: HTMLElement) {
        this.parent = parent;
        this.updateState();
    }

    public removeGameStatsFromDom() {
        this.parent = null;
        this.updateState();
    }

    private updateState() {
        if (this.shouldShow === this.showing)
            return;

        if (this.shouldShow) {
            this.showing = true;
            this.ensureInitialization();
            this.parent.appendChild(this.stats.dom);
            this.app.renderer.on("prerender", this.onPrerender, this);
            this.app.renderer.on("postrender", this.onPostrender, this);
        } else {
            this.showing = false;
            this.stats.dom.remove();
            this.app.renderer.off("prerender", this.onPrerender, this);
            this.app.renderer.off("postrender", this.onPostrender, this);
        }
    }

    private onPrerender() {
        this.stats.begin();
    }

    private onPostrender() {
        this.stats.end();
    }
}

export const gameStats = new GameStatsIntegration();