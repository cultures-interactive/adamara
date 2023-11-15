import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import styled, { css } from "styled-components";
import { IoReturnDownBack, IoReturnDownForward } from "react-icons/io5";
import { Direction, DirectionHelper } from "../../../shared/resources/DirectionHelper";
import { CharacterAnimationPrefixIdle } from "../../canvas/game/character/characterAnimationHelper";
import { CharacterEditorColorButton } from "../game/ui components/GameUIElements";

const Container = styled.div`
    display: flex;
    flex-grow: 1;
    justify-content: center;
    align-items: center;
`;

const BasicButton = css`
    margin: 4px;
    height: 40px;
    width: 100px;
    border-radius: 10px;
    background-color: ${CharacterEditorColorButton};
    color: black;
    cursor: pointer;
`;

const TurnCounterClockwiseButton = styled(IoReturnDownForward)`
    ${BasicButton};
`;

const TurnClockwiseButton = styled(IoReturnDownBack)`
    ${BasicButton};
`;

interface Props {
    onAnimationStateChange: (stateName: string) => void;
}

export const ComponentTurnCharacter: React.FunctionComponent<Props> = observer((props) => {

    const [currentDirection, setCurrentDirection] = useState(Direction.East);

    function onDirectionChange(direction: Direction) {
        setCurrentDirection(direction);
        props.onAnimationStateChange(CharacterAnimationPrefixIdle + DirectionHelper.getName(direction));
    }

    function onClickTurnCounterClockwise() {
        onDirectionChange(DirectionHelper.turnCounterClockwise(currentDirection));
    }

    function onClickTurnClockwise() {
        onDirectionChange(DirectionHelper.turnClockwise(currentDirection));
    }

    return (
        <Container>
            <TurnCounterClockwiseButton onClick={onClickTurnCounterClockwise} />
            <TurnClockwiseButton onClick={onClickTurnClockwise} />
        </Container>
    );
});
