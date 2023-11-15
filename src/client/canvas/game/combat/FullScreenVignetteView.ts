import { Container, Graphics, filters } from "pixi.js";
import { gameCanvasSize } from "../../../data/gameConstants";

export class FullScreenVignetteView extends Container {

    private screen: Graphics;

    public constructor() {
        super();

        this.screen = new Graphics();
        this.screen.filters = [new filters.NoiseFilter()];
        this.addChild(this.screen);
    }

    public reset() {
        this.screen.clear();
    }

    public fill(timer: number, color: number) {
        if (timer > 200)
            return;

        this.screen.clear();
        this.screen.lineStyle(200, color, 0.6).drawCircle(gameCanvasSize.width / 2, gameCanvasSize.height / 2, gameCanvasSize.width / 2 + timer);
    }
}