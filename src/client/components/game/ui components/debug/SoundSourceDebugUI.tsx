import React, { useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { SectionHeader } from "./GameDebugInfoUI";
import { BorderPrimary, GUIHeadlineSuffix, GUISubBox, GUIHeadline } from "../GameUIElements";
import { gameStore } from "../../../../stores/GameStore";
import { useThrottle } from "@react-hook/throttle";
import { autorun } from "mobx";
import { SoundSource } from "../../../../canvas/game/controller/SoundActionHelper";

const ScrollContainer = styled(GUISubBox)`
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: scroll;
    width: 100%;
`;

const SectionHeaderLabel = styled.label`
    display: flex;
    flex-direction: row;
`;

const SoundSourceContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 2px;
    padding: 2px;
    ${BorderPrimary}
`;

const AdjustedScrollContainer = styled(ScrollContainer)`
    max-height: 245px;
`;

interface SoundSourceOverviewProps {
    soundSources: SoundSource[];
}

const SoundSourceOverview: React.FunctionComponent<SoundSourceOverviewProps> = observer(({ soundSources }) => {
    let playingSoundSources = 0;
    let waitingSoundSources = 0;
    for (const soundSource of soundSources) {
        if (soundSource.debugOutputVolume === null) {
            waitingSoundSources++;
        } else {
            playingSoundSources++;
        }
    }

    return (
        <div>
            <div>Playing: {playingSoundSources}</div>
            <div>Currently stopped: {waitingSoundSources}</div>
            <hr />
        </div>
    );
});

interface SoundSourceProps {
    soundSource: SoundSource;
}

const SoundSourceDisplay: React.FunctionComponent<SoundSourceProps> = observer(({ soundSource }) => {
    return (
        <SoundSourceContainer>
            <div>
                {soundSource.soundName}
                {(soundSource.debugOutputVolume === null)
                    ? <div>Currently stopped</div>
                    : <progress value={soundSource.debugOutputVolume} max={1} />
                }
            </div>
        </SoundSourceContainer>
    );
});

export const SoundSourceDebugUI: React.FunctionComponent = () => {
    const { t } = useTranslation();

    const getActiveSoundSources = () => Array.from(gameStore.activeSoundSources);
    const [activeSoundSources, setActiveSoundSources] = useThrottle(getActiveSoundSources(), 2);

    useEffect(() => {
        return autorun(() => {
            setActiveSoundSources(getActiveSoundSources());
        });
    }, []);

    return (
        <>
            <SectionHeader>
                <SectionHeaderLabel>
                    <GUIHeadline>{t("game.debug_headline_active_sound_sources")} </GUIHeadline>
                    <GUIHeadlineSuffix>{"(" + activeSoundSources.length + ")"}</GUIHeadlineSuffix>
                </SectionHeaderLabel>
            </SectionHeader>
            <AdjustedScrollContainer>
                <SoundSourceOverview soundSources={activeSoundSources} />
                {activeSoundSources.map((soundSource, index) => <SoundSourceDisplay key={index} soundSource={soundSource} />)}
            </AdjustedScrollContainer>
        </>
    );
};