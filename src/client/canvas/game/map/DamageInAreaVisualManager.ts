import { TriggerDamageInAreaActionModel } from "../../../../shared/action/ActionModel";
import { TilePosition } from "../../../../shared/definitions/other/TilePosition";
import { destroyDisplayObject } from "../../../helper/pixiHelpers";
import { Pool } from "../../../helper/Pool";
import { resolvePotentialMapElementTreeParameter } from "../../../helper/treeParameterHelpers";
import { gameStore } from "../../../stores/GameStore";
import { DamageOnTileVisual } from "./DamageOnTileVisual";

export class DamageInAreaVisualManager {
    private inUse = new Map<TriggerDamageInAreaActionModel, Array<DamageOnTileVisual>>();
    private pool: Pool<DamageOnTileVisual>;

    public constructor(
        addToContainer: (visual: DamageOnTileVisual) => void,
        private readonly getAreaTriggerPositions: (id: string) => TilePosition[]
    ) {
        this.pool = new Pool<DamageOnTileVisual>(
            () => new DamageOnTileVisual(),
            destroyDisplayObject,
            addToContainer,
            object => object.parent?.removeChild(object)
        );
    }

    public update(elapsedS: number) {
        for (const visuals of this.inUse.values()) {
            for (const visual of visuals) {
                visual.update(elapsedS);
            }
        }
    }

    public startCountdown(action: TriggerDamageInAreaActionModel, delay: number, delayLeft: number) {
        const visuals = this.getVisualsForAction(action, true);
        for (const visual of visuals) {
            visual.showCountdownIndicator(delay, delayLeft);
        }
    }

    public startTriggering(action: TriggerDamageInAreaActionModel) {
        const visuals = this.getVisualsForAction(action, true);
        for (const visual of visuals) {
            visual.showTriggeringIndicator();
        }
    }

    public finish(action: TriggerDamageInAreaActionModel, zeroDuration: boolean) {
        const visuals = this.getVisualsForAction(action, false);
        if (visuals) {
            this.inUse.delete(action);
            for (const visual of visuals) {
                this.pool.free(visual);
            }
        }
    }

    public finishAll() {
        for (const visuals of this.inUse.values()) {
            for (const visual of visuals) {
                this.pool.free(visual);
            }
        }
        this.inUse.clear();
    }

    public destroy() {
        this.inUse = null;

        this.pool.destroyCurrentlyInUseObjects();
        this.pool.destroyFreedObjects();
        this.pool = null;
    }

    private getVisualsForAction(action: TriggerDamageInAreaActionModel, createIfEmpty: boolean) {
        let visuals = this.inUse.get(action);

        if (!visuals && createIfEmpty) {
            visuals = [];
            this.inUse.set(action, visuals);
            const { rootActionTree, gameState } = gameStore.gameEngine;
            const mapElement = resolvePotentialMapElementTreeParameter(action.mapElement, "actions/AreaTriggerValueModel", action);
            if (mapElement.mapId === gameState.currentMap) {
                const triggerId = mapElement.elementId;
                const positions = this.getAreaTriggerPositions(triggerId);
                for (const position of positions) {
                    const visual = this.pool.getOrCreate();
                    visual.tilePosition = position;
                    visuals.push(visual);
                }
            }
        }

        return visuals;
    }
}
