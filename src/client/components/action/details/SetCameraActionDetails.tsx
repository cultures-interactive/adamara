import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { SetCameraActionModel } from "../../../../shared/action/ActionModel";
import { InputWithMargin } from "../../editor/Input";
import { MenuCard } from "../../menu/MenuCard";
import { MapElementSelectionDetail } from "./components/MapElementSelectionDetail";
import { MapElementFilter } from "../../../helper/MapElementFilter";
import { MapElementReferenceModel } from "../../../../shared/action/MapElementReferenceModel";
import { Slider, SliderThumb, SliderTrack } from "../../editor/Slider";
import { extendedMapMarkerValueModelTypesArray } from "../../../../shared/action/ValueModel";

const Container = styled.div`
    width: 100%; 
`;

interface SetCameraActionDetailsProps {
    action: SetCameraActionModel;
}

const OptionHeader = styled.div`
    display: flex;
    flex-direction: row;
`;

const InfoContainer = styled.div`
    margin: 4px;
    font-size: small;
    max-width: 250px;
`;

const HeaderText = styled.div`
    cursor: pointer;
    margin-top: 2px;
    margin-left: 4px;
`;

const SliderContainer = styled.div`
    display: flex;
    flex-direction: row;
    margin: 8px;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
`;

const SliderLabel = styled.div`
    margin: 4px;
`;

export const SetCameraActionDetails: React.FunctionComponent<SetCameraActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();
    const zoomEnabled = action.targetZoomFactor > -1;

    function onZoomEnabledClicked() {
        if (action.targetZoomFactor < 0) action.setTargetZoomFactor(0.5);
        else action.setTargetZoomFactor(-1);
    }

    function onTargetEnabledClicked() {
        if (action.targetLocation == null) action.setTargetLocation(new MapElementReferenceModel({}));
        else action.setTargetLocation(null);
    }

    function onReturnToMainCameraClicked() {
        action.setReturnToMainCamera(!action.returnToMainCamera);
    }

    function onZoomSliderChange(sliderValue: number) {
        action.setTargetZoomFactor(sliderValue);
    }

    function onSpeedSliderChange(sliderValue: number) {
        action.setCameraMovementSpeedFactor(sliderValue);
    }

    return (
        <Container>

            <MenuCard>
                <OptionHeader onClick={onTargetEnabledClicked}>
                    <InputWithMargin
                        type={"checkbox"}
                        checked={action.targetLocation != null}
                        onChange={e => { }}
                    />
                    <HeaderText>
                        {t("action_editor.node_set_camera_target")}
                    </HeaderText>
                </OptionHeader>
                {
                    action.targetLocation && (
                        <MapElementSelectionDetail
                            name={""}
                            selectedElement={action.targetLocation}
                            elementSetter={action.setTargetLocation.bind(action)}
                            parameterTypes={extendedMapMarkerValueModelTypesArray}
                            getSelectableElements={MapElementFilter.filterExtendedMapMarkerLabels}
                        />
                    )
                }
            </MenuCard>

            <MenuCard>
                <OptionHeader onClick={onZoomEnabledClicked}>
                    <InputWithMargin
                        type={"checkbox"}
                        checked={zoomEnabled}
                        onChange={e => { }}
                    />
                    <HeaderText>
                        {t("action_editor.node_set_camera_zoom") + ((zoomEnabled) ? ": " + Math.floor(action.targetZoomFactor * 100) + "%" : "")}
                    </HeaderText>
                </OptionHeader>
                {
                    zoomEnabled &&
                    <SliderContainer>
                        <SliderLabel>{t("action_editor.node_set_camera_zoom_near")}</SliderLabel>
                        <Slider
                            value={action.targetZoomFactor}
                            min={0.01}
                            max={1}
                            step={0.01}
                            renderTrack={SliderTrack}
                            renderThumb={SliderThumb}
                            onChange={onZoomSliderChange}
                        />
                        <SliderLabel>{t("action_editor.node_set_camera_zoom_far")}</SliderLabel>
                    </SliderContainer>
                }
            </MenuCard>

            <MenuCard>
                <OptionHeader onClick={onReturnToMainCameraClicked}>
                    <InputWithMargin
                        type={"checkbox"}
                        checked={action.returnToMainCamera}
                        onChange={e => { }}
                    />
                    <HeaderText>
                        {t("action_editor.node_set_camera_return_to_main")}
                    </HeaderText>
                </OptionHeader>
                {
                    action.returnToMainCamera && (
                        <InfoContainer>
                            {t("action_editor.node_set_camera_return_to_main_active_info")}
                        </InfoContainer>
                    )
                }
                {
                    !action.returnToMainCamera && (
                        <InfoContainer>
                            {t("action_editor.node_set_camera_return_to_main_inactive_info")}
                        </InfoContainer>
                    )
                }
            </MenuCard>

            <MenuCard>
                <OptionHeader>
                    <HeaderText>
                        {t("action_editor.node_set_camera_movement_speed") + ": " + ((action.cameraMovementSpeedFactor < 1) ? Math.floor(action.cameraMovementSpeedFactor * 100) + "%" : t("action_editor.node_set_camera_movement_immediate"))}
                    </HeaderText>
                </OptionHeader>
                <SliderContainer>
                    <SliderLabel>{t("action_editor.node_set_camera_movement_slow")}</SliderLabel>
                    <Slider
                        value={action.cameraMovementSpeedFactor}
                        min={0.01}
                        max={1}
                        step={0.01}
                        renderTrack={SliderTrack}
                        renderThumb={SliderThumb}
                        onChange={onSpeedSliderChange}
                    />
                    <SliderLabel>{t("action_editor.node_set_camera_movement_fast")}</SliderLabel>
                </SliderContainer>
            </MenuCard>
        </Container>
    );
});