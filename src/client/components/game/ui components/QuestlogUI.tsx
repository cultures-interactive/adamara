import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { GUITextBold, GUIBox, GUIHeadlineLight, GUIHeadlineSuffix } from "./GameUIElements";
import { wrapArraySet, wrapIterator } from "../../../../shared/helper/IterableIteratorWrapper";
import { DialogueParser } from "../DialogueParser";
import { FaFlagCheckered, FaMapMarker } from "react-icons/fa";
import { numberToCSSColor } from "../../../helper/reactHelpers";
import { CgEditBlackPoint } from "react-icons/cg";
import { gameStore } from "../../../stores/GameStore";
import { QuestWindow } from "./NineSlices";

export const QuestContainer = styled.div`
    padding: 6px;
    max-width: 300px;
    margin-bottom: 4px;
    margin-left: 4px;
`;

export const TaskTitle = styled.div`
    margin-left: 14px;
`;

const QuestIcon = styled(FaFlagCheckered)`
    margin-right: 8px;
`;

const TaskIcon = styled(CgEditBlackPoint)`
    margin-right: 6px;
`;

export const QuestlogUI: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const { playerQuestLog, playerQuestLogTasks } = gameStore.gameEngine.gameState;
    const languageKey = gameStore.languageKey;
    const { rootActionTree } = gameStore.gameEngine;

    return (
        <QuestWindow>
            <GUIHeadlineLight>{t("game.quest_log")}
                <GUIHeadlineSuffix>{"(" + playerQuestLog.size + ")"}</GUIHeadlineSuffix>
            </GUIHeadlineLight>
            <GUIBox>
                {
                    wrapArraySet(playerQuestLog).map(questModelId =>
                        <QuestContainer key={questModelId}>
                            <GUITextBold>
                                <QuestIcon />
                                <DialogueParser
                                    dialogueString={rootActionTree.questForId(questModelId).description.get(languageKey)}
                                    initialTreeScopeContext={rootActionTree.questForId(questModelId)}
                                />
                            </GUITextBold>
                            {
                                wrapIterator(playerQuestLogTasks.keys()).map(id => rootActionTree.taskForId(id)).filter(task => gameStore.gameEngine.resolvePotentialTreeParameter(task.questId, task) === questModelId).map(task =>
                                    <TaskTitle key={task.$modelId}>
                                        <TaskIcon />
                                        <DialogueParser
                                            dialogueString={task.description.get(languageKey)}
                                            initialTreeScopeContext={task}
                                        />
                                        {
                                            task.isTaskWithLocation() && (
                                                <FaMapMarker color={numberToCSSColor(playerQuestLogTasks.get(task.$modelId))} />
                                            )
                                        }
                                    </TaskTitle>
                                )
                            }
                        </QuestContainer>
                    )
                }
            </GUIBox>
        </QuestWindow>
    );
});