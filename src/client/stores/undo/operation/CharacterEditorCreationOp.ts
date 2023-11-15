import { UndoableOperation } from "../UndoableOperation";
import { CharacterEditorStore } from "../../CharacterEditorStore";
import { CharacterConfigurationModel } from "../../../../shared/resources/CharacterConfigurationModel";
import { AnimationType } from "../../../../shared/resources/AnimationAssetModel";
import { editorClient } from "../../../communication/EditorClient";
import { fromSnapshot, getSnapshot } from "mobx-keystone";
import { executeUndoableOperation } from "../UndoStore";
import { sharedStore } from "../../SharedStore";
import { animationLoader } from "../../../helper/AnimationLoader";
import { createRandomBodyTypeCharacter } from "../../../helper/characterHelpers";
import { PlacementSelection } from "../../MapRelatedStore";
import { mainMapEditorStore } from "../../MapEditorStore";

export function undoableCharacterEditorCreateCharacter(store: CharacterEditorStore) {
    executeUndoableOperation(new CharacterEditorCreationOp(store));
}

class CharacterEditorCreationOp extends UndoableOperation {

    private createdConfiguration: CharacterConfigurationModel;
    private previousPlacementSelection: PlacementSelection;

    public constructor(private store: CharacterEditorStore) {
        super("characterEditorCreateCharacter");

        this.previousPlacementSelection = mainMapEditorStore.placementSelection;
    }

    public async execute(isRedo: boolean) {
        if (isRedo) {
            const snapshot = await editorClient.unDeleteCharacterConfiguration(this.createdConfiguration.id);
            this.createdConfiguration = fromSnapshot<CharacterConfigurationModel>(snapshot);
        } else {
            const defaultAnimation = sharedStore.getAnimationsByType(AnimationType.BodyType)[0];
            const { skins } = await animationLoader.loadAnimationDataCached(defaultAnimation.id);
            const tempSnapshot = getSnapshot(await createRandomBodyTypeCharacter());
            const createdSnapshot = await editorClient.createCharacterConfiguration(tempSnapshot);
            this.createdConfiguration = CharacterConfigurationModel.fromSnapshot(createdSnapshot);
        }
        sharedStore.putCharacter(this.createdConfiguration);
        this.store.setSelectedCharacter(this.createdConfiguration);

        mainMapEditorStore.setPlacementSelection({
            selectedCharacterId: this.createdConfiguration.id
        });
    }

    public async reverse() {
        await editorClient.deleteCharacterConfiguration(this.createdConfiguration.id);
        sharedStore.deleteCharacter(this.createdConfiguration.id);

        mainMapEditorStore.setPlacementSelection(this.previousPlacementSelection);
    }
}
