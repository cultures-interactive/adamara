import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { StringActionDetail } from './components/StringActionDetail';
import { ActionTreeModel } from '../../../../shared/action/ActionTreeModel';
import { NumberActionDetail } from './components/NumberActionDetail';
import { ItemSelectionActionDetail } from './components/ItemSelectionActionDetail';
import { FactionSelectionActionDetail } from './components/FactionSelectionActionDetail';
import { AnimationElementValueModel, AreaTriggerValueModel, EnemyOnMapValueModel, ExtendedMapMarkerValueModel, extendedMapMarkerValueModelTypesArray, FactionValueModel, InteractionTriggerValueModel, ItemIdValueModel, ItemTagValueModel, MapMarkerValueModel, NPCOnMapValueModel, NPCValueModel, NumberValueModel, PlayStyleValueModel, QuestIdValueModel, SoundValueModel, StringValueModel, TranslatedStringValueModel } from '../../../../shared/action/ValueModel';
import { DisplayMode, TranslatedStringActionDetail } from './components/TranslatedStringActionDetail';
import { undoableActionEditorSelectActionTreeHierachy } from '../../../stores/undo/operation/ActionEditorSelectActionTreeHierarchy';
import { undoableActionEditorCreateTemplate } from '../../../stores/undo/operation/ActionEditorCreateTemplateOp';
import { PlayStyleSelectionActionDetail } from './components/PlayStyleSelectionActionDetail';
import { ItemSelectionMode } from '../../../../shared/action/ActionModel';
import { Orientation, PopupSubMenu, PopupSubMenuIconContainer } from '../../menu/PopupSubMenu';
import styled from 'styled-components';
import { IoMdHelpCircle } from 'react-icons/io';
import { NPCActionDetail } from './components/NPCSelectionActionDetail';
import { AnimationElementSelectionDetail } from './components/AnimationElementSelectionDetail';
import { QuestSelectionDetail } from './components/QuestSelectionDetail';
import { InteractionTriggerSelectionDetail } from './components/InteractionElementSelectionDetail';
import { MapElementSelectionDetail } from './components/MapElementSelectionDetail';
import { MapElementFilter } from "../../../helper/MapElementFilter";
import { passComplexityGate } from '../../../../shared/definitions/other/EditorComplexity';
import { actionEditorStore } from '../../../stores/ActionEditorStore';
import { gameStore } from '../../../stores/GameStore';
import { localSettingsStore } from '../../../stores/LocalSettingsStore';
import { AnimationElementWithAnimationRestrictionsSelectionDetail as AnimationElementWithRequiredAnimationsSelectionDetail } from './components/AnimationElementWithRequiredAnimationsSelectionDetail';
import { SoundSelectionButton } from "../selector/SoundSelectionButton";
import { ElementGroup } from './components/BaseElements';

const HelpIcon = styled(IoMdHelpCircle)`
    vertical-align: bottom;
    font-size: 18px;
`;

const FormattingHelpButtonContainer = styled.div`
    float: right;
    margin-right: 8px;
`;

interface ActionTreeDetailsProps {
    action: ActionTreeModel;
}

export const ActionTreeDetails: React.FunctionComponent<ActionTreeDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();
    const { languageKey } = gameStore;
    const { isProductionEditor, editorComplexity } = localSettingsStore;

    const subTreeProps = action.treePropertiesAction;
    const parentTree = action.parentTree;

    const createAndOpenNewTemplate = async () => {
        undoableActionEditorCreateTemplate(action);
    };

    const focusOnTree = () => {
        undoableActionEditorSelectActionTreeHierachy([action.$modelId]);
    };

    return (
        <>
            <FormattingHelpButtonContainer>
                <PopupSubMenu
                    orientation={Orientation.Left}
                    relativeOffset={0}
                    buttonContent={<PopupSubMenuIconContainer><HelpIcon /></PopupSubMenuIconContainer>}
                    containerWidth='450px'
                    positionFixed={true}
                >
                    {action.treePropertiesAction.tutorial.get(languageKey)}
                </PopupSubMenu>
            </FormattingHelpButtonContainer>
            {isProductionEditor &&
                <ElementGroup>
                    <button onClick={createAndOpenNewTemplate}>{t("action_editor.tree_copy_to_template")}</button>
                </ElementGroup>
            }
            {!isProductionEditor && !actionEditorStore.treeFocussedForWorkshop && passComplexityGate(subTreeProps.complexityGate, editorComplexity) &&
                <ElementGroup>
                    <button onClick={() => focusOnTree()}>{t("action_editor.tree_focus_for_workshop")}</button>
                </ElementGroup>
            }

            {action.treeParameterActions().map((param, index) => (
                <div key={index}>
                    {param.dividingLine && <hr />}
                    {param.tutorial.get(languageKey) && (
                        <FormattingHelpButtonContainer>
                            <PopupSubMenu
                                orientation={Orientation.Left}
                                relativeOffset={0}
                                buttonContent={<PopupSubMenuIconContainer><HelpIcon /></PopupSubMenuIconContainer>}
                                containerWidth='450px'
                                positionFixed={true}
                            >
                                {param.tutorial.get(languageKey)}
                            </PopupSubMenu>
                        </FormattingHelpButtonContainer>
                    )}

                    {
                        param.value instanceof StringValueModel && (
                            <StringActionDetail
                                name={param.description.get(languageKey)}
                                value={param.value.get()}
                                valueSetter={param.value.set.bind(param.value)}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof NumberValueModel && (
                            <NumberActionDetail
                                name={param.description.get(languageKey)}
                                value={param.value.get()}
                                valueSetter={param.value.set.bind(param.value)}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof ItemIdValueModel && (
                            <ItemSelectionActionDetail
                                parentTree={parentTree}
                                name={param.description.get(languageKey)}
                                selectionMode={ItemSelectionMode.Item}
                                selectionModeSetter={null}
                                itemIdOrTags={param.value.get()}
                                itemIdOrTagsSetter={param.value.set.bind(param.value)}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )}
                    {
                        param.value instanceof ItemTagValueModel && (
                            <ItemSelectionActionDetail
                                parentTree={parentTree}
                                name={param.description.get(languageKey)}
                                selectionMode={ItemSelectionMode.ItemWithOneTag}
                                selectionModeSetter={null}
                                itemIdOrTags={param.value.get()}
                                itemIdOrTagsSetter={param.value.set.bind(param.value)}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof QuestIdValueModel && (
                            <QuestSelectionDetail
                                parentTree={parentTree}
                                name={param.description.get(languageKey)}
                                questId={param.value.get()}
                                questIdSetter={param.value.set.bind(param.value)}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof NPCValueModel && (
                            <NPCActionDetail
                                parentTree={parentTree}
                                name={param.description.get(languageKey)}
                                selectedNPC={(param.value as NPCValueModel).value}
                                npcSetter={param.value.setValue.bind(param.value)}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof NPCOnMapValueModel && (
                            <MapElementSelectionDetail
                                name={param.description.get(languageKey)}
                                selectedElement={(param.value as NPCOnMapValueModel | EnemyOnMapValueModel).value}
                                elementSetter={param.value.setValue.bind(param.value)}
                                parameterTypes={["actions/NPCOnMapValueModel", "actions/EnemyOnMapValueModel"]}
                                getSelectableElements={MapElementFilter.filterNPCLabels}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof EnemyOnMapValueModel && (
                            <MapElementSelectionDetail
                                name={param.description.get(languageKey)}
                                selectedElement={(param.value as EnemyOnMapValueModel).value}
                                elementSetter={param.value.setValue.bind(param.value)}
                                parameterTypes={["actions/EnemyOnMapValueModel"]}
                                getSelectableElements={MapElementFilter.filterEnemiesLabels}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof FactionValueModel &&
                        (
                            <FactionSelectionActionDetail
                                parentTree={parentTree}
                                name={param.description.get(languageKey)}
                                value={param.value.get()}
                                valueSetter={param.value.set.bind(param.value)}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof PlayStyleValueModel && (
                            <PlayStyleSelectionActionDetail
                                parentTree={parentTree}
                                name={param.description.get(languageKey)}
                                value={param.value.get()}
                                valueSetter={param.value.set.bind(param.value)}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof TranslatedStringValueModel && (
                            <TranslatedStringActionDetail
                                name={param.description.get(languageKey)}
                                translatedString={(param.value as TranslatedStringValueModel).value}
                                displayMode={DisplayMode.CommentAndGenders}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof MapMarkerValueModel && (
                            <MapElementSelectionDetail
                                name={param.description.get(languageKey)}
                                selectedElement={(param.value as MapMarkerValueModel).value}
                                elementSetter={param.value.setValue.bind(param.value)}
                                parameterTypes={["actions/MapMarkerValueModel"]}
                                getSelectableElements={MapElementFilter.filterMapMarkerLabels}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof ExtendedMapMarkerValueModel && (
                            <MapElementSelectionDetail
                                name={param.description.get(languageKey)}
                                selectedElement={(param.value as MapMarkerValueModel).value}
                                elementSetter={param.value.setValue.bind(param.value)}
                                parameterTypes={extendedMapMarkerValueModelTypesArray}
                                getSelectableElements={MapElementFilter.filterExtendedMapMarkerLabels}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof AreaTriggerValueModel && (
                            <MapElementSelectionDetail
                                name={param.description.get(languageKey)}
                                selectedElement={(param.value as AreaTriggerValueModel).value}
                                elementSetter={param.value.setValue.bind(param.value)}
                                parameterTypes={["actions/AreaTriggerValueModel"]}
                                getSelectableElements={MapElementFilter.filterTriggerLabels}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof AnimationElementValueModel && (
                            param.value.hasRequiredAnimationNames ? (
                                <AnimationElementWithRequiredAnimationsSelectionDetail
                                    name={param.description.get(languageKey)}
                                    selectedAnimationElement={(param.value as AnimationElementValueModel).value}
                                    animationElementSetter={param.value.setValue.bind(param.value)}
                                    requiredAnimationNames={param.value.requiredAnimationNames}
                                    allowBlankValue={param.allowBlankValue}
                                />
                            ) : (
                                <AnimationElementSelectionDetail
                                    name={param.description.get(languageKey)}
                                    selectedAnimationElement={(param.value as AnimationElementValueModel).value}
                                    animationElementSetter={param.value.setValue.bind(param.value)}
                                    allowBlankValue={param.allowBlankValue}
                                />
                            )
                        )
                    }
                    {
                        param.value instanceof InteractionTriggerValueModel && (
                            <InteractionTriggerSelectionDetail
                                name={param.description.get(languageKey)}
                                selectedInteractionTrigger={(param.value as InteractionTriggerValueModel).value}
                                interactionTriggerSetter={param.value.setValue.bind(param.value)}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                    {
                        param.value instanceof SoundValueModel && (
                            <SoundSelectionButton
                                onSelectSoundPath={soundPath => {
                                    const soundValueModel = param.value as SoundValueModel;
                                    soundValueModel.setValue(soundPath);
                                    soundValueModel.setTreeParameter(null);
                                }}
                                selectedPath={param.value.value}
                                text={param.description.get(languageKey)}
                                action={action}
                                selectedTreeParameter={param.value.treeParameter}
                                onSelectTreeParameter={treeParameter => {
                                    const soundValueModel = param.value as SoundValueModel;
                                    soundValueModel.setTreeParameter(treeParameter);
                                    soundValueModel.setValue(null);
                                }}
                                allowBlankValue={param.allowBlankValue}
                            />
                        )
                    }
                </div>
            ))}
        </>
    );

});