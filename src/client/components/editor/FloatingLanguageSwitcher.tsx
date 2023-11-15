import React from "react";
import styled from "styled-components";
import { LanguageSwitcher } from "./LanguageSwitcher";

const Container = styled.div`
    position: fixed;
    right: 0;
    top: 0;
`;

export const FloatingLanguageSwitcher: React.FunctionComponent = () => {
    return (
        <Container>
            <LanguageSwitcher />
        </Container>
    );
};