import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { AnimationPropertiesValueModel } from "../../../../../shared/action/ValueModel";
import { sharedStore } from "../../../../stores/SharedStore";
import { AnimationType } from "../../../../../shared/resources/AnimationAssetModel";
import { gameStore } from "../../../../stores/GameStore";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%; 
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    margin-top: 4px;
`;

const RowLabel = styled.div`
    min-width: 100px;
`;

const Select = styled.select`
    width: 100%;
`;

interface Props {
    animationProp: AnimationPropertiesValueModel;
}

export const AnimationSelectionDetail: React.FunctionComponent<Props> = observer(({ animationProp: animationProp }) => {
    const { t } = useTranslation();

    const allAnimations = Array
        .from(sharedStore.animationAssets.values())
        .filter(animation => animation.isType(AnimationType.Cutscene));

    const selectedAnimation = sharedStore.getAnimationByName(animationProp.value);

    function onAnimationSelected(animationId: string) {
        animationProp.setValue(animationId);
    }

    function onAnimationSequenceSelected(animationSequence: string) {
        animationProp.setSequence(animationSequence);
    }

    return (
        <Container>
            <Row>
                <RowLabel>
                    {t("action_editor.property_name")}
                </RowLabel>
                <Select
                    value={animationProp.value ? animationProp.value : ""}
                    onChange={({ target }) => onAnimationSelected(target.value)}
                >
                    <option value="">-</option>
                    {
                        allAnimations.map(animation => <option key={animation.name} value={animation.name}>{animation.localizedName.get(gameStore.languageKey)}</option>)
                    }
                </Select>
            </Row>
            <Row>
                <RowLabel>
                    {t("action_editor.property_sequence")}
                </RowLabel>
                <>
                    <Select
                        value={animationProp.sequence ? animationProp.sequence : ""}
                        onChange={({ target }) => onAnimationSequenceSelected(target.value)}
                    >
                        <option value="">-</option>
                        {
                            selectedAnimation && selectedAnimation.animationNames.map(state => <option key={state} value={state}>{state}</option>)
                        }
                    </Select>
                </>
            </Row>
        </Container>
    );
});