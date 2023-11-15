import { Container, Graphics } from "pixi.js";
import { gameCanvasSize } from "../../../data/gameConstants";

export class FullScreenOverlayView extends Container {

    private screen: Graphics;
    private running = false;
    private timer = 0;
    private length = 0;

    public constructor() {
        super();

        this.screen = new Graphics();
        this.screen.visible = false;
        this.addChild(this.screen);
    }

    public start(color: number, length: number) {
        this.timer = 0;
        this.screen.clear();
        this.length = length;

        this.screen.beginFill(color, 0.5);
        this.screen.drawRect(0, 0, gameCanvasSize.width, gameCanvasSize.height);
        this.screen.endFill();

        this.screen.alpha = 1;
        this.screen.visible = true;
        this.running = true;
    }

    public flash(timer: number) {
        if (this.timer === 0) {
            this.timer = timer;
        }
        const newAlpha = timer / this.timer;
        if (newAlpha > this.screen.alpha) {
            this.running = false;
        } else {
            this.screen.alpha = newAlpha;
            this.running = timer > this.timer - this.length;
        }
        this.screen.visible = this.running;
    }
}