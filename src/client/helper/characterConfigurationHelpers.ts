import { CharacterConfigurationModel } from "../../shared/resources/CharacterConfigurationModel";
import { sharedStore } from "../stores/SharedStore";

export function makeCharacterConfigurationThumbnailVersion(character: CharacterConfigurationModel) {
    const animationId = sharedStore.getAnimationByName(character.animationAssetName)?.id;
    const animationSkins = character.animationSkins;
    const tintColorHex = character.tintColorHex;
    return animationId + animationSkins + tintColorHex;
}

