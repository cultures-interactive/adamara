import React, { useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { SectionHeader } from "./GameDebugInfoUI";
import { BorderPrimary, FontColorHighlight, FontColorModerate, GUIHeadlineSuffix, GUISelectableText, GUISubBox, GUIHeadline, GUITextDebug, GUITextNormalDebug } from "../GameUIElements";
import { toHumanReadableId } from "../../../../../shared/helper/actionTreeHelper";
import { gameStore } from "../../../../stores/GameStore";
import { useThrottle } from "@react-hook/throttle";
import { autorun } from "mobx";
import { getActionShortDescriptionForActionEditor } from "../../../../helper/actionEditorHelpers";
import { actionNodeIcon } from "../../../action/actionNodeData";

const ScrollContainer = styled(GUISubBox)`
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: scroll;
    width: 100%;
`;

const TriggerContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 2px;
    padding: 2px;
    ${BorderPrimary}
`;

interface TriggerProps {
    actionId: string;
}

const Trigger: React.FunctionComponent<TriggerProps> = observer(({ actionId }) => {
    const { t } = useTranslation();
    const action = gameStore.gameEngine.getCachedActionNode(actionId);

    if (!action)
        return null;

    return (
        <TriggerContainer key={actionId}>
            <GUITextNormalDebug color={FontColorHighlight}>
                {
                    actionNodeIcon(action)
                }
                {
                    t(action.title())
                }
            </GUITextNormalDebug>
            <GUITextNormalDebug color={FontColorModerate}>
                {
                    getActionShortDescriptionForActionEditor(action, t)
                }
            </GUITextNormalDebug>
            <GUITextDebug>
                id:
                <GUISelectableText>
                    {
                        toHumanReadableId(actionId)
                    }
                </GUISelectableText>
            </GUITextDebug>
        </TriggerContainer>
    );
});

export const ActiveTriggerDebugUI: React.FunctionComponent = () => {
    const { t } = useTranslation();

    const getActiveTriggers = () => gameStore.gameEngine ? Array.from(gameStore.gameEngine.gameState.activeTriggerActions.values()) : [];

    const [activeTriggers, setActiveTriggers] = useThrottle(getActiveTriggers(), 2);

    useEffect(() => {
        return autorun(() => {
            if (gameStore.debugLogAndTriggerAutoRefresh) {
                setActiveTriggers(getActiveTriggers());
            }
        });
    }, []);

    return (
        <>
            <SectionHeader>
                <GUIHeadline>{t("game.debug_headline_history_active_trigger")} </GUIHeadline>
                <GUIHeadlineSuffix>{"(" + activeTriggers.length + ")"}</GUIHeadlineSuffix>
            </SectionHeader>
            <ScrollContainer>
                {
                    activeTriggers.map(actionId => <Trigger key={actionId} actionId={actionId} />)
                }
            </ScrollContainer>
        </>
    );
};