import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Slider, SliderTrack, SliderThumb } from '../../../editor/Slider';
import { ElementGroup, ElementLabel } from './BaseElements';

const SliderContainer = styled.div`
    display: flex;
    flex-direction: row;
    margin: 8px;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
`;

const SliderLabel = styled.div`
    margin: 0px 4px;
`;

interface NumberActionDetailProps {
    keyName: string;
    keyLabelLeft: string;
    keyLabelRight: string;
    value: number;
    valueSetter: (value: number) => void;
    min: number;
    max: number;
    step: number;
}

export const PercentageSliderActionDetail: React.FunctionComponent<NumberActionDetailProps> = observer(({
    keyName, keyLabelLeft, keyLabelRight, value, valueSetter, min, max, step
}) => {
    const { t } = useTranslation();

    return (
        <ElementGroup>
            <ElementLabel>{t(keyName) + ": " + Math.floor(value * 100) + "%"}</ElementLabel>
            <SliderContainer>
                {keyLabelLeft && <SliderLabel>{t(keyLabelLeft)}</SliderLabel>}
                <Slider
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    renderTrack={SliderTrack}
                    renderThumb={SliderThumb}
                    onChange={valueSetter}
                />
                {keyLabelRight && <SliderLabel>{t(keyLabelRight)}</SliderLabel>}
            </SliderContainer>
        </ElementGroup>
    );

});