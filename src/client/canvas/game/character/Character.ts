import { Container, IDestroyOptions, Point, Renderer } from "pixi.js";
import { gameConstants } from "../../../data/gameConstants";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";
import { GameMapView } from "../map/GameMapView";
import { PositionInterface } from "../../../../shared/game/PositionModel";
import { CharacterConfigurationModel } from "../../../../shared/resources/CharacterConfigurationModel";
import { animationLoader } from "../../../helper/AnimationLoader";
import { Direction, DirectionHelper } from "../../../../shared/resources/DirectionHelper";
import { CharacterMovementController } from "../../../interaction/path/CharacterMovementController";
import { applyIdleAnimation, CharacterDefaultIdleDirection } from "./characterAnimationHelper";
import { TilePosition } from "../../../../shared/definitions/other/TilePosition";
import { MathE } from "../../../../shared/helper/MathExtension";
import { Spine } from "@pixi-spine/all-4.1";
import { SkipCullingBeforeFirstRender } from "../../shared/optimization/cullingConfigurationInterfaces/SkipCullingBeforeFirstRender";
import { BoundsUpdateMode } from "../../shared/map/sorting/MapElementContainer";
import { createOrUpdateBoxFromAnimationData } from "../../../helper/mapElementSortingHelper";
import { sharedStore } from "../../../stores/SharedStore";
import { repeatCallUntilSuccess } from "../../../helper/asyncHelpers";
import { errorStore } from "../../../stores/ErrorStore";
import { HideableMapElementContainer } from "../../shared/optimization/cullingConfigurationInterfaces/HideableMapElementContainer";

/**
 * A class that represents a game character. Contains a {@link CharacterMovementController}
 * to control the movement. Should be initialized with a {@link Spine} character animation.
 */
export abstract class Character extends HideableMapElementContainer implements SkipCullingBeforeFirstRender {

    private spawnPosition: PositionInterface;
    protected facingRotationRad: number = DirectionHelper.getAngleRad(CharacterDefaultIdleDirection);
    protected readonly movementController: CharacterMovementController;
    private characterAnimation: Spine;
    public isPlayer = false;
    private applyConfigurationAttempt: number = 0;

    public skipCullingBeforeFirstRender = true;

    private configuration: CharacterConfigurationModel;

    private _loadingPromise: Promise<Spine>;

    public get characterMovementControllerEvents() {
        return this.movementController.events;
    }

    /**
     * Creates a new instance.
     */
    protected constructor(
        private overlayContainer: Container = null,
        private repeatLoadingUntilSuccess: boolean,
        private repeatLoadingUntilSuccessCancelled: () => boolean
    ) {
        super(BoundsUpdateMode.UpdateFromBox);
        this.movementController = new CharacterMovementController(this);
        this.applyFacingRotation(DirectionHelper.getAngleRad(CharacterDefaultIdleDirection));
    }

    /**
     * Applies the assigned {@link CharacterConfigurationModel}. Loads the characters animation.
     * @param configuration The configuration to apply.
     */
    public async applyConfiguration(configuration: CharacterConfigurationModel) {
        this.applyConfigurationAttempt++;

        this.configuration = configuration;

        if (!configuration) {
            this.destroyCurrentCharacterAnimation();
            return;
        }

        const currentAttempt = this.applyConfigurationAttempt;

        const load = () => animationLoader.loadCharacterAnimation(configuration);

        if (this.repeatLoadingUntilSuccess) {
            this._loadingPromise = repeatCallUntilSuccess(
                load,
                this.repeatLoadingUntilSuccessCancelled,
                errorStore.addErrorFromErrorObject
            );
        } else {
            this._loadingPromise = load();
        }

        const spine = await this._loadingPromise;

        // Don't add the result (and instead destroy it) if we have already started another loading attempt
        if (this.applyConfigurationAttempt !== currentAttempt) {
            spine.destroy({
                children: true,
                texture: false,
                baseTexture: false
            });
            return;
        }

        this.destroyCurrentCharacterAnimation();
        this.addChildAt(spine, 0);
        this.characterAnimation = spine;
        applyIdleAnimation(this.characterAnimation, this.getFacingDirection());

        this.onConfigurationApplied();

        this.refreshPartOfLoop();
    }

    protected onConfigurationApplied() {
    }

    private destroyCurrentCharacterAnimation() {
        // Destroy previous animation, if there is any
        if (!this.characterAnimation)
            return;

        this.characterAnimation.destroy({
            children: true,
            texture: false,
            baseTexture: false
        });

        this.characterAnimation = null;
    }

    public get loadingPromise() {
        return this._loadingPromise;
    }

    protected refreshScale() {
        if (!this.configuration)
            return;

        const animation = sharedStore.getAnimationByName(this.configuration.animationAssetName);
        if (!animation)
            return;

        const { scale } = animation;
        if (this.characterAnimation) {
            this.characterAnimation.scale.set(scale, scale);
        }
    }

    /**
     * Uses the assigned {@link PositionInterface} as the spawn position
     * and applies ths characters {@link Container} position to the tile.
     * @param position The tile position to spawn at.
     */
    public spawnAt(position: PositionInterface) {
        this.spawnPosition = position.clone();
        this.movementController.setBasePosition(position);
    }

    /**
     * Should be called if a new map was loaded.
     * Initializes the {@link GameMapView} where this character should walk on.
     * @param mapView The map view to walk on.
     */
    public onMapLoaded(mapView: GameMapView) {
        this.movementController.walkOn(mapView);
        this.movementController.initGraphics(this.overlayContainer, this.isPlayer);
    }

    /**
     * Should be called if a map was unloaded.
     * Detaches movement related graphics.
     */
    public onMapUnloaded() {
        this.movementController.detachGraphics(this.overlayContainer);
    }

    public destroy(options?: IDestroyOptions | boolean): void {
        super.destroy(options);
        this.movementController.destroy();
    }

    /**
     * Adjusts this {@link Container}s x and y position to
     * the assigned {@link PositionInterface}.
     * @param tilePosition The tile position to use.
     */
    private adjustGraphicPositionTo(tilePosition: PositionInterface) {
        if (!tilePosition) return;
        this.setPosition(tileToWorldPositionX(tilePosition.x, tilePosition.y, true),
            tileToWorldPositionY(tilePosition.x, tilePosition.y, true));
    }

    /**
     * Sets the absolute position of the player.
     * Notice: Is used by path animations. If you want to set the player position use: {@link spawnAt}.
     * @param worldX The x position in world coordinates.
     * @param worldY The y position in world coordinates.
     */
    public setPosition(worldX: number, worldY: number) {
        this.x = worldX;
        this.y = worldY;

        this.updateBox();
    }

    /**
     * Adjusts this {@link Container}s x and y position to
     * the assigned {@link PositionInterface}.
     * @param tilePosition The tile position to use.
     */
    public adjustGraphicTo(tilePosition: PositionInterface) {
        this.adjustGraphicPositionTo(tilePosition);
    }

    /**
     * Resets this character to the spawn position.
     */
    public resetToSpawnPosition() {
        this.movementController.setBasePosition(this.spawnPosition);
    }

    /**
     * Handles movement changes. Should be called on every game loop.
     * @param deltaTimeTicks The delta time since the last call.
     */
    public onTick(deltaTimeTicks: number) {
        this.movementController.onTick(deltaTimeTicks);
    }

    /**
     * Uses the {@link CharacterMovementController} to move this character.
     */
    public move(targetPosition: TilePosition, ignoreViewBoundsCheck = false, ignoreBlockingCharacters = false, clickWorldPosition: Point = null): boolean {
        return this.movementController.tryWalkTo(targetPosition, ignoreViewBoundsCheck, ignoreBlockingCharacters, clickWorldPosition);
    }

    public stop(triggerEndCallback = true) {
        this.movementController.stopWalk(triggerEndCallback);
    }

    /**
     * {@see CharacterMovementController.pushAway}
     */
    public pushAway(): boolean {
        return this.movementController.pushAway();
    }

    public shakeX(value: number) {
        this.setPosition(tileToWorldPositionX(this.baseTileX + value, this.baseTileY, true), this.y);
    }

    /**
     * Returns the current tile x position the player is intersecting.
     */
    public get baseTileX(): number {
        return this.movementController.currentState.baseTileX;
    }

    /**
     * Returns the current tile y position the player is intersecting.
     */
    public get baseTileY(): number {
        return this.movementController.currentState.baseTileY;
    }

    /**
     * Returns the current tile plane the player is intersecting.
     */
    public get baseTilePlane(): number {
        return this.movementController.currentState.baseTilePlane;
    }

    public get isMoving(): boolean {
        return this.movementController.isMoving;
    }

    public get isBlocking() {
        return !this.isHidden && !this.isMoving;
    }

    public copyBasePosition() {
        return this.movementController.currentState.copyBasePosition();
    }

    public get baseTilePosition(): TilePosition {
        return {
            x: this.baseTileX,
            y: this.baseTileY,
            plane: this.baseTilePlane
        };
    }

    /**
     * Returns from which position to which position the current animation frame stretches in the same
     * coordinate system as this.position (i.e. as a local position of the this.parent).
     * @param includeTile Should the full extents of the tile the animation is standing on be included?
     */
    public calculateCurrentAnimationExtents(includeTile: boolean) {
        const minPosition = this.position.clone();
        const maxPosition = minPosition.clone();

        if (this.characterAnimation) {
            const localBounds = this.characterAnimation?.getLocalBounds();
            const { x, y } = this.characterAnimation.position;
            minPosition.x += localBounds.left + x;
            minPosition.y += localBounds.top + y;
            maxPosition.x += localBounds.right + x;
            maxPosition.y += localBounds.bottom + y;

            if (includeTile) {
                minPosition.x = Math.min(minPosition.x, this.position.x - gameConstants.tileWidth / 2);
                minPosition.y = Math.min(minPosition.y, this.position.y - gameConstants.tileHeight / 2);
                maxPosition.x = Math.max(maxPosition.x, this.position.x + gameConstants.tileWidth / 2);
                maxPosition.y = Math.max(maxPosition.y, this.position.y + gameConstants.tileHeight / 2);
            }
        }

        return {
            minPosition,
            maxPosition
        };
    }

    /**
     * Returns the {@see Spine} animation of this character.
     */
    public get animation(): Spine {
        return this.characterAnimation;
    }

    /**
     * Returns the {@link Direction} this character is facing depending on the rotation.
     */
    public getFacingDirection(): Direction {
        return DirectionHelper.getFacingDirection(this.facingRotationRad * MathE.radToDeg);
    }

    /**
     * Sets the rotation of this character as radiant.
     * @param rotationRad Rotation angle as radiant.
     */
    public applyFacingRotation(rotationRad: number) {
        this.facingRotationRad = rotationRad;
    }

    public hide() {
        this.isHidden = true;
    }

    public show() {
        this.isHidden = false;
    }

    public render(renderer: Renderer): void {
        super.render(renderer);
        this.skipCullingBeforeFirstRender = false;
    }

    protected updateBox() {
        if (!this.configuration)
            return;

        const animation = sharedStore.getAnimationByName(this.configuration.animationAssetName);
        if (!animation)
            return;

        //const x = worldToTilePositionX(this.x, this.y, false);
        //const y = worldToTilePositionY(this.x, this.y, false);
        const x = this.baseTileX;
        const y = this.baseTileY;
        const plane = this.baseTilePlane;
        this.setBox(createOrUpdateBoxFromAnimationData(this.box, { x, y, plane }, animation));
    }
}
