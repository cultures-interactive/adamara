import { ActionModel, PlaySoundActionModel } from "../../../../shared/action/ActionModel";
import { soundCache } from "../../../stores/SoundCache";
import { gameStore } from "../../../stores/GameStore";
import { LogEntry } from "../../../stores/LogEntry";
import { findSoundPathByTreeParameterName, findTreeParameterFor, resolvePotentialMapElementTreeParameter, mapSoundValuesToTreeParameterNames } from "../../../helper/treeParameterHelpers";
import { LoadedMap } from "../../../gameengine/LoadedMap";
import { Player } from "../character/Player";
import { MathE } from "../../../../shared/helper/MathExtension";
import { Sound } from "@pixi/sound";
import { Character } from "../character/Character";
import { Position2D } from "../../../data/Position2D";
import { Point } from "pixi.js";
import { ParsedPath } from "path";
import { ActionEditorChangeGroup, groupUndoableActionEditorChanges } from "../../../stores/undo/operation/ActionEditorSubmitChangesOp";
import { Arrays } from "../../../../shared/helper/Arrays";
import { runInAction } from "mobx";

/**
 * Contains information about a sound source that is currently active.
 */
export interface SoundSource {
    actionId?: string;
    reference?: Sound;
    soundName: string;
    rangeInTiles?: number;
    sourceTilePosition?: Position2D;
    loop: boolean;
    completeCallback?: () => void;
    debugOutputVolume: number;
    sourceElementId: string;
}

/**
 * Helper methods to handle {@link PlaySoundActionModel} actions.
 */
export class SoundActionHelper {

    private static SOUND_VOLUME_ON_MAX_RANGE = 0.1;

    /**
     * Handles the {@link PlaySoundActionModel} action. Should be called if this action gets executed.
     * @param action The action to handle.
     * @param player The player to calculate the sound distance.
     * @param loadedMap The loaded map to find the sound source position.
     */
    public static handleSoundAction(action: PlaySoundActionModel, player: Player, loadedMap: LoadedMap) {

        let soundName = action.filePath?.name;
        if (action.treeParameter) {
            const path = findSoundPathByTreeParameterName(action, action.treeParameter);
            soundName = path?.name;
        }

        const soundExists = soundCache.isCached(soundName);
        if (!soundExists) { // exit if the sound was not found
            gameStore.addLog(LogEntry.warnSoundNotFound(action));
            if (action.nextActions) gameStore.gameEngine.executeActions(action.nextActions, action);
            return;
        }

        // Note: Unfortunately the CompleteCallback of {@see Sound.play(..)} is not called if sounds get stopped manually.
        const completeCallback = () => {
            gameStore.removeSoundSourceByActionId(action.$modelId);
            if (action.hasExitFinish()) {
                gameStore.gameEngine.executeActions(action.exitFinished, action);
            }
        };

        const activeSound = SoundActionHelper.createActionSoundSource(action, soundName, loadedMap, completeCallback);
        if (activeSound) {
            // Stop all active sounds with the same source element
            if (activeSound.sourceElementId) {
                for (let i = gameStore.activeSoundSources.length - 1; i >= 0; i--) {
                    const activeSoundSource = gameStore.activeSoundSources[i];
                    if (activeSoundSource.sourceElementId === activeSound.sourceElementId) {
                        this.endActiveSound(i, false);
                    }
                }
            }

            const soundVolume = SoundActionHelper.calcActiveSoundVolume(activeSound, player.baseTileX, player.baseTileY);
            activeSound.reference = soundCache.play(activeSound.soundName, soundVolume, activeSound.loop, completeCallback);
            activeSound.debugOutputVolume = soundVolume;
            gameStore.addSoundSource(activeSound);
        }

        if (action.nextActions) gameStore.gameEngine.executeActions(action.nextActions, action);
    }

    /**
     * Should be called on every update while the {@link Player} is moving.
     * Updates the volume of {@link SoundSource}s and removes them if the player is out of range.
     * @param player The player to calculate the distance to the sounds.
     */
    public static handlePlayerMovement(player: Player) {
        let index = gameStore.getSoundSourceCount();
        while (index--) {
            const activeSound = gameStore.getSoundSourceByIndex(index);
            if (!activeSound.reference)
                return;

            const soundVolume = SoundActionHelper.calcActiveSoundVolume(activeSound, player.baseTileX, player.baseTileY);
            if (activeSound.loop) {
                // special case: stop and play if sound is looping.
                if (soundVolume <= 0) {
                    activeSound.reference.stop();
                } else if (!activeSound.reference.isPlaying) {
                    activeSound.reference = soundCache.play(activeSound.soundName, soundVolume, activeSound.loop, activeSound.completeCallback);
                }
            }
            activeSound.reference.volume = soundVolume;
            const newDebugOutputVolume = activeSound.reference.isPlaying ? soundVolume : null;
            if (newDebugOutputVolume !== activeSound.debugOutputVolume) {
                runInAction(() => {
                    activeSound.debugOutputVolume = activeSound.reference.isPlaying ? soundVolume : null;
                });
            }
        }
    }

    /**
     * Ends the {@link SoundSource} with the assigned index within the {@see gameStore.activeSoundSources} list.
     * @param index The index of the sound within the list.
     * @param callCompleteCallback Calls the complete callback of the sound if true is assigned.
     */
    private static endActiveSound(index: number, callCompleteCallback = true) {
        const activeSound = gameStore.getSoundSourceByIndex(index);
        gameStore.removeSoundSourceByIndex(index);
        activeSound.reference?.stop();
        if (callCompleteCallback) activeSound.completeCallback();
    }

    /**
     * Ends all {@link SoundSource} of the {@see gameStore.activeSoundSources} list.
     * @param callStopCallbacks Calls the complete callbacks of the sounds if true is assigned.
     */
    public static endAllActiveSounds(callStopCallbacks = false) {
        let index = gameStore.getSoundSourceCount();
        while (index--) SoundActionHelper.endActiveSound(index, callStopCallbacks);
    }

    /**
     * Returns the distance of the assigned {@link Character} to the assigned {@link SoundSource}
     * normalized to the range of the sound.
     * @param listenerTileX The tile x position of the listener.
     * @param listenerTileY The tile y position of the listener.
     * @param soundTileX The tile x position of the sound.
     * @param soundTileY The tile y position of the sound.
     * @param soundRangeInTiles The range of the sound in tiles.
     */
    private static calcNormalizedDistance(listenerTileX: number, listenerTileY: number, soundTileX: number, soundTileY: number, soundRangeInTiles: number): number {
        const distanceToSoundSource = MathE.distance(soundTileX, soundTileY, listenerTileX, listenerTileY);
        if (distanceToSoundSource == 0 && soundRangeInTiles == 0) return 0; // division if both components are 0 leads to NaN
        return distanceToSoundSource / soundRangeInTiles; // Note: division by 0 leads to infinity which is a correct result
    }

    /**
     * Calculates the volume of a sound by its normalized distance to the player.
     * @param normalizedDistance The distance between player and sound source.
     */
    private static calcVolumeByNormalizedDistance(normalizedDistance: number): number {
        if (normalizedDistance > 1) return 0;
        normalizedDistance = MathE.clamp(normalizedDistance, 0, 1);
        return (1 - (1 - SoundActionHelper.SOUND_VOLUME_ON_MAX_RANGE) * normalizedDistance);
    }

    public static calcVolume(listenerTileX: number, listenerTileY: number, sourceTileX: number, sourceTileY: number, soundRangeInTiles: number): number {
        const distance = SoundActionHelper.calcNormalizedDistance(listenerTileX, listenerTileY, sourceTileX, sourceTileY, soundRangeInTiles);
        return MathE.clamp(SoundActionHelper.calcVolumeByNormalizedDistance(distance), 0, 1);
    }

    public static calcActiveSoundVolume(activeSound: SoundSource, listenerTileX: number, listenerTileY: number): number {
        if (!activeSound.sourceTilePosition || activeSound.rangeInTiles < 0) return 1;
        return SoundActionHelper.calcVolume(listenerTileX, listenerTileY, activeSound.sourceTilePosition.x, activeSound.sourceTilePosition.y, activeSound.rangeInTiles);
    }

    /**
     * Creates a new {@link SoundSource} by the assigned parameters.
     * @param action The action that triggered the sound.
     * @param soundName: The name of the sound.
     * @param loadedMap The currently loaded map.
     * @param onCompleteCallback The callback that should be called if the sound stops.
     */
    private static createActionSoundSource(action: PlaySoundActionModel, soundName: string, loadedMap: LoadedMap, onCompleteCallback: () => void): SoundSource {
        let positionInterface: Position2D;
        const isSoundWithSource = action.sourcePosition?.isComplete() && action.rangeInTiles >= 0;
        let sourceElementId = null;
        if (isSoundWithSource) {
            if (gameStore.gameEngine.gameState.currentMap !== action.sourcePosition.mapId)
                return null;

            const potentialMapElement = resolvePotentialMapElementTreeParameter(action.sourcePosition, undefined, action);
            positionInterface = loadedMap.findExtendedMapMarkerPosition(potentialMapElement.elementId);
            sourceElementId = potentialMapElement.elementId;
        }

        return {
            actionId: action.$modelId,
            soundName: soundName,
            rangeInTiles: action.rangeInTiles,
            sourceTilePosition: positionInterface ? new Point(positionInterface.x, positionInterface.y) : null,
            loop: action.loopWhileInRange && !!positionInterface, // loop is only available for sounds with sources
            completeCallback: onCompleteCallback,
            reference: null,
            debugOutputVolume: null,
            sourceElementId
        } as SoundSource;
    }

    public static async startSoundSource(path: ParsedPath): Promise<void> {
        if (!path || !path.name || !path.base) {
            console.warn("Can not load sound with the path ", path);
            return;
        }

        await soundCache.loadSounds([path]);

        const volume = 1;
        const sound = soundCache.play(path.name, volume, true);
        const soundSource: SoundSource = {
            reference: sound,
            soundName: path.name,
            loop: true,
            debugOutputVolume: volume,
            sourceElementId: null
        };
        gameStore.addSoundSource(soundSource);
    }

    public static applySoundPathSelection(action: PlaySoundActionModel, path: ParsedPath) {
        groupUndoableActionEditorChanges(ActionEditorChangeGroup.UnspecificGroupedNodeChanges, () => {
            action.setFilePath(path);
            action.setTreeParameter(null);
        });
    }

    public static applySoundTreeParameterSelection(action: PlaySoundActionModel, treeParameterName: string) {
        groupUndoableActionEditorChanges(ActionEditorChangeGroup.UnspecificGroupedNodeChanges, () => {
            action.setFilePath(null);
            action.setTreeParameter(treeParameterName);
        });
    }

    /**
     * Searches for sound tree parameters in the parent of the assigned {@link ActionModel}.
     * @param action The action to search for tree parameters.
     */
    public static findSoundParameterNames(action: ActionModel): string[] {
        const paths = mapSoundValuesToTreeParameterNames(findTreeParameterFor(action, "actions/SoundValueModel")) as string[];
        return paths.map(item => item).filter(Arrays.uniqueEntries);
    }
}