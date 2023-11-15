import { autorun, makeAutoObservable } from "mobx";
import { AnimationSelectionStore } from "./AnimationSelectionStore";
import { CharacterConfigurationModel } from "../../shared/resources/CharacterConfigurationModel";
import { sharedStore } from "./SharedStore";
import { errorStore } from "./ErrorStore";
import { editorClient } from "../communication/EditorClient";

export class CharacterEditorStore {
    public readonly animationSelectionStore = new AnimationSelectionStore();
    public selectedCharacterConfiguration: CharacterConfigurationModel;

    public constructor(
        public readonly isTracking: boolean
    ) {
        makeAutoObservable(this, {}, { autoBind: true });
        autorun(() => {
            this.update();
        });
    }

    private update() {
        if (!this.selectedCharacterConfiguration)
            return;

        const animation = sharedStore.getAnimationByName(this.selectedCharacterConfiguration.animationAssetName);

        if (animation) {
            this.animationSelectionStore.setSelectedAnimation(animation).catch(errorStore.addErrorFromErrorObject);
            this.animationSelectionStore.setSkinSelection(this.selectedCharacterConfiguration.animationSkins.split(","));
            this.animationSelectionStore.setSkinTint(this.selectedCharacterConfiguration.tintColorHex);
        }
    }

    public setSelectedCharacter(char: CharacterConfigurationModel) {
        if (this.selectedCharacterConfiguration == char)
            return;

        if (this.isTracking) {
            editorClient.stopTrackingCharacterConfiguration();
        }

        this.selectedCharacterConfiguration = char;

        if (this.isTracking && char) {
            editorClient.startTrackingCharacterConfiguration(char);
        }
    }

    public get hasMissingAnimationReference() {
        return this.selectedCharacterConfiguration && sharedStore.getCharacterAnimation(this.selectedCharacterConfiguration, true) == null;
    }
}

export const charEditorStore = new CharacterEditorStore(true);