import React from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { CharacterSelectionHelper } from "../../helper/CharacterSelectionHelper";
import { translationStore } from "../../stores/TranslationStore";
import { gameStore } from "../../stores/GameStore";

const Container = styled.div`
    width: 100%; 
    align-items: center;
    justify-content: center;
    text-align: center;
`;

const IconContainer = styled.div`
    font-size: xx-large; 
`;

interface Props {
    className: string;
}

export const SkinClassIcon: React.FunctionComponent<Props> = observer(({ className }) => {
    const icon = CharacterSelectionHelper.ClassNameToIcon.get(className) as JSX.Element;

    return (
        <Container>
            <IconContainer>
                {icon}
            </IconContainer>
            {!icon && <span>{translationStore.makeshiftTranslationSystemData.characterSkinVariantClasses.getTranslation(gameStore.languageKey, className)}</span>}
        </Container>
    );
});