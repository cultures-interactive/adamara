import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { UseItemTriggerActionModel, MoveMapElementActionModel, MovePlayerActionModel, LooseItemActionModel, FinishQuestActionModel, ReceiveAwarenessActionModel, ReceiveItemActionModel, ReceiveQuestActionModel, ReceiveReputationActionModel, SetTagActionModel, SetVariableActionModel, StartDialogueActionModel, StartFightActionModel, TreeEnterActionModel, TreeExitActionModel, LocationTriggerActionModel, InteractionTriggerActionModel, ConditionTriggerActionModel, ConditionActionModel, TreeParamterActionModel, SetPlayStyleActionModel, ItemSelectionMode, TreePropertiesActionModel, AbortQuestActionModel, ReceiveTaskActionModel, FinishTaskActionModel, AbortTaskActionModel, ModifyPlayerHealthModel, CalculateVariableActionModel, ShowTextActionModel, ShowImageActionModel, StartTimerActionModel, CommentActionModel, PlayAnimationActionModel, DebugStartActionModel, TriggerDamageInAreaActionModel, StartActActionModel, SetReputationStatusActionModel, StopMapElementActionModel, SetPlayerInputActionModel, SetCameraActionModel, ShakeCameraActionModel, FadeCameraActionModel, SimpleCutSceneActionModel, PlaySoundActionModel, SetEmergencyLightingActionModel, DeactivateNodeGroupActionModel, CopyAwarenessIntoVariableActionModel } from '../../../shared/action/ActionModel';
import { StartFightActionDetails } from './details/StartFightActionDetails';
import { MoveMapElementActionDetails } from './details/MoveMapElementActionDetails';
import { ReceiveReputationActionDetails } from './details/ReceiveReputationActionDetails';
import { SetVariableActionDetails } from './details/SetVariableActionDetails';
import { StartDialogueActionDetails } from './details/StartDialogueActionDetails';
import { groupUndoableActionEditorChanges, ActionEditorChangeGroup } from '../../stores/undo/operation/ActionEditorSubmitChangesOp';
import { undoableActionEditorDeselectAction } from '../../stores/undo/operation/ActionEditorSelectActionOp';
import { MovePlayerActionDetails } from "./details/MovePlayerActionDetails";
import { lastElement } from '../../../shared/helper/generalHelpers';
import { MenuCard } from '../menu/MenuCard';
import { MenuCardLabel } from "../menu/MenuCardLabel";
import { StringActionDetail } from './details/components/StringActionDetail';
import { ReceiveQuestActionDetails } from './details/ReceiveQuestActionDetails';
import { QuestOrTaskActionDetail } from './details/QuestOrTaskActionDetail';
import { AreaTriggerActionDetails } from './details/AreaTriggerActionDetails';
import { ActionTreeDetails } from './details/ActionTreeDetails';
import { ActionTreeModel, getTreeParent } from '../../../shared/action/ActionTreeModel';
import { ConditionActionDetails } from './details/ConditionActionDetails';
import { TreeParameterActionDetails } from './details/TreeParameterActionDetails';
import { ItemSelectionActionDetail } from './details/components/ItemSelectionActionDetail';
import { SetPlayStyleActionDetails } from './details/SetPlayStyleActionDetails';
import { LooseItemActionDetails } from './details/LooseItemActionDetails';
import { TreePropertiesActionDetails } from './details/TreePropertiesActionDetails';
import { ReceiveTaskActionDetails } from './details/ReceiveTaskActionDetails';
import { NumberActionDetail } from './details/components/NumberActionDetail';
import { CalculateVariableActionDetails } from './details/CalculateVariableActionDetails';
import { PlayAnimationActionDetails } from './details/PlayAnimationActionDetails';
import { DisplayMode, TranslatedStringActionDetail } from './details/components/TranslatedStringActionDetail';
import { AutoResizeTextareaFullWidth } from '../shared/AutoResizeTextarea';
import { ImageSelectionActionDetail } from './details/components/ImageSelectionActionDetail';
import { InteractionTriggerActionDetails } from './details/InteractionTriggerActionDetails';
import { StartTimerActionDetails } from './details/StartTimerActionDetails';
import { TriggerDamageInAreaActionDetails } from './details/TriggerDamageInAreaActionDetails';
import { AiFillDelete } from "react-icons/ai";
import { MapElementSelectionDetail } from "./details/components/MapElementSelectionDetail";
import { MapElementFilter } from "../../helper/MapElementFilter";
import { StartActActionDetails } from './details/StartActActionDetails';
import { DebugStartActionDetails } from './details/DebugStartActionDetails';
import { useZoomPanHelper } from "react-flow-renderer";
import { CgEditBlackPoint } from 'react-icons/cg';
import { UiConstants } from "../../data/UiConstants";
import { toHumanReadableId } from "../../../shared/helper/actionTreeHelper";
import { SetCameraActionDetails } from "./details/SetCameraActionDetails";
import { SetPlayerInputActionDetail } from "./details/SetPlayerInputActionDetail";
import { ShakeCameraActionDetails } from "./details/ShakeCameraActionDetails";
import { FadeCameraActionDetails } from "./details/FadeCameraActionDetails";
import { SimpleCutSceneActionDetails } from "./details/SimpleCutSceneActionDetails";
import { actionEditorStore } from '../../stores/ActionEditorStore';
import { localSettingsStore } from '../../stores/LocalSettingsStore';
import { PlaySoundActionDetails } from "./details/PlaySoundActionDetails";
import { BooleanActionDetail } from './details/components/BooleanActionDetail';
import { undoableActionEditorDeleteSubtree } from '../../stores/undo/operation/ActionEditorDeleteSubtreeOp';
import { MdCleaningServices } from 'react-icons/md';
import { EditorComplexity } from '../../../shared/definitions/other/EditorComplexity';
import { CopyAwarenessIntoVariableDetails } from './details/CopyAwarenessIntoVariableDetails';
import { actionNodeIcon } from './actionNodeData';
import { ElementGroup } from './details/components/BaseElements';
import { gameStore } from '../../stores/GameStore';

const IconButton = styled.button`
    margin-left: 4px;
    margin-right: 4px;
    border: 0;
    &:enabled {
        cursor: pointer;
        &:hover {
            color: red;
        }
    }
`;

const FlexRow = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
`;

const SelectableText = styled.div`
    font-size: small;
    font-family: monospace;
    cursor: text;
    -webkit-user-select: all;
    -moz-user-select: all;
    -ms-user-select: all;
    user-select: all;
    margin-top: 2px;
`;

const IconContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    align-items: center;
    margin: 4px;
`;

const ButtonContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex-grow: 0;
    flex-shrink: 1;
    align-items: center;
`;

interface ColorProps {
    color?: string;
}

const TitleContainer = styled.div<ColorProps>`
    background-color: ${props => props.color ? props.color : "#FFFFFF"};
    display: flex;
    flex-direction: column;
    margin-right: 24px;
    flex-grow: 1;
    border-radius: ${UiConstants.BORDER_RADIUS};
    border: 1px solid black;
    margin-bottom: 10px;
`;

const TitleText = styled(MenuCardLabel)`
    display: flex;
    align-items: center;
`;

const PropertiesContainer = styled.div`
    margin: 4px;
`;

const DebugRow = styled(FlexRow)`
    margin-left: 24px;
`;

export const ActionDetails: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const { currentAction: action } = actionEditorStore;

    const deleteAction = () => {
        undoableActionEditorDeselectAction();
        if (action instanceof ActionTreeModel) {
            undoableActionEditorDeleteSubtree(action);
        } else {
            groupUndoableActionEditorChanges(ActionEditorChangeGroup.DeleteActionNode, () => {
                const actionTree = lastElement(actionEditorStore.currentActionTreeHierarchy);
                actionTree.removeNonSubtreeAction(action);
            });
        }
    };

    const allowSettingDeactivationGroupId = (localSettingsStore.editorComplexity === EditorComplexity.Production) && !(action instanceof ActionTreeModel);

    const hasDeactivationGroupId = action && (action.deactivationGroupId.length > 0);

    const [showDeactivationGroupId, setShowDeactivationGroupId] = useState(hasDeactivationGroupId);

    useEffect(() => {
        setShowDeactivationGroupId(hasDeactivationGroupId);
    }, [action?.$modelId]);

    const deactivationGroupIdVisible = allowSettingDeactivationGroupId && (showDeactivationGroupId || hasDeactivationGroupId);

    const zoomPanHelper = useZoomPanHelper();

    const actionDetailsTop = 40;
    const navigatorHeight = 260;

    // In the MenuCard, "key={action?.$modelId}" is used to completely refresh the contents of the MenuCard.
    // This is necessary for e.g. switching between two StartDialogueActionModels to make sure all useState()
    // calls inside are fully refreshed and not automatically reused by React.
    return (
        <MenuCard minWidth={"200px"} maxHeight={`calc(100vh - ${actionDetailsTop}px - ${navigatorHeight}px)`} key={action?.$modelId}>
            {
                action && (
                    <>
                        <TitleContainer color={action.nodeColor()}>
                            <FlexRow>
                                <TitleText>
                                    <IconContainer>{actionNodeIcon(action)}</IconContainer>
                                    {action instanceof ActionTreeModel && action.treePropertiesAction?.localizedName.get(gameStore.languageKey) ? action.treePropertiesAction?.localizedName.get(gameStore.languageKey) : t(action.title())}
                                </TitleText>
                                <ButtonContainer>
                                    {allowSettingDeactivationGroupId && <IconButton disabled={hasDeactivationGroupId} onClick={() => setShowDeactivationGroupId(!showDeactivationGroupId)}><MdCleaningServices /></IconButton>}
                                    {action instanceof TreePropertiesActionModel || <IconButton onClick={deleteAction}><AiFillDelete /></IconButton>}
                                    <IconButton onClick={() => actionEditorStore.jumpToAction(action, zoomPanHelper)}><CgEditBlackPoint /></IconButton>
                                </ButtonContainer>
                            </FlexRow>
                            {
                                localSettingsStore.showDebugInfo && (
                                    <DebugRow>
                                        id:&nbsp;
                                        <SelectableText
                                            onClick={e => actionEditorStore.debugLogInformation(action)}
                                        >
                                            {toHumanReadableId(action?.$modelId)}
                                        </SelectableText>
                                    </DebugRow>
                                )
                            }

                        </TitleContainer>

                        <PropertiesContainer>
                            {action instanceof AbortQuestActionModel && <QuestOrTaskActionDetail questId={action.questId} questIdSetter={action.setQuestId.bind(action)} text={action.text} parentTree={getTreeParent(action)} />}
                            {action instanceof AbortTaskActionModel && <QuestOrTaskActionDetail questId={action.questId} questIdSetter={action.setQuestId.bind(action)} taskId={action.taskId} taskIdSetter={action.setTaskId.bind(action)} text={action.text} parentTree={getTreeParent(action)} />}
                            {action instanceof ActionTreeModel && <ActionTreeDetails action={action} />}
                            {action instanceof CalculateVariableActionModel && <CalculateVariableActionDetails action={action} />}
                            {action instanceof CommentActionModel && <StringActionDetail name={t("action_editor.property_color")} value={action.color} valueSetter={action.setColor.bind(action)} allowBlankValue={true} />}
                            {action instanceof DebugStartActionModel && <DebugStartActionDetails action={action} />}
                            {action instanceof ConditionActionModel && !action.isPlayStyleCondition() && <ConditionActionDetails condition={action.condition} />}
                            {action instanceof ConditionTriggerActionModel && <ConditionActionDetails condition={action.condition} />}
                            {action instanceof FinishQuestActionModel && <QuestOrTaskActionDetail questId={action.questId} questIdSetter={action.setQuestId.bind(action)} text={action.text} parentTree={getTreeParent(action)} />}
                            {action instanceof FinishTaskActionModel && <QuestOrTaskActionDetail questId={action.questId} questIdSetter={action.setQuestId.bind(action)} taskId={action.taskId} taskIdSetter={action.setTaskId.bind(action)} text={action.text} parentTree={getTreeParent(action)} />}
                            {action instanceof InteractionTriggerActionModel && <InteractionTriggerActionDetails interactionTrigger={action.triggerElement} setInteractionTrigger={action.setTriggerElement.bind(action)} iconType={action.iconType} setIconType={action.setIconType.bind(action)} />}
                            {action instanceof MovePlayerActionModel && <MovePlayerActionDetails action={action} />}
                            {action instanceof PlayAnimationActionModel && <PlayAnimationActionDetails action={action} />}
                            {action instanceof LocationTriggerActionModel && <AreaTriggerActionDetails action={action} />}
                            {action instanceof LooseItemActionModel && <LooseItemActionDetails action={action} />}
                            {action instanceof UseItemTriggerActionModel && <ItemSelectionActionDetail selectionMode={ItemSelectionMode.Item} selectionModeSetter={null} itemIdOrTags={action.itemId} itemIdOrTagsSetter={action.setItemId.bind(action)} parentTree={getTreeParent(action)} />}
                            {action instanceof ModifyPlayerHealthModel && <NumberActionDetail name={t("action_editor.property_value") + " (+/-)"} value={action.amount} valueSetter={action.setAmount.bind(action)} validateNumber={value => value != 0} />}
                            {action instanceof MoveMapElementActionModel && <MoveMapElementActionDetails action={action} />}
                            {action instanceof StopMapElementActionModel && <MapElementSelectionDetail name={t("action_editor.property_map_element_stop")} selectedElement={action.mapElement} elementSetter={action.setMapElement.bind(action)} parameterTypes={["actions/NPCOnMapValueModel", "actions/EnemyOnMapValueModel"]} getSelectableElements={MapElementFilter.filterNPCLabels} />}
                            {action instanceof ReceiveAwarenessActionModel && <NumberActionDetail name={t("action_editor.property_value") + " +"} value={action.amount} valueSetter={action.setAmount.bind(action)} />}
                            {action instanceof ReceiveItemActionModel && <ItemSelectionActionDetail selectionMode={ItemSelectionMode.Item} selectionModeSetter={null} itemIdOrTags={action.itemId} itemIdOrTagsSetter={action.setItemId.bind(action)} parentTree={getTreeParent(action)} />}
                            {action instanceof ReceiveQuestActionModel && <ReceiveQuestActionDetails action={action} />}
                            {action instanceof ReceiveReputationActionModel && <ReceiveReputationActionDetails action={action} />}
                            {action instanceof ReceiveTaskActionModel && <ReceiveTaskActionDetails action={action} />}
                            {action instanceof SetPlayStyleActionModel && <SetPlayStyleActionDetails action={action} />}
                            {action instanceof SetTagActionModel && <StringActionDetail name={t("action_editor.property_tag")} value={action.tag} valueSetter={action.setTag.bind(action)} allowBlankValue={false} />}
                            {action instanceof SetVariableActionModel && <SetVariableActionDetails action={action} />}
                            {action instanceof ShowImageActionModel && <ImageSelectionActionDetail imageId={action.imageId} imageIdSetter={action.setImageId.bind(action)} />}
                            {action instanceof ShowTextActionModel && <TranslatedStringActionDetail name={t("action_editor.property_text_neutral")} translatedString={action.text} displayMode={DisplayMode.CommentAndGenders} allowBlankValue={false} />}
                            {action instanceof StartDialogueActionModel && <StartDialogueActionDetails action={action} />}
                            {action instanceof StartFightActionModel && <StartFightActionDetails action={action} />}
                            {action instanceof StartTimerActionModel && <StartTimerActionDetails action={action} />}
                            {action instanceof StartActActionModel && <StartActActionDetails action={action} />}
                            {action instanceof CopyAwarenessIntoVariableActionModel && <CopyAwarenessIntoVariableDetails action={action} />}
                            {action instanceof SetReputationStatusActionModel && <TranslatedStringActionDetail name={t("action_editor.property_reputation_status")} translatedString={action.status} displayMode={DisplayMode.CommentAndGenders} allowBlankValue={false} />}
                            {action instanceof TreeEnterActionModel && <TranslatedStringActionDetail name={t("editor.translated_name")} translatedString={action.name} allowBlankValue={true} displayMode={DisplayMode.Simple} />}
                            {action instanceof TreeExitActionModel && <TranslatedStringActionDetail name={t("editor.translated_name")} translatedString={action.name} allowBlankValue={true} displayMode={DisplayMode.Simple} />}
                            {action instanceof TreeParamterActionModel && <TreeParameterActionDetails action={action} />}
                            {action instanceof TreePropertiesActionModel && <TreePropertiesActionDetails action={action} />}
                            {action instanceof TriggerDamageInAreaActionModel && <TriggerDamageInAreaActionDetails action={action} />}
                            {action instanceof SetPlayerInputActionModel && <SetPlayerInputActionDetail action={action} />}
                            {action instanceof SetCameraActionModel && <SetCameraActionDetails action={action} />}
                            {action instanceof ShakeCameraActionModel && <ShakeCameraActionDetails action={action} />}
                            {action instanceof FadeCameraActionModel && <FadeCameraActionDetails action={action} />}
                            {action instanceof SimpleCutSceneActionModel && <SimpleCutSceneActionDetails action={action} />}
                            {action instanceof PlaySoundActionModel && <PlaySoundActionDetails action={action} />}
                            {action instanceof SetEmergencyLightingActionModel && <BooleanActionDetail name={t("action_editor.property_activate_emergency_lighting")} checked={action.activate} toggle={action.toggleActivate.bind(action)} />}
                            {action instanceof DeactivateNodeGroupActionModel && <StringActionDetail name={t("action_editor.property_target_deactivation_group_id")} value={action.targetDeactivationGroupId} valueSetter={value => { action.setTargetDeactivationGroupId(value); }} allowBlankValue={false} />}

                            <ElementGroup>
                                {t("action_editor.node_comment")}<br />
                                <AutoResizeTextareaFullWidth value={action.comment} onChange={({ target }) => action.setComment(target.value)} />
                            </ElementGroup>

                            {deactivationGroupIdVisible && (
                                <>
                                    <hr />
                                    <StringActionDetail
                                        name={t("action_editor.property_deactivation_group_id")}
                                        value={action.deactivationGroupId}
                                        valueSetter={value => {
                                            action.setDeactivationGroupId(value);
                                            if (!showDeactivationGroupId) {
                                                setShowDeactivationGroupId(true);
                                            }
                                        }}
                                        allowBlankValue={false}
                                    />
                                </>
                            )}
                        </PropertiesContainer>
                    </>
                )
            }
        </MenuCard >
    );
});
