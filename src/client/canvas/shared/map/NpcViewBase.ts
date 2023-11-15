import { DynamicMapElementNPCInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { Character } from "../../game/character/Character";
import { Container } from "pixi.js";
import { ViewAreaController } from "./ViewAreaController";
import { IDestroyOptions } from "@pixi/display";
import { ReadonlyPosition } from "../../../../shared/game/PositionModel";
import { gameStore } from "../../../stores/GameStore";
import { sharedStore } from "../../../stores/SharedStore";
import { errorStore } from "../../../stores/ErrorStore";
import { applyIdleAnimation } from "../../game/character/characterAnimationHelper";
import { DirectionHelper } from "../../../../shared/resources/DirectionHelper";

export abstract class NpcViewBase extends Character {

    protected npcData: DynamicMapElementNPCInterface;
    public npcName: string;
    protected viewAreaGraphicController = new ViewAreaController();

    private viewAreasVisible = false;

    public get viewAreaControllerEvents() {
        return this.viewAreaGraphicController.events;
    }

    protected baseRefreshMethods = [
        this.refreshName,
        this.refreshPosition,
        this.refreshSpineAnimation,
        this.refreshViewAreas,
        this.refreshInitialFacingDirection
    ];

    protected configurationRelatedRefreshMethods = [
        this.updateBox,
        this.refreshScale
    ];

    protected constructor(
        data: DynamicMapElementNPCInterface,
        overlayContainer: Container,
        repeatLoadingUntilSuccess: boolean,
        repeatLoadingUntilSuccessCancelled: () => boolean
    ) {
        super(overlayContainer, repeatLoadingUntilSuccess, repeatLoadingUntilSuccessCancelled);
        this.viewAreaGraphicController.setOverlayContainer(overlayContainer);
        this.npcData = data;
    }

    private refreshViewAreas() {
        this.viewAreaGraphicController.init(this.npcData.viewAreaTriggers);
        this.viewAreaGraphicController.updateTransform(this.x, this.y, this.facingRotationRad);
    }

    protected refreshInitialFacingDirection() {
        const direction = this.npcData.initialFacingDirection;
        this.applyFacingRotation(DirectionHelper.getAngleRad(direction));

        if (this.animation)
            applyIdleAnimation(this.animation, direction);
    }

    // override
    public setPosition(worldX: number, worldY: number) {
        super.setPosition(worldX, worldY);
        this.viewAreaGraphicController?.updateTransform(this.x, this.y, this.facingRotationRad);
    }

    // override
    public applyFacingRotation(rotationRad: number) {
        super.applyFacingRotation(rotationRad);
        this.viewAreaGraphicController?.updateTransform(this.x, this.y, this.facingRotationRad);
    }

    // override
    public destroy(options?: IDestroyOptions | boolean): void {
        super.destroy(options);
        this.viewAreaGraphicController?.destroy();
    }

    public showViewAreas() {
        this.viewAreasVisible = true;
        this.refreshViewAreaVisibility();
    }

    public hideViewAreas() {
        this.viewAreasVisible = false;
        this.refreshViewAreaVisibility();
    }

    public show() {
        super.show();
        this.refreshViewAreaVisibility();
    }

    public hide() {
        super.hide();
        this.refreshViewAreaVisibility();
    }

    private refreshViewAreaVisibility() {
        if (this.viewAreasVisible && !this.isHidden) {
            this.viewAreaGraphicController?.showGraphics();
        } else {
            this.viewAreaGraphicController?.hideGraphics();
        }
    }

    public checkViewIntersections(worldX: number, worldY: number) {
        this.viewAreaGraphicController?.checkViewIntersections(worldX, worldY);
    }

    public get $modelId() {
        return this.npcData.$modelId;
    }

    public get characterId() {
        return this.npcData.characterId;
    }

    public setNPCDataPosition(position: ReadonlyPosition) {
        this.npcData.position = position;
    }

    private refreshName() {
        const character = sharedStore.characterConfigurations.get(this.npcData.characterId);
        if (character) {
            this.npcName = character.localizedName.get(gameStore.languageKey);
        } else {
            this.npcName = `[Deleted Character #${this.npcData.characterId}]`;
        }
    }

    protected refreshPosition() {
        this.spawnAt(this.npcData.position);
    }

    private refreshSpineAnimation() {
        const character = sharedStore.characterConfigurations.get(this.npcData.characterId);
        if (character) {
            this.applyConfiguration(character).catch(errorStore.addErrorFromErrorObject);
        }
    }
}
