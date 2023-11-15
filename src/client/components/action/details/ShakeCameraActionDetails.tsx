import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { ShakeCameraActionModel } from "../../../../shared/action/ActionModel";
import { NumberActionDetail } from "./components/NumberActionDetail";
import { BooleanActionDetail } from "./components/BooleanActionDetail";
import { PercentageSliderActionDetail } from "./components/PercentageSliderActionDetail";
import { FloatInputField } from "../../shared/FloatInputField";
import { ElementGroup, ElementLabel } from "./components/BaseElements";

interface Props {
    action: ShakeCameraActionModel;
}

export const ShakeCameraActionDetails: React.FunctionComponent<Props> = observer(({ action }) => {
    const { t } = useTranslation();

    function onIntensitySliderChange(sliderValue: number) {
        action.setIntensity(sliderValue);
    }

    return (
        <>
            <PercentageSliderActionDetail
                keyName=/*t*/"action_editor.node_shake_camera_intensity"
                keyLabelLeft=/*t*/"action_editor.node_shake_camera_intensity_low"
                keyLabelRight=/*t*/"action_editor.node_shake_camera_intensity_high"
                min={0.0}
                max={1}
                step={0.01}
                value={action.intensity}
                valueSetter={onIntensitySliderChange}
            />
            <BooleanActionDetail name={t("action_editor.node_shake_camera_fade_out")} checked={action.fadeOut} toggle={() => action.setFadeOut(!action.fadeOut)} />
            <ElementGroup>
                <ElementLabel>{t("action_editor.node_shake_camera_duration")}</ElementLabel>
                <FloatInputField value={action.durationSeconds} onlyPositive={true} onChange={value => action.setDurationSeconds(value)} />
            </ElementGroup>
            {/*<NumberActionDetail name={"action_editor.node_shake_camera_duration"} value={action.durationSeconds.toString()} valueSetter={(value) => action.setDurationSeconds(+value)} />*/}
        </ >
    );
});