import { gameConstants } from "../../../data/gameConstants";
import { combatStore } from "../../../stores/CombatStore";
import { gameStore } from "../../../stores/GameStore";

export class KeyInputController {

    public constructor() {
        window.onkeydown = this.onKeyDown.bind(this);
        window.onkeyup = this.onKeyUp.bind(this);
    }

    public dispose() {
        window.onkeydown = null;
        window.onkeyup = null;
    }

    public onMove: { (deltaX: number, deltaY: number): void; };

    private currentlyPressed = {
        up: false,
        left: false,
        down: false,
        right: false
    };

    private onKeyDown(e: KeyboardEvent) {
        const { key } = e;
        const { inputKeys } = gameConstants;
        const { gameEngine } = gameStore;
        if (inputKeys.up.includes(key) && !this.currentlyPressed.up) {
            gameEngine.markPreviousDialogueAnswerForSelection();
            this.currentlyPressed.up = true;
            if (combatStore.active) {
                combatStore.keyInput("W");
            }
        }
        if (inputKeys.left.includes(key) && !this.currentlyPressed.left) {
            this.currentlyPressed.left = true;
            if (combatStore.active) {
                combatStore.keyInput("A");
            }
        }
        if (inputKeys.down.includes(key) && !this.currentlyPressed.down) {
            gameEngine.markNextDialogueAnswerForSelection();
            this.currentlyPressed.down = true;
            if (combatStore.active) {
                combatStore.keyInput("S");
            }
        }
        if (inputKeys.right.includes(key) && !this.currentlyPressed.right) {
            if (!gameEngine.selectDialogueAnswer(gameEngine.gameState.currentDialogueSelection)) {
                this.currentlyPressed.right = true;
            }
            if (combatStore.active) {
                combatStore.keyInput("D");
            }
        }
    }

    private onKeyUp(e: KeyboardEvent) {
        const { key } = e;
        const { inputKeys } = gameConstants;
        if (inputKeys.up.includes(key)) {
            this.currentlyPressed.up = false;
        }
        if (inputKeys.left.includes(key)) {
            this.currentlyPressed.left = false;
        }
        if (inputKeys.down.includes(key)) {
            this.currentlyPressed.down = false;
        }
        if (inputKeys.right.includes(key)) {
            this.currentlyPressed.right = false;
        }
    }

    public moveByKey() {
        let deltaX = 0;
        let deltaY = 0;
        if (this.currentlyPressed.up) {
            deltaY -= 1;
        }
        if (this.currentlyPressed.left) {
            deltaX -= 1;
        }
        if (this.currentlyPressed.down) {
            deltaY += 1;
        }
        if (this.currentlyPressed.right) {
            deltaX += 1;
        }

        if (deltaX || deltaY) {
            if (this.onMove) this.onMove(deltaX, deltaY);
        }
    }

}