import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { FadeCameraActionModel } from "../../../../shared/action/ActionModel";
import { ElementLabel } from "./components/BaseElements";
import { InputWithMargin } from "../../editor/Input";

const Container = styled.div`
    width: 100%; 
`;

const OptionHeader = styled.div`
    display: flex;
    flex-direction: row;
`;

const InputOption = styled(ElementLabel)`
    display: flex;
    flex-direction: row;
    margin: 4px;
    cursor: pointer;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
`;

const HeaderText = styled.div`
    margin-top: 2px;
    margin-left: 4px;
`;

interface Props {
    action: FadeCameraActionModel;
}

export const FadeCameraActionDetails: React.FunctionComponent<Props> = observer(({ action }) => {
    const { t } = useTranslation();

    function onFadeInClicked() {
        action.setFadeIn(true);
    }

    function onFadeOutClicked() {
        action.setFadeIn(false);
    }

    function toggleDuration() {
        action.setWithDuration(!action.withDuration);
    }

    return (
        <Container>
            <OptionHeader>
                <HeaderText>
                    {t("action_editor.node_fade_overlay_headline")}
                </HeaderText>
            </OptionHeader>
            <Row>
                <InputOption onClick={onFadeInClicked}>
                    <InputWithMargin
                        type={"radio"}
                        checked={action.fadeIn}
                        onChange={e => { }}
                    />
                    {t("action_editor.node_fade_overlay_fade_in")}
                </InputOption>
                <InputOption onClick={onFadeOutClicked}>
                    <InputWithMargin
                        type={"radio"}
                        checked={!action.fadeIn}
                        onChange={e => { }}
                    />
                    {t("action_editor.node_fade_overlay_fade_out")}
                </InputOption>
            </Row>
            <Row>
                <InputOption>
                    <InputWithMargin
                        type={"checkbox"}
                        checked={action.withDuration}
                        onChange={toggleDuration}
                    />
                    {t("action_editor.node_fade_overlay_use_duration")}
                </InputOption>
            </Row>
        </Container>
    );
});