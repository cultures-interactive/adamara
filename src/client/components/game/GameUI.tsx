import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled, { css } from 'styled-components';
import { ShowImageActionModel, StartTimerActionModel } from '../../../shared/action/ActionModel';
import { gameCanvasSize } from "../../data/gameConstants";
import { Adjustment, SlideMenu, State } from "../menu/SlideMenu";
import { DialogueParser } from './DialogueParser';
import { ReputationIndicatorUI } from './ui components/ReputationIndicatorUI';
import { GameDebugInfoUI } from "./ui components/debug/GameDebugInfoUI";
import { InventoryUI } from "./ui components/InventoryUI";
import { QuestlogUI } from "./ui components/QuestlogUI";
import { GiSoundOn } from "react-icons/gi";
import { CgDebug } from "react-icons/cg";
import { BorderColor, BorderPrimary, FontColorHighlight, FontColorMain, FontColorModerate, GUITextBold } from "./ui components/GameUIElements";
import { UiConstants } from '../../data/UiConstants';
import { BsFillExclamationSquareFill } from "react-icons/bs";
import { MdAccessTimeFilled } from 'react-icons/md';
import { findDialogSpeaker, getTextOfAction } from '../../helper/gameActionTreeHelper';
import { SimpleCutSceneUI } from "./ui components/SimpleCutSceneUI";
import { AlignedContainer } from "./ui components/AlignedContainer";
import { combatStore } from '../../stores/CombatStore';
import { gameStore, MapLoadingState } from '../../stores/GameStore';
import { imageStore } from '../../stores/ImageStore';
import { localSettingsStore } from '../../stores/LocalSettingsStore';
import { MapLoadingScreen } from './ui components/MapLoadingScreen';
import { soundCache } from "../../stores/SoundCache";
import { UiSounds } from "../../canvas/game/sound/UiSounds";
import { NotificationContainer } from "./ui components/NotificationContainer";
import { notificationController } from "./ui components/NotificationController";
import { SoundDebugInfoUI } from "./ui components/debug/SoundDebugUI";
import { TaskMarkers } from './ui components/TaskMarkers';
import { PastNotifications } from './ui components/PastNotifications';
import { GameStatsContainer } from '../debug/GameStatsContainer';
import { DialogueAnswerWindow, DialogueSpeakerWindow, DialogueTextWindow, DialogueTextWindowWithoutSpeaker, TextActionWindow, TimerWindow } from './ui components/NineSlices';

const Container = styled.div`
    user-select: none;
`;

const BlockingContainer = styled.div`
    position: absolute;
    left: 0;
    right: 0;
    top: 30px;
    bottom: 0;
    padding-top: 40px;
    max-width: 100%;
    width: ${gameCanvasSize.width}px;
    box-sizing: border-box;
    user-select: none;
`;

const ExclamationIcon = styled(BsFillExclamationSquareFill)`
    margin-right: 4px;
`;

interface BoxProps {
    clickable: boolean;
}

const DialogArea = styled.div`
    position: absolute; 
    left: 0; 
    right: 0; 
    bottom: 40px;
    margin-left: auto; 
    margin-right: auto; 
    width: 35%;
    z-index: ${UiConstants.Z_INDEX_DIALOG};
`;

const DialogueBoxContainer = styled.div<BoxProps>`
    position: relative;
    pointer-events: none;
    ${props => props.clickable && css`* { cursor: pointer; }`}
    margin-bottom: -3px;
    /*margin-top: 30px;*/
`;

const DialogueSpeaker = styled(DialogueSpeakerWindow)`
    pointer-events: all;
    width: fit-content;
    font-size: larger;
    color: #CFD4DE;
    margin-bottom: -35px;
`;

const DialogueText = styled(DialogueTextWindow)`
    pointer-events: all;
    width: 100%;
    color: ${FontColorMain};
`;

const DialogueTextWithoutSpeaker = styled(DialogueTextWindowWithoutSpeaker)`
    pointer-events: all;
    width: 100%;
    color: ${FontColorMain};
`;

export const DialogueCloseButton = styled.img`
    position: absolute;
    right: 18px;
    bottom: 10px;
`;

const TimerValueContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
`;

export const Headline = styled.div`
    display: flex;
    flex-direction: row;
    flex-grow: 1;
`;

const TimerBoxContainer = styled.div`
    position: absolute;
    top: 80px;
    left: 0px;
    right: 0px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;
    pointer-events: none;
`;

const TimerIcon = styled(MdAccessTimeFilled)`
    color: ${FontColorHighlight};
    margin-right: 4px;
`;

const TextBox = styled(TextActionWindow)`
    position: absolute;
    padding: 8px;
    max-height: 200px;
    min-width: 100px;
    max-width: 400px;
    left: -4px;
    bottom: 91px;
    display: flex;
    align-items: center;
    justify-content: center;

    * {
        color: #CFD4DE;
    }
`;

const ImageBox = styled.img`
    ${BorderPrimary}
    background-color: white;
    padding: 4px;
    margin: 10%;
    max-width: 80%;
    height: 70%;
`;

const ChoiceButtonArea = styled.div`
    padding: 0 35px;
`;

interface ChoiceButtonProps {
    isSelected: boolean;
}

const ChoiceButton = styled.button<ChoiceButtonProps>`
    border: ${props => props.isSelected ? "5px solid orange" : ""};
    background-color: transparent;
    margin: -8px 0;
    padding: 0;
    border: 0;
    width: 100%;
    color: ${FontColorModerate};
    cursor: pointer;
`;

export const GameUI: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const { accessibilityOptions, gameEngine, languageKey } = gameStore;

    if (gameStore.mapLoadingState === MapLoadingState.LoadingMapFromServer) {
        return (
            <Container>
                <MapLoadingScreen />
            </Container>
        );
    }

    if (!gameEngine || combatStore.active)
        return null;

    const { rootActionTree } = gameEngine;
    const { currentDialogueSelection, activeText, activeImage, activeTimers, visibleRunningTimer } = gameEngine.gameState;
    const activeDialogOrDescription = gameEngine.activeDialogueOrDescription();

    const activeNonBlockingDialogs = gameEngine.activeNonBlockingDialogues();

    const activeTextAction = activeText ? gameEngine.getCachedActionNode(activeText) : null;
    const activeImageAction = activeImage ? gameEngine.getCachedActionNode(activeImage) as ShowImageActionModel : null;
    const activeTimerAction = visibleRunningTimer ? gameEngine.getCachedActionNode(visibleRunningTimer) as StartTimerActionModel : null;

    const currentCutScene = gameEngine.gameState.actionPropertyCurrentCutScene;
    const uiVisible = gameEngine.gameState.actionPropertyUIVisible && !gameStore.isLoadingMap;

    function onClickNonBlockingDialogue(modelId: string) {
        gameStore.gameEngine.removeNonBlockingDialog(modelId);
    }

    const activeTextValue = activeTextAction ? getTextOfAction(activeTextAction, null, t) : null;

    return (
        <Container>
            {
                notificationController.visibleNotifications.map((ni) => (
                    <NotificationContainer
                        key={ni.id}
                        info={ni}
                    />
                ))
            }

            {
                uiVisible && (
                    <SlideMenu
                        identifier={"game-inventory"}
                        orientation={Adjustment.Left}
                        start={80}
                        icon={<img src="assets/game/images/UI/icon_inventory.png" />}
                        state={State.Expanded}
                        collapsible={true}
                        transparent={true}
                        closeButtonOffsetX={6}
                        closeButtonOffsetY={7}
                        menuOverflow={"unset"}
                        onUserToggle={(state) => {
                            if (state == State.Expanded) soundCache.playOneOf(UiSounds.OPEN_INVENTORY);
                            if (state == State.Collapsed) soundCache.playOneOf(UiSounds.CLOSE_INVENTORY);
                        }
                        }
                    >
                        <InventoryUI />
                    </SlideMenu>
                )
            }

            {
                uiVisible && (
                    <SlideMenu
                        orientation={Adjustment.Right}
                        start={80}
                        state={State.Collapsed}
                        collapsible={true}
                        identifier={"game-quests"}
                        icon={<img src="assets/game/images/UI/icon_quests.png" />}
                        transparent={true}
                        closeButtonOffsetX={6}
                        closeButtonOffsetY={7}
                        menuOverflow={"unset"}
                    >
                        <QuestlogUI />
                    </SlideMenu>
                )
            }

            {
                uiVisible && (
                    <SlideMenu
                        identifier={"past-notifications"}
                        orientation={Adjustment.Bottom}
                        start={1280 - 310}
                        width={310}
                        icon={<img src="assets/game/images/UI/icon_notifications.png" />}
                        iconStart={1280 - UiConstants.SIZE_SLIDE_MENU_ICON_NUMBER}
                        state={State.Collapsed}
                        collapsible={true}
                        notAnimated={true}
                        transparent={true}
                        closeButtonOffsetX={6}
                        closeButtonOffsetY={7}
                        menuOverflow={"unset"}
                    >
                        <PastNotifications />
                    </SlideMenu>
                )
            }

            {
                localSettingsStore.showDebugInfo && (
                    <SlideMenu
                        orientation={Adjustment.Bottom}
                        start={0}
                        state={State.Collapsed}
                        collapsible={true}
                        identifier={"game-debug-info"}
                        icon={<CgDebug />}
                        menuBackgroundColor={BorderColor}
                        width="100%"
                    >
                        <GameDebugInfoUI />
                    </SlideMenu>
                )
            }

            {
                localSettingsStore.showDebugInfo && (
                    <SlideMenu
                        identifier={"sound-debug-info"}
                        orientation={Adjustment.Left}
                        start={150}
                        icon={<GiSoundOn />}
                        state={State.Expanded}
                        collapsible={true}
                        menuBackgroundColor={BorderColor}
                    >
                        <SoundDebugInfoUI />
                    </SlideMenu>
                )
            }

            {
                (uiVisible && activeDialogOrDescription || (activeNonBlockingDialogs.length > 0)) && (
                    <DialogArea>
                        {
                            activeNonBlockingDialogs.map(action => (
                                <DialogueBoxContainer
                                    key={action.$modelId}
                                    onClick={_ => onClickNonBlockingDialogue(action.$modelId)}
                                    clickable={true}
                                >
                                    {findDialogSpeaker(action, rootActionTree, t) !== "" ? (
                                        <>
                                            <DialogueSpeaker>
                                                <DialogueParser
                                                    dialogueString={findDialogSpeaker(action, rootActionTree, t)}
                                                    initialTreeScopeContext={action}
                                                />
                                            </DialogueSpeaker>
                                            <DialogueText>
                                                <DialogueParser
                                                    dialogueString={getTextOfAction(action, null, t)}
                                                    initialTreeScopeContext={action}
                                                />
                                                <div />
                                            </DialogueText>
                                        </>
                                    ) : (
                                        <DialogueTextWithoutSpeaker>
                                            <DialogueParser
                                                dialogueString={getTextOfAction(action, null, t)}
                                                initialTreeScopeContext={action}
                                            />
                                            <div />
                                        </DialogueTextWithoutSpeaker>
                                    )}
                                    <DialogueCloseButton src="assets/game/images/UI/continue_arrow.png" />
                                </DialogueBoxContainer>
                            ))
                        }
                        {
                            activeDialogOrDescription && (
                                <DialogueBoxContainer clickable={false}>
                                    {findDialogSpeaker(activeDialogOrDescription, rootActionTree, t) !== "" ? (
                                        <>
                                            <DialogueSpeaker>
                                                <DialogueParser
                                                    dialogueString={findDialogSpeaker(activeDialogOrDescription, rootActionTree, t)}
                                                    initialTreeScopeContext={activeDialogOrDescription}
                                                />
                                            </DialogueSpeaker>
                                            <DialogueText>
                                                <DialogueParser
                                                    dialogueString={getTextOfAction(activeDialogOrDescription, null, t)}
                                                    initialTreeScopeContext={activeDialogOrDescription}
                                                />
                                            </DialogueText>
                                        </>
                                    ) : (
                                        <DialogueTextWithoutSpeaker>
                                            <DialogueParser
                                                dialogueString={getTextOfAction(activeDialogOrDescription, null, t)}
                                                initialTreeScopeContext={activeDialogOrDescription}
                                            />
                                        </DialogueTextWithoutSpeaker>
                                    )}
                                </DialogueBoxContainer>
                            )
                        }
                        <ChoiceButtonArea>
                            {
                                gameEngine.availableDialogueAnswers().map((exit, index) => (
                                    <ChoiceButton
                                        isSelected={accessibilityOptions && currentDialogueSelection === index}
                                        onClick={() => gameEngine.selectDialogueAnswer(index)}
                                        key={exit.$modelId}
                                    >
                                        <DialogueAnswerWindow>
                                            <DialogueParser
                                                dialogueString={exit.value.getForGender(gameStore.languageKey, gameStore.playerGender, true)}
                                                initialTreeScopeContext={activeDialogOrDescription}
                                            />
                                        </DialogueAnswerWindow>
                                    </ChoiceButton>
                                ))
                            }
                        </ChoiceButtonArea>
                    </DialogArea>
                )
            }

            {
                uiVisible && activeTimerAction?.visible && (
                    <TimerBoxContainer>
                        <TimerWindow>
                            <TimerIcon />
                            <DialogueParser
                                dialogueString={activeTimerAction.text.get(languageKey)}
                                initialTreeScopeContext={activeTimerAction}
                            />
                            <TimerValueContainer>
                                <GUITextBold>
                                    {
                                        activeTimerAction.countDown ? activeTimers.get(visibleRunningTimer) : (parseInt(gameEngine.resolvePotentialTreeParameter(activeTimerAction.time, activeTimerAction)) - activeTimers.get(visibleRunningTimer))
                                    }
                                </GUITextBold>
                            </TimerValueContainer>
                        </TimerWindow>
                    </TimerBoxContainer>
                )
            }

            {
                uiVisible && activeTextValue && (
                    <TextBox>
                        <GUITextBold>
                            <ExclamationIcon />
                            <DialogueParser
                                dialogueString={activeTextValue}
                                initialTreeScopeContext={activeTextAction}
                            />
                        </GUITextBold>
                    </TextBox>
                )
            }

            {
                uiVisible && activeImageAction && (
                    <BlockingContainer onClick={() => gameEngine.closeActiveImage()}>
                        <ImageBox src={imageStore.getImageUrl(activeImageAction.imageId)} />
                    </BlockingContainer>
                )
            }

            {
                uiVisible && <ReputationIndicatorUI />
            }

            {
                uiVisible && <TaskMarkers />
            }

            {
                (currentCutScene && currentCutScene.text && currentCutScene.text.length) && (
                    <AlignedContainer direction={currentCutScene.textContainerAlignmentDirection[gameEngine.gameState.actionPropertyCurrentCutSceneTextIndex]}>
                        <SimpleCutSceneUI sceneProps={currentCutScene} />
                    </AlignedContainer>
                )
            }

            <GameStatsContainer />
        </Container>
    );
});