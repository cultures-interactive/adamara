import { Arrays } from "../../shared/helper/Arrays";
import { AnimationType } from "../../shared/resources/AnimationAssetModel";
import { CharacterConfigurationModel } from "../../shared/resources/CharacterConfigurationModel";
import { editorStore } from "../stores/EditorStore";
import { sharedStore } from "../stores/SharedStore";
import { animationLoader } from "./AnimationLoader";
import { CharacterSelectionHelper } from "./CharacterSelectionHelper";

export async function createRandomBodyTypeCharacter() {
    const animations = sharedStore.getAnimationsByType(AnimationType.BodyType);
    if (animations.length === 0)
        return null;

    const defaultAnimation = Arrays.randomItem(animations);
    const animationData = await animationLoader.loadAnimationDataCached(defaultAnimation.id);
    const snapshot = CharacterConfigurationModel.newSnapshot(defaultAnimation?.name, editorStore.sessionModuleId);
    const configuration = CharacterConfigurationModel.fromSnapshot(snapshot);

    CharacterSelectionHelper.randomizeSkinSelection(
        animationData.skins,
        configuration
    );

    return configuration;
}