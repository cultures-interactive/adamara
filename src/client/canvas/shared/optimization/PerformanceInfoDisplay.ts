import { Container, Text, TextStyle } from "pixi.js";
import { ApplicationReference } from "../ApplicationReference";

const fpsGreenUntil = 55;
const fpsYellowUntil = 30;
const fpsOrangeUntil = 20;

export class PerformanceInfoDisplay extends Container {
    private appRef: ApplicationReference;

    private textFPS: Text;
    private textAvg: Text;
    private textMin: Text;
    private textMax: Text;

    private previousSecondMin = Number.MAX_VALUE;
    private previousSecondMax = Number.MIN_VALUE;
    private previousSecondAvgSum = 0;
    private previousSecondAvgCount = 0;

    private intervalTimeouts = new Array<any>();

    public constructor(appRef: ApplicationReference) {
        super();

        this.appRef = appRef;

        const textX = 35;
        let nextTextPositionY = 35;

        this.textFPS = this.createText(textX, nextTextPositionY);
        nextTextPositionY += this.textFPS.height;

        this.textMin = this.createText(textX, nextTextPositionY);
        nextTextPositionY += this.textFPS.height;

        this.textAvg = this.createText(textX, nextTextPositionY);
        nextTextPositionY += this.textFPS.height;

        this.textMax = this.createText(textX, nextTextPositionY);
        nextTextPositionY += this.textFPS.height;

        appRef.required.ticker.add(this.update, this);

        this.on("added", this.onAdded, this);
        this.on("removed", this.onRemoved, this);
    }

    private createText(x: number, y: number) {
        const text = new Text("", new TextStyle({
            fontSize: 16,
            fill: "white",
            strokeThickness: 2,
            fontFamily: "Consolas"
        }));
        text.position.set(x, y);
        this.addChild(text);
        return text;
    }

    private onAdded() {
        this.appRef.required.ticker.add(this.update, this);
        this.intervalTimeouts.push(setInterval(this.refreshLastSecondDataText.bind(this), 1000));
    }

    private onRemoved() {
        this.appRef.required.ticker?.remove(this.update, this);

        for (const timeout of this.intervalTimeouts) {
            clearTimeout(timeout);
        }
        this.intervalTimeouts.length = 0;
    }

    private update() {
        const fps = this.appRef.required.ticker.FPS;
        this.previousSecondMin = Math.min(this.previousSecondMin, fps);
        this.previousSecondMax = Math.max(this.previousSecondMax, fps);
        this.previousSecondAvgSum += fps;
        this.previousSecondAvgCount++;

        this.setValue(this.textFPS, "FPS", fps);
    }

    private refreshLastSecondDataText() {
        this.setValue(this.textMin, "Min", this.previousSecondMin);
        this.setValue(this.textMax, "Max", this.previousSecondMax);
        this.setValue(this.textAvg, "Avg", this.previousSecondAvgSum / this.previousSecondAvgCount);

        const fps = this.appRef.required.ticker.FPS;
        this.previousSecondMin = fps;
        this.previousSecondMax = fps;
        this.previousSecondAvgSum = fps;
        this.previousSecondAvgCount = 1;
    }

    private setValue(text: Text, label: string, value: number) {
        text.text = label + ": " + Math.floor(value).toString().padStart(2);
        if (value >= fpsGreenUntil) {
            text.style.fill = "lightgreen";
        } else if (value >= fpsYellowUntil) {
            text.style.fill = "yellow";
        } else if (value >= fpsOrangeUntil) {
            text.style.fill = "#ffb833"; // light orange
        } else {
            text.style.fill = "#ff6666"; // light red
        }
    }
}