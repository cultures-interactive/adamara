import { FadeCameraActionModel, SetCameraActionModel, ShakeCameraActionModel } from "../../../../shared/action/ActionModel";
import { MathE } from "../../../../shared/helper/MathExtension";
import { LogEntry } from "../../../stores/LogEntry";
import { AnimatedMoveCamera } from "../camera/AnimatedMoveCamera";
import { LoadedMap } from "../../../gameengine/LoadedMap";
import { AnimatedShakeCamera } from "../camera/AnimatedShakeCamera";
import { resolvePotentialMapElementTreeParameter } from "../../../helper/treeParameterHelpers";
import { gameStore } from "../../../stores/GameStore";
import { calcCanvasCenteredPosition } from "../../../helper/pixiHelpers";
import { Player } from "../character/Player";

/**
 * A controller to execute camera related actions.
 */
export class CameraController {

    /**
     * Starts the camera move animation. Executes next {@link SelectableExitModel}s afterwards.
     * @param action The shake action to start.
     * @param loadedMap The map to find potential camera targets.
     */
    public static startCameraMove(action: SetCameraActionModel, player: Player, loadedMap: LoadedMap) {
        if (gameStore.cameraIsAnimating) {
            gameStore.addLog(LogEntry.warnCameraIsInUse(action));
        }

        gameStore.setCameraIsAnimating(true);

        let targetPosition;
        if (action.isTargetSet() && gameStore.gameEngine.gameState.currentMap == action.targetLocation.mapId) {
            const potentialMapElement = resolvePotentialMapElementTreeParameter(action.targetLocation, undefined, action);
            const positionInterface = loadedMap.findExtendedMapMarkerPosition(potentialMapElement.elementId);
            if (positionInterface) targetPosition = positionInterface;
        }
        const animationCamera = AnimatedMoveCamera.createByTileTarget(gameStore.currentCamera, targetPosition,
            action.targetZoomFactor, action.cameraMovementSpeedFactor);
        gameStore.setCurrentCamera(animationCamera);
        animationCamera.startAnimation(() => {
            gameStore.addLog(LogEntry.byCameraTargetReached(action));
            if (action.returnToMainCamera) {
                const target = calcCanvasCenteredPosition(player.position, gameStore.playerCamera.getZoom());
                gameStore.playerCamera.setPosition(target);
                const returnCamera = AnimatedMoveCamera.createByCameraTarget(gameStore.currentCamera, gameStore.playerCamera, action.cameraMovementSpeedFactor);
                gameStore.setCurrentCamera(returnCamera);
                returnCamera.startAnimation(() => {
                    gameStore.enablePlayerCamera();
                    gameStore.addLog(LogEntry.byCameraReturned(action));
                    gameStore.setCameraIsAnimating(false);
                    gameStore.gameEngine.executeActions(action.onEndExit, action);
                });
            } else {
                gameStore.setCameraIsAnimating(false);
                gameStore.gameEngine.executeActions(action.onEndExit, action);
            }
        });

        gameStore.gameEngine.executeActions(action.onStartExit, action);
    }

    /**
     * Starts the camera shake animation. Executes next {@link SelectableExitModel}s afterwards.
     * @param action The shake action to start.
     */
    public static startCameraShake(action: ShakeCameraActionModel) {
        if (gameStore.cameraIsAnimating) {
            gameStore.addLog(LogEntry.warnCameraIsInUse(action));
        }

        gameStore.setCameraIsAnimating(true);
        const camera = new AnimatedShakeCamera(gameStore.currentCamera.getX(), gameStore.currentCamera.getY(), gameStore.currentCamera.getZoom());
        gameStore.setCurrentCamera(camera);
        camera.startAnimation(action.durationSeconds, action.intensity, action.fadeOut, () => {
            gameStore.enablePlayerCamera();
            gameStore.addLog(LogEntry.byCameraShaked(action));
            gameStore.setCameraIsAnimating(false);
            gameStore.gameEngine.executeActions(action.onEndExit, action);
        });

        gameStore.gameEngine.executeActions(action.onStartExit, action);
    }

    /**
     * Starts the assigned fade animation. Executes next {@link SelectableExitModel}s afterwards.
     * @param action The fade action to start.
     */
    public static startFade(action: FadeCameraActionModel, wasDisposed: () => boolean) {
        if (gameStore.gameEngine.gameState.actionPropertyOverlayOpacity > 0 && gameStore.gameEngine.gameState.actionPropertyOverlayOpacity < 1) {
            gameStore.addLog(LogEntry.warnSameActionAlreadyRunning(action));
            return;
        }

        if (action.withDuration) {
            gameStore.gameEngine.gameState.setActionPropertyOverlayOpacity(action.fadeIn ? 0.0001 : 0.9999);
            gameStore.gameEngine.executeActions(action.onStartExit, action);
            const intervalId = setInterval(() => {
                if (wasDisposed()) {
                    clearInterval(intervalId);
                    return;
                }

                const delta = action.fadeIn ? FadeCameraActionModel.FADE_STEP : -FadeCameraActionModel.FADE_STEP;
                const nextIntensity = MathE.limit(0, 1, gameStore.gameEngine.gameState.actionPropertyOverlayOpacity + delta);
                gameStore.gameEngine.gameState.setActionPropertyOverlayOpacity(nextIntensity);
                if ((action.fadeIn && nextIntensity >= 1) || (!action.fadeIn && nextIntensity <= 0)) {
                    clearInterval(intervalId);
                    gameStore.addLog(LogEntry.byCameraOverlayFaded(action, action.fadeIn));
                    gameStore.gameEngine.executeActions(action.onEndExit, action);
                }
            }, FadeCameraActionModel.FADE_INTERVAL_MILLIS);
        } else {
            gameStore.gameEngine.executeActions(action.onStartExit, action);
            gameStore.gameEngine.gameState.setActionPropertyOverlayOpacity(action.fadeIn ? 1 : 0);
            gameStore.addLog(LogEntry.byCameraOverlayFaded(action, action.fadeIn));
            gameStore.gameEngine.executeActions(action.onEndExit, action);
        }

    }
}