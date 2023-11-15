import { DisplayObject } from "pixi.js";
import { wait } from "../../../shared/helper/generalHelpers";
import { animationLoader } from "../../helper/AnimationLoader";
import { TokenGate } from "../../helper/asyncHelpers";
import { makeCharacterConfigurationThumbnailVersion } from "../../helper/characterConfigurationHelpers";
import { editorStore } from "../../stores/EditorStore";
import { sharedStore } from "../../stores/SharedStore";
import { createBackgroundRenderer, getOrCreateBackgroundRenderer } from "./BackgroundRenderer";

const maxSimultaneousRendering = 1;

export interface BackgroundRendererResult {
    imageBlob: Blob;
    version: string;
}

export class BackgroundRendererManager {
    private tokenGate = new TokenGate(maxSimultaneousRendering);

    public async renderAnimation(animationName: string, abortSignal: AbortSignal) {
        return this.render(async () => ({
            displayObject: await animationLoader.getSpineFromAnimationName(animationName),
            version: null
        }), abortSignal);
    }

    public async renderCharacter(id: number, abortSignal: AbortSignal) {
        return this.render(async () => {
            const characterConfiguration = sharedStore.characterConfigurations.get(id);
            const spine = await animationLoader.loadCharacterAnimation(characterConfiguration);
            const animationName = "idleEast";
            if (spine.state.hasAnimation(animationName)) {
                spine.state.setAnimation(0, animationName, true);
            }
            spine.update(1);
            return {
                displayObject: spine,
                version: makeCharacterConfigurationThumbnailVersion(characterConfiguration)
            };
        }, abortSignal);
    }

    private async render(generateDisplayObject: () => Promise<{ displayObject: DisplayObject; version: string; }>, abortSignal: AbortSignal): Promise<BackgroundRendererResult> {
        // If not connected, silently fail (by returning an empty result)
        if (!editorStore.isConnected || abortSignal.aborted)
            return null;

        return this.tokenGate.executeWhenTokenIsFree(async () => {
            // If not connected, silently fail (by returning an empty result)
            if (!editorStore.isConnected || abortSignal.aborted)
                return null;

            // Wait a very short time to make sure that this queue isn't triggering again and again in case something in
            // generateDisplayObject errors.
            await wait(1);

            const { displayObject, version } = await generateDisplayObject();
            try {
                if (abortSignal.aborted)
                    return null;

                createBackgroundRenderer();
                const imageBlob = await getOrCreateBackgroundRenderer().render(displayObject);
                if (abortSignal.aborted)
                    return null;

                return { imageBlob, version };
            } finally {
                displayObject.destroy();
            }
        });
    }
}

export const backgroundRendererManager = new BackgroundRendererManager();