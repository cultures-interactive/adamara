import React, { } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { GUIBox, GUITextDebug, GUISelectableText } from "./GameUIElements";
import { DialogueParser } from "../DialogueParser";
import { findDialogSpeaker, getTextOfAction } from "../../../helper/gameActionTreeHelper";
import { toHumanReadableId } from "../../../../shared/helper/actionTreeHelper";
import { gameStore } from "../../../stores/GameStore";
import { localSettingsStore } from "../../../stores/LocalSettingsStore";
import { NotificationInfo, NOTIFICATION_BORDER_WIDTH } from "./NotificationController";
import { Heading2Base } from "../../shared/Heading";

interface StyleProps {
    backgroundColor: string;
    borderColor: string;
}

const ContentContainer = styled(GUIBox) <StyleProps>`
    background-color: ${props => props.backgroundColor};
    border-color: solid ${props => props.borderColor} ${NOTIFICATION_BORDER_WIDTH}px;
    color: black;
    margin: 0.2em;
`;

const Title = styled(Heading2Base)`
`;

const Text = styled.div`
`;

interface Props {
    info: NotificationInfo;
}

export const PastNotificationsItem: React.FunctionComponent<Props> = observer(({ info }) => {
    const { t } = useTranslation();
    const { action, extraInformation, borderColor, backgroundColor } = info;

    return (
        <ContentContainer
            borderColor={borderColor}
            backgroundColor={backgroundColor}
        >
            <Title>
                <DialogueParser
                    dialogueString={findDialogSpeaker(action, gameStore.gameEngine.rootActionTree, t)}
                    initialTreeScopeContext={action}
                />
            </Title>
            <Text>
                <DialogueParser
                    dialogueString={getTextOfAction(action, extraInformation, t)}
                    initialTreeScopeContext={action}
                />
            </Text>

            {
                localSettingsStore.showDebugInfo && (
                    <GUITextDebug>
                        action id:&nbsp;
                        <GUISelectableText>
                            {toHumanReadableId(action.$modelId)}
                        </GUISelectableText>
                    </GUITextDebug>
                )
            }
        </ContentContainer>
    );
});