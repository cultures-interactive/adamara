import { Container, Graphics, Point, TextStyle, Text } from "pixi.js";
import { CircleGestureModel } from "../../../../shared/combat/gestures/CircleGestureModel";
import { LineGestureModel } from "../../../../shared/combat/gestures/LineGestureModel";
import { Gesture } from "../../../../shared/combat/gestures/GesturePatternModel";
import { screenToPatternCoordinatesFactor } from "../../../stores/CombatStore";

export class PatternView extends Container {

    private graphics: Graphics;
    private touchTrail: Graphics;
    private keyInput: Text;
    private lastPoint: Point;
    private animationStart: number;
    private animationVelocity: number;
    private animationCancelled = false;

    public constructor() {
        super();

        this.scale.set(screenToPatternCoordinatesFactor);

        this.graphics = new Graphics();
        this.touchTrail = new Graphics();

        this.keyInput = new Text("⬆", { fontSize: 400, strokeThickness: 12, stroke: "orange" });
        this.keyInput.position.set(30, 0);
        this.keyInput.scale.set(0.1);
        this.keyInput.visible = false;

        this.addChild(this.graphics, this.keyInput, this.touchTrail);
    }

    private drawGesture(graphics: Graphics, gesture: Gesture) {
        if (gesture instanceof LineGestureModel) {
            graphics.moveTo(gesture.from.x, gesture.from.y);
            graphics.lineTo(gesture.to.x, gesture.to.y);
        }
        if (gesture instanceof CircleGestureModel) {
            graphics.drawCircle(gesture.center.x, gesture.center.y, gesture.radius);
        }
    }

    public setGestures(gestures: Gesture[], finishedGesture: Gesture, patterCompleted: Gesture[], keyInput: string, color: number) {
        this.keyInput.visible = false;
        if (this.animationStart) {
            if (gestures) {
                this.animationCancelled = true;
                this.animationStart = null;
            } else {
                return;
            }
        }

        this.graphics.scale.set(1);
        this.graphics.position.set(0, 0);
        this.graphics.clear();
        this.graphics.lineStyle(2, color);
        this.endTouchTrail();

        if (gestures) {
            for (const gesture of gestures) {
                this.drawGesture(this.graphics, gesture);
                this.keyInput.text =
                    keyInput === "W" ? "⬆" :
                        keyInput === "A" ? "⬅" :
                            keyInput === "S" ? "⬇" :
                                keyInput === "D" ? "➡" : "";
                this.keyInput.style.fill = "orange";
                this.keyInput.visible = true;
            }
        } else if (patterCompleted) {
            for (const gesture of patterCompleted) {
                this.touchTrail.lineStyle(1, 0x00FF00);
                this.drawGesture(this.graphics, gesture);
                this.drawGesture(this.touchTrail, gesture);
            }
        }

        if (gestures && finishedGesture) {
            this.touchTrail.scale.set(1);
            this.touchTrail.position.set(0, 0);
            this.touchTrail.lineStyle(1, 0x00FF00);
            this.drawGesture(this.graphics, finishedGesture);
            this.drawGesture(this.touchTrail, finishedGesture);
        }
    }

    public startTouchTrail(p: Point) {
        if (this.animationStart)
            return;

        this.touchTrail.scale.set(1);
        this.touchTrail.position.set(0, 0);
        this.touchTrail.lineStyle(1.5, 0x00FF00);
        this.lastPoint = p.clone();
    }

    public extendTouchTrail(p: Point) {
        if (!this.lastPoint)
            return;

        this.touchTrail.moveTo(this.lastPoint.x, this.lastPoint.y);
        this.touchTrail.lineTo(p.x, p.y);
        this.lastPoint = p.clone();
    }

    public endTouchTrail() {
        if (this.animationStart)
            return;

        this.touchTrail.clear();
        this.lastPoint = null;
    }

    public animate(time: number, deltaTileX: number, deltaTileY: number) {
        this.keyInput.visible = false;
        if (this.animationCancelled)
            return;

        if (!this.animationStart) {
            this.animationStart = time;
            this.animationVelocity = 1.00000001;
        }

        const speedphase = 20;
        let factor: number;
        if (time <= speedphase) {
            this.animationVelocity *= this.animationVelocity;
            factor = 0.8 * (time / speedphase) / this.animationVelocity;
        } else {
            factor = 0.8 + 0.2 * ((time - speedphase) / (this.animationStart - speedphase));
        }

        const width = 100;
        const height = 50;

        let deltaX = (width / 4);
        let deltaY = (height / 4);
        if (deltaTileX == -1 && deltaTileY == 1) {
            deltaX *= 0;
            deltaY *= 2;
        }
        if (deltaTileX == -1 && deltaTileY == 0) {
            deltaX *= 1;
            deltaY *= 1;
        }
        if (deltaTileX == -1 && deltaTileY == -1) {
            deltaX *= 2;
            deltaY *= 0;
        }
        if (deltaTileX == 0 && deltaTileY == -1) {
            deltaX *= 3;
            deltaY *= 1;
        }
        if (deltaTileX == 1 && deltaTileY == -1) {
            deltaX *= 4;
            deltaY *= 2;
        }
        if (deltaTileX == 1 && deltaTileY == 0) {
            deltaX *= 3;
            deltaY *= 3;
        }
        if (deltaTileX == 1 && deltaTileY == 1) {
            deltaX *= 2;
            deltaY *= 4;
        }
        if (deltaTileX == 0 && deltaTileY == 1) {
            deltaX *= 1;
            deltaY *= 3;
        }
        if (deltaTileX == 0 && deltaTileY == 0) {
            // player
            deltaX *= 2;
            deltaY *= 2;
        }

        this.graphics.scale.set(factor);
        this.graphics.position.x = (1 - factor) * deltaX;
        this.graphics.position.y = (1 - factor) * deltaY;

        this.touchTrail.scale.set(this.graphics.scale.x);
        this.touchTrail.position.x = this.graphics.position.x;
        this.touchTrail.position.y = this.graphics.position.y;
    }

    public stopAnimate() {
        const wasAnimating = this.animationStart != null || this.animationCancelled;
        this.animationStart = null;
        this.animationCancelled = false;
        return wasAnimating;
    }

}