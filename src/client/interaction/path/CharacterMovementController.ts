import { Character } from "../../canvas/game/character/Character";
import { CurveAnimator } from "./CurveAnimator";
import { gameConstants } from "../../data/gameConstants";
import { PathFinder } from "./PathFinder";
import { ReadonlyMapData } from "../../../shared/game/MapDataModel";
import { GameMapView } from "../../canvas/game/map/GameMapView";
import { PositionInterface, PositionModel, ReadonlyPosition } from "../../../shared/game/PositionModel";
import { DirectionHelper } from "../../../shared/resources/DirectionHelper";
import { applyIdleAnimation, applyWalkAnimation } from "../../canvas/game/character/characterAnimationHelper";
import { tileToWorldPositionX, tileToWorldPositionY, worldToTilePositionX, worldToTilePositionY } from "../../helper/pixiHelpers";
import { Vector } from "vector2d";
import { approximateTileIntersection, getClosestTileVertex } from "../../helper/intersectionHelper";
import { MovementGraphics } from "./MovementGraphics";
import { Container, Point } from "pixi.js";
import { CurveInterpolator2D } from "curve-interpolator";
import { MovementState } from "./MovementState";
import { TilePosition } from "../../../shared/definitions/other/TilePosition";
import { MathE } from "../../../shared/helper/MathExtension";
import EventEmitter from "eventemitter3";
import { DynamicMapElementAreaTriggerInterface } from "../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";

export interface CharacterMovementControllerEvents {
    startPath: [character: Character, currentPath: PositionInterface[]];
    enterTile: [character: Character, tileX: number, tileY: number, tilePlane: number, isBaseTile: boolean];
    leaveTile: [character: Character, tileX: number, tileY: number, tilePlane: number, isBaseTile: boolean];
    enterTriggerObject: [character: Character, trigger: DynamicMapElementAreaTriggerInterface];
    leaveTriggerObject: [character: Character, trigger: DynamicMapElementAreaTriggerInterface];
    pathAnimationUpdate: [character: Character, interpolationProgress: number];
    endPath: [character: Character];
    positionSetDirectly: [character: Character];
}

/**
 * This class can be used to control the movement of a {@link Character}.
 * It uses a {@link PathFinder} to find the path and a {@link CurveAnimator}
 * to create and animate the curve of the path. It triggers movement related
 * Events and contains the current {@link MovementState} of the {@link Character}.
 * Call the {@see onTick} method on every animation frame.
 */
export class CharacterMovementController {
    private curveAnimator = new CurveAnimator(gameConstants.playerSpeed);
    private movementGraphics = new MovementGraphics();
    private pathfinder: PathFinder<ReadonlyMapData, GameMapView>;
    private currentPath: Array<PositionInterface>;

    private mapView: GameMapView;

    public lastState: MovementState;
    public readonly currentState: MovementState;
    public isMoving: boolean;

    public events = new EventEmitter<CharacterMovementControllerEvents>();

    /**
     * Creates a new instance.
     * @param character The player to be controlled.
     */
    public constructor(private character: Character) {
        // register events
        this.curveAnimator.onStart = this.onPathAnimationStart.bind(this);
        this.curveAnimator.onUpdate = this.onPathAnimationUpdate.bind(this);
        this.curveAnimator.onEnd = this.onPathAnimationEnd.bind(this);

        this.lastState = new MovementState();
        this.currentState = new MovementState();
    }

    public walkOn(mapView: GameMapView) {
        this.pathfinder = new PathFinder<ReadonlyMapData, GameMapView>(mapView);
        this.mapView = mapView;
    }

    /**
     * Tries to move the {@link Character} to the assigned tile position. Returns false if
     * the position can not be reached.
     * @param targetPosition
     * @param ignoreViewBoundsCheck Also considers tiles that are not visible if true is assigned.
     * @param ignoreBlockingCharacters Also considers tiles that are not visible if true is assigned.
     * @param clickWorldPosition The mouse position in world coordinates. Can be passed if the movement was triggered by a mouse click.
     */
    public tryWalkTo(targetPosition: TilePosition, ignoreViewBoundsCheck = false, ignoreBlockingCharacters = false, clickWorldPosition: Point = null): boolean {
        if (!this.pathfinder) {
            console.warn("Can not walk. Pathfinder is not initialized.");
            return false;
        }
        const currentPosition = this.currentState.copyBasePosition();
        if (!targetPosition) return false;
        if (targetPosition.x == currentPosition.x && targetPosition.y == currentPosition.y && targetPosition.plane == currentPosition.plane) {
            if (clickWorldPosition) {
                // special case: Click on the current position -> idle in the closest direction.
                const idleDirection = getClosestTileVertex(clickWorldPosition.x, clickWorldPosition.y, tileToWorldPositionX(targetPosition.x, targetPosition.y, true), tileToWorldPositionY(targetPosition.x, targetPosition.y, true));
                applyIdleAnimation(this.character.animation, idleDirection);
            }
            return false;
        }
        const nextPath = this.pathfinder.findPath(currentPosition, new ReadonlyPosition(targetPosition), ignoreViewBoundsCheck, ignoreBlockingCharacters);
        if (nextPath) {
            this.currentPath = nextPath;
            this.curveAnimator.start(CurveAnimator.createCurveUsingBorderPoints(this.currentPath, new Vector(this.character.x, this.character.y)));
            this.events.emit("startPath", this.character, this.currentPath);
            this.isMoving = true;
            return true;
        }
        return false;
    }

    public stopWalk(triggerEndCallback = true) {
        this.currentPath = null;
        this.curveAnimator.stopHard(triggerEndCallback);
        this.movementGraphics.hide();
        this.isMoving = false;
        applyIdleAnimation(this.character.animation, this.character.getFacingDirection());
    }

    /**
     * Handles movement changes. Should be called on every game loop.
     * @param deltaTimeTicks The delta time since the last call.
     */
    public onTick(deltaTimeTicks: number) {
        this.curveAnimator.onTick(deltaTimeTicks);
        this.movementGraphics.onTick();
    }

    private onPathAnimationStart(curveWorldX: number, curveWorldY: number, curveAngleRad: number, curve: CurveInterpolator2D) {
        this.applyCurvePosition(curveWorldX, curveWorldY, curveAngleRad, true);
        this.events.emit("startPath", this.character, this.currentPath);
        this.isMoving = true;
        this.movementGraphics.startCurve(curve);
    }

    private onPathAnimationUpdate(curveWorldX: number, curveWorldY: number, curveAngleRad: number, interpolationProgress: number) {
        this.applyCurvePosition(curveWorldX, curveWorldY, curveAngleRad, true);
        this.events.emit("pathAnimationUpdate", this.character, interpolationProgress);
        this.movementGraphics.updateCurve();
    }

    private onPathAnimationEnd(curveWorldX: number, curveWorldY: number, curveAngleRad: number) {
        this.applyCurvePosition(curveWorldX, curveWorldY, curveAngleRad, false);
        this.character.applyFacingRotation(DirectionHelper.getAngleRad(this.character.getFacingDirection()));
        this.events.emit("endPath", this.character);
        this.isMoving = false;
        this.movementGraphics.hide();
    }

    public initGraphics(container: Container, showTargetIndicator = true) {
        this.movementGraphics.init(container, showTargetIndicator);
    }

    public detachGraphics(container: Container) {
        this.movementGraphics.detach(container);
    }

    public destroy() {
        this.movementGraphics.destroy();
    }

    private applyCurvePosition(curveWorldX: number, curveWorldY: number, curveAngleDeg: number, isWalking: boolean) {
        this.lastState = this.currentState.copy();

        // converting the curve position back to the actual tile in the path...
        const currentTileIndex = this.findCurrentTileIndexFromPath(curveWorldX, curveWorldY);
        const currentTile = this.getPathTile(currentTileIndex);
        const nextTile = this.getPathTile(currentTileIndex + 1);

        // apply the current position
        this.currentState.applyBasePosition(currentTile);

        // special case: check if a NPC has intercepted the current path
        if (this.character.isPlayer && this.pathfinder.getMapWalker().hasBlockingNPC(nextTile)) {
            this.character.adjustGraphicTo(currentTile);
            this.stopWalk(false);
            return;
        }

        // check for tile collisions and trigger events
        approximateTileIntersection(curveWorldX, curveWorldY, gameConstants.playerCollisionRadius, this.currentState);
        this.updateCurrentlyCollidingTriggers();
        this.triggerEvents(this.lastState, this.currentState);

        this.movementGraphics.highlight(this.currentState);

        // apply character properties
        this.character.setPosition(curveWorldX, curveWorldY);
        this.character.applyFacingRotation(curveAngleDeg * MathE.degToRad);
        if (isWalking) applyWalkAnimation(this.character.animation, this.character.getFacingDirection());
        else applyIdleAnimation(this.character.animation, this.character.getFacingDirection());
    }

    private triggerEvents(lastState: MovementState, currentState: MovementState) {
        this.triggerBaseTileEvents(lastState, currentState);
        this.triggerSecondaryTileEvents(lastState, currentState);
        this.triggerCollidingTriggerEvents(lastState, currentState);
    }

    private triggerBaseTileEvents(lastState: MovementState, currentState: MovementState) {
        if (!lastState.equalBaseTile(currentState)) {
            // enter
            this.events.emit("enterTile", this.character, currentState.baseTileX, currentState.baseTileY, currentState.baseTilePlane, true);
            // leave
            this.events.emit("leaveTile", this.character, lastState.baseTileX, lastState.baseTileY, lastState.baseTilePlane, true);
        }
    }

    private triggerSecondaryTileEvents(lastState: MovementState, currentState: MovementState) {
        // trigger secondary tile events.
        currentState.secondaryTiles.forEach(currentTile => {
            if (!lastState.containsSecondaryTile(currentTile.x, currentTile.y)) {
                // enter
                this.events.emit("enterTile", this.character, currentTile.x, currentTile.y, currentState.baseTilePlane, false);
            }
        });
        lastState.secondaryTiles.forEach(lastTile => {
            if (!currentState.containsSecondaryTile(lastTile.x, lastTile.y)) {
                // leave
                this.events.emit("leaveTile", this.character, lastTile.x, lastTile.y, lastState.baseTilePlane, false);
            }
        });

    }

    private triggerCollidingTriggerEvents(lastState: MovementState, currentState: MovementState) {
        currentState.collidingTriggers.forEach(object => {
            if (!lastState.containsCollidingTriggerWithId(object.id)) {
                this.events.emit("enterTriggerObject", this.character, object);
            }
        });
        lastState.collidingTriggers.forEach(object => {
            if (!currentState.containsCollidingTriggerWithId(object.id)) {
                this.events.emit("leaveTriggerObject", this.character, object);
            }
        });
    }

    private updateCurrentlyCollidingTriggers() {
        this.currentState.collidingTriggers.length = 0;
        if (!this.mapView) return;
        this.currentState.collidingTriggers = this.mapView.mapData.getAllAreaTriggersAtPositionXYPlane(this.currentState.baseTileX, this.currentState.baseTileY, this.currentState.baseTilePlane);
        this.currentState.secondaryTiles.forEach(vector => {
            const triggers = this.mapView.mapData.getAllAreaTriggersAtPositionXYPlane(vector.x, vector.y, this.currentState.baseTilePlane);
            this.currentState.collidingTriggers = [...this.currentState.collidingTriggers, ...triggers];
        });
    }

    /**
     * Searches in the current path to find a tile at the assigned position.
     * @param worldX A x position in world coordinates.
     * @param worldY A y position in world coordinates.
     * @return The index of the tile at the position or -1.
     */
    private findCurrentTileIndexFromPath(worldX: number, worldY: number): number {
        if (!this.currentPath)
            return null;

        const tileX = worldToTilePositionX(worldX, worldY);
        const tileY = worldToTilePositionY(worldX, worldY);
        for (let i = 0; i < this.currentPath.length; i++) {
            if (this.currentPath[i].x == tileX && this.currentPath[i].y == tileY) {
                return i;
            }
        }
        return -1;
    }

    private getPathTile(index: number): PositionInterface {
        if (!this.currentPath || index < 0 || index >= this.currentPath.length)
            return null;

        return this.currentPath[index];
    }

    /**
     * Sets the assigned {@link PositionInterface}.
     * Stops current movement.
     * @param tilePosition The position to set.
     */
    public setBasePosition(tilePosition: PositionInterface) {
        this.stopWalk(false);
        this.currentState.applyBasePosition(tilePosition);
        this.character.adjustGraphicTo(tilePosition);
        this.updateCurrentlyCollidingTriggers(); // this is to avoid EventEnterTriggerObject.
        this.lastState = this.currentState.copy();
        this.events.emit("positionSetDirectly", this.character);
    }

    /**
     * Tries to push the character away from the current base tile to the next
     * reachable neighbour tile. Returns false if there is no reachable neigbour.
     */
    public pushAway(): boolean {
        if (!this.pathfinder)
            return false;

        const currentPosition = this.currentState.copyBasePosition();
        let jumpDirection = -1;
        DirectionHelper.edgeDirections.forEach(direction => {
            if (this.pathfinder.getMapWalker().canCrossTile(currentPosition, direction) != null) {
                jumpDirection = direction;
            }
        });
        if (jumpDirection > -1) {
            const position = new PositionModel({
                x: currentPosition.x,
                y: currentPosition.y,
                plane: currentPosition.plane,
                layer: currentPosition.layer
            });
            const jumpPosition = DirectionHelper.createOffsetPosition(position, jumpDirection, 1);
            this.setBasePosition(jumpPosition);
            return true;
        }
        return false;
    }

}
