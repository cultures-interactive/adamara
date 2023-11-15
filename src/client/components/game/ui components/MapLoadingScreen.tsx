import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { LoadingSpinner } from "../../shared/LoadingSpinner";
import { CenterContainer } from "../../shared/PopupComponents";

const Container = styled.div`
    color: white;
    font-size: 2em;
`;

const SpinnerOffset = styled.div`
    margin-right: 0.5em;
    margin-top: 0.35em;
`;

export const MapLoadingScreen: React.FunctionComponent = () => {
    const { t } = useTranslation();

    return (
        <CenterContainer>
            <SpinnerOffset>
                <LoadingSpinner />
            </SpinnerOffset>
            <Container>
                {t("game.map_loading")}
            </Container>
        </CenterContainer>
    );
};