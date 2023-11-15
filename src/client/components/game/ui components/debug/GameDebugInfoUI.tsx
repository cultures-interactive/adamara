import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { wrapArraySet, wrapIterator } from "../../../../../shared/helper/IterableIteratorWrapper";
import { GUIHeadline, GUIBox, GUISubBox } from "../GameUIElements";
import styled from "styled-components";
import { DebugGameHistoryLogUI } from "./DebugGameHistoryLogUI";
import { ActiveTriggerDebugUI } from "./ActiveTriggerDebugUI";
import { editorMapStore } from "../../../../stores/EditorMapStore";
import { gameStore } from "../../../../stores/GameStore";

const FixedHeightGUIBox = styled(GUIBox)`
    height: 225px;
`;

const FlexRow = styled.div`
    display: flex;
    flex-direction: row;
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    margin: 2px;
`;

export const SectionHeader = styled.div`
    display: flex;
    flex-direction: row;
    margin-left: 4px;
`;


export const GameDebugInfoUI: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const { playerReputationWindChasers, playerReputationSilverAnchors, playerAwareness, playerPlayStyle, currentAct, currentMap } = gameStore.gameEngine.gameState;

    return (
        <FixedHeightGUIBox>
            <FlexRow>
                <Section>
                    <SectionHeader>
                        <GUIHeadline>{t("game.debug_headline_misc")}</GUIHeadline>
                    </SectionHeader>
                    <GUISubBox>
                        <div>Map: {editorMapStore.mapList.find(map => map.id === currentMap)?.name} (#{currentMap})</div>
                        <div>Tags</div>
                        {
                            wrapArraySet(gameStore.gameEngine.gameState.playerTags).map(tag => (
                                <div key={tag}>- {tag}</div>))
                        }
                        <div>Variables</div>
                        {
                            wrapIterator(gameStore.gameEngine.gameState.variables.keys()).map(name => (
                                <div key={name}>- {name.includes("_") ? name.substring(name.indexOf("_")) : name} = {gameStore.gameEngine.gameState.variables.get(name)}</div>))
                        }
                        <button onClick={_ => gameStore.setPlayerCharacter(null)}>Open CharEditor</button>
                    </GUISubBox>
                </Section>
                <Section>
                    <SectionHeader>
                        <GUIHeadline>{t("game.player_progress")}</GUIHeadline>
                    </SectionHeader>
                    <GUISubBox>
                        <table>
                            <tbody>
                                <tr>
                                    <td>{t("action_editor.property_act")}</td>
                                    <td>{currentAct}</td>
                                </tr>
                                <tr>
                                    <td>{t("action_editor.property_play_style")}</td>
                                    <td>{t(t("content.play_style_" + playerPlayStyle))}</td>
                                </tr>
                                <tr>
                                    <td>{t("content.faction_LandSeeker")} {t("action_editor.property_reputation")}</td>
                                    <td>{playerReputationWindChasers.toFixed(2)} %</td>
                                </tr>
                                <tr>
                                    <td>{t("content.faction_WaterStayer")} {t("action_editor.property_reputation")}</td>
                                    <td>{playerReputationSilverAnchors.toFixed(2)} %</td>
                                </tr>
                                <tr>
                                    <td>{t("action_editor.property_awareness")}</td>
                                    <td>{playerAwareness}</td>
                                </tr>
                            </tbody>
                        </table>
                    </GUISubBox>
                </Section>
                <Section style={{ flexBasis: "600px" }}>
                    <DebugGameHistoryLogUI />
                </Section>
                <Section style={{ flexBasis: "200px" }}>
                    <ActiveTriggerDebugUI />
                </Section>
            </FlexRow>
        </FixedHeightGUIBox>
    );
});