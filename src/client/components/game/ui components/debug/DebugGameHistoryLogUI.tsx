import React, { useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { BackgroundColorElement, BackgroundColorElementActive, BorderPrimary, FontColorHighlight, FontColorLowlight, FontColorWarn, GUIHeadline, GUIHeadlineSuffix, GUISelectableText, GUISubBox, GUITextDebug } from "../GameUIElements";
import styled from "styled-components";
import { toHumanReadableId } from "../../../../../shared/helper/actionTreeHelper";
import { IoIosCopy } from "react-icons/io";
import { VscClearAll } from "react-icons/vsc";
import { UiConstants } from "../../../../data/UiConstants";
import { SectionHeader } from "./GameDebugInfoUI";
import { InputWithMargin } from "../../../editor/Input";
import { gameStore } from "../../../../stores/GameStore";
import { LogEntry } from "../../../../stores/LogEntry";
import { reaction } from "mobx";
import { useThrottledForceUpdate } from "../../../../helper/reactHelpers";

const LogContainer = styled(GUISubBox)`
    display: flex;
    flex-direction: column;
    min-width: 500px;
    height: 100%;
    overflow-y: scroll;
`;

interface LogEntryProps {
    useSeparator: boolean;
}

const LogEntryContainer = styled.div<LogEntryProps>`
    display: flex;
    flex-direction: row;
    border-top: ${props => props.useSeparator ? "1px solid " + BackgroundColorElementActive : ""};
    padding-top: 8px;
`;


const LeftContainer = styled.div`
    display: flex;
    flex-grow: 1;
    flex-shrink: 0;
`;

const RightContainer = styled.div`
    display: flex;
    flex-grow: 0;
    flex-shrink: 1;
`;

interface LogDataProperties {
    highlightAsWarning?: boolean;
}

const LogData = styled.div<LogDataProperties>`
    margin-right: 8px;
    ${props => props.highlightAsWarning ? "color: " + FontColorWarn : ""};
`;

const LogDataTime = styled(LogData)`
    color: ${FontColorLowlight};
`;

const LogDataEntity = styled(LogData)`
    color: ${FontColorHighlight};
`;

const Row = styled.div`
  display: flex;
  flex-direction: row;
`;

const RowContainer = styled.div`
    display: flex;
    flex-direction: column;
`;

const IconButton = styled.div`
    display: flex;
    justify-content: center;
    background-color:${BackgroundColorElement};
    &:hover {
        background-color: ${BackgroundColorElementActive};
    }
    margin-right: 8px;
    cursor: pointer;
    border-radius: ${UiConstants.BORDER_RADIUS};
    ${BorderPrimary}
`;

const Checkbox = styled.label`
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-right: 8px;
`;

interface LogEntryViewProps {
    entry: LogEntry;
}

const LogEntryView: React.FunctionComponent<LogEntryViewProps> = observer(({ entry }) => {
    const { t } = useTranslation();

    return (
        <LogEntryContainer useSeparator={entry.useSeparator}>
            <LogDataTime>{entry.time}</LogDataTime>
            <RowContainer>
                <Row>
                    <LogData highlightAsWarning={entry.isWarning}>{t(entry.executionType)}</LogData>
                    {
                        entry.executionEntity && <LogDataEntity>'{t(entry.executionEntity)}'</LogDataEntity>
                    }
                    {
                        entry.executionEntityId && (
                            <GUITextDebug>
                                id:&nbsp;
                                <GUISelectableText>
                                    {toHumanReadableId(entry.executionEntityId)}
                                </GUISelectableText>
                            </GUITextDebug>
                        )
                    }
                </Row>
                <Row>
                    {
                        entry.executionSourceEntity && (
                            <>
                                {t("game.debug_log_triggered_by")}&nbsp;
                                <LogDataEntity>'{t(entry.executionSourceEntity)}'</LogDataEntity>
                                <GUITextDebug>
                                    id:&nbsp;
                                    <GUISelectableText>
                                        {toHumanReadableId(entry.executionSourceId)}
                                    </GUISelectableText>
                                </GUITextDebug>
                            </>
                        )
                    }
                </Row>
            </RowContainer>
        </LogEntryContainer>
    );
});

interface LogsProps {
    autoRefresh: boolean;
}

const Logs: React.FunctionComponent<LogsProps> = ({ autoRefresh }) => {
    const scrollContainer = useRef<HTMLDivElement>(null);

    function scrollToBottom() {
        if (scrollContainer.current) {
            scrollContainer.current.scrollTop = scrollContainer.current.scrollHeight;
        }
    }

    useEffect(() => {
        if (!autoRefresh)
            return;

        scrollToBottom();
    });

    /* Throttle mobx gameStore.gameLog updates to x times per second.
     * 
     * I have yet to find a better method to do this than
     * 1. counting changes with an observable counter (which is only a smidge cleaner manually looping
     *    through the array and touching every logEntry.id just to get an update) and
     * 2. manually forcing a (throttled) update afterwards.
     * 
     * Just assigning gameStore.gameLog via a useState doesn't work because useState is shallow, and I
     * don't want to copy the array via [...gameStore.gameLog] for every single update.
     */
    const forceUpdate = useThrottledForceUpdate(2);
    useEffect(() => {
        if (!autoRefresh)
            return undefined;

        return reaction(
            () => gameStore.gameLogChangeCounter,
            forceUpdate
        );
    }, [autoRefresh]);

    return (
        <LogContainer ref={scrollContainer}>
            {
                gameStore.gameLog.map(entry =>
                    <LogEntryView key={entry.id} entry={entry} />
                )
            }
        </LogContainer>
    );
};

export const GameLogLengthDisplay: React.FunctionComponent = observer(() => {
    return <span>{gameStore.gameLogLength}</span>;
});

export const DebugGameHistoryLogUI: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    async function copyLog() {
        let completeLog = "";
        gameStore.gameLog.forEach(log => completeLog += log.toString(t) + "\n");
        await navigator.clipboard.writeText(completeLog);
    }

    function toggleLimit() {
        if (gameStore.gameLogLimit == 100) gameStore.setGameLogLimit(-1);
        else gameStore.setGameLogLimit(100);
    }

    return (
        <>
            <SectionHeader>
                <LeftContainer>
                    <GUIHeadline>{t("game.debug_headline_history_log")} </GUIHeadline>
                    <GUIHeadlineSuffix>(<GameLogLengthDisplay />)</GUIHeadlineSuffix>
                </LeftContainer>
                <RightContainer>
                    <Checkbox>
                        <InputWithMargin
                            type={"checkbox"}
                            checked={gameStore.debugLogAndTriggerAutoRefresh}
                            onChange={gameStore.toggleDebugLogAndTriggerAutoRefresh}
                        />
                        {t("game.debug_auto_refresh")}
                    </Checkbox>
                    <Checkbox>
                        <InputWithMargin type={"checkbox"} checked={gameStore.gameLogLimit == 100} onChange={toggleLimit} />
                        {t("game.debug_max_log_entries", { count: 100 })}
                    </Checkbox>
                    <IconButton onClick={(_) => copyLog()}>
                        <IoIosCopy />{t("game.debug_log_button_copy")}
                    </IconButton>
                    <IconButton onClick={(_) => gameStore.clearLog()}>
                        <VscClearAll />{t("game.debug_log_button_clear")}
                    </IconButton>
                </RightContainer>
            </SectionHeader>
            <Logs autoRefresh={gameStore.debugLogAndTriggerAutoRefresh} />
        </>
    );
});