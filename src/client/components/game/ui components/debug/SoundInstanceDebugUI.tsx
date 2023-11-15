import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { SectionHeader } from "./GameDebugInfoUI";
import { BorderPrimary, GUIHeadlineSuffix, GUISubBox, GUIHeadline } from "../GameUIElements";
import { soundCache } from "../../../../stores/SoundCache";

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

const ItemContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 2px;
    padding: 2px;
    ${BorderPrimary}
`;

const AdjustedScrollContainer = styled(ScrollContainer)`
    max-height: 245px;
`;

interface SoundInstanceData {
    name: string;
    volume: number;
}

export const SoundInstanceDebugUI: React.FunctionComponent = () => {
    const { t } = useTranslation();

    const [activeInstances, setActiveInstances] = useState<SoundInstanceData[]>([]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const allInstances = new Array<SoundInstanceData>();
            for (const [name, sound] of soundCache.allSounds) {
                for (const instance of sound.instances) {
                    allInstances.push({
                        name,
                        volume: instance.volume * sound.volume
                    });
                }
            }
            setActiveInstances(allInstances);
        }, 100);
        return () => clearInterval(intervalId);
    }, []);

    return (
        <>
            <SectionHeader>
                <SectionHeaderLabel>
                    <GUIHeadline>{t("game.debug_headline_active_sound_instances")} </GUIHeadline>
                    <GUIHeadlineSuffix>{"(" + activeInstances.length + ")"}</GUIHeadlineSuffix>
                </SectionHeaderLabel>
            </SectionHeader>
            <AdjustedScrollContainer>
                {activeInstances.map((instance, index) => (
                    <ItemContainer key={index}>
                        {instance.name}
                        <progress value={instance.volume} max={1} />
                    </ItemContainer>
                ))}
            </AdjustedScrollContainer>
        </>
    );
};