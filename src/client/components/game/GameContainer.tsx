import React, { Component } from 'react';
import styled from 'styled-components';
import { disposeGame, getGame, createGame } from '../../canvas/game/Game';
import { gameCanvasSize } from "../../data/gameConstants";
import { AutoScaleContainer } from './AutoScaleContainer';
import { GameUI } from "./GameUI";

const CanvasContainer = styled.div`
    canvas {
        position: absolute;
    }
`;

// It's not great having to use a class-based component here, but after hours of fiddling with the functional component
// together with hot reloading, the class component seems to be the only way to do all I want to:
// 1. Always call createGame() on mount
// 2. Always call disposeGame() on dismount
// 3. Properly do 2. even after Game.ts was hot reloaded while a GameContainer was open
// 4. Don't trigger createGame()/disposeGame() from here on unrelated hot reloads.
// With functional components, I can easily achieve 1 and 2, but lose either 3 or 4.
export class GameContainer extends Component {
    private refElement: HTMLElement;

    public componentDidMount() {
        createGame();
        getGame().attach(this.refElement);
    }

    public componentWillUnmount() {
        disposeGame();
    }

    public render() {
        return (
            <AutoScaleContainer
                width={gameCanvasSize.width}
                height={gameCanvasSize.height}
            >
                <CanvasContainer ref={ref => {
                    this.refElement = ref;

                    const game = getGame();
                    if (!game)
                        return;

                    if (ref) {
                        game.attach(ref);
                    } else {
                        game.detach();
                    }
                }} />
                <GameUI />
            </AutoScaleContainer>
        );
    }
}

/*
export const GameContainer: React.FunctionComponent = () => {
    const gameDivRef = usePixiApp(createGame, getGame, disposeGame, gameModuleHotGuard);

    return (
        <ScalingContainer>
            <div ref={gameDivRef} />
            <GameUI />
        </ScalingContainer>
    );
};
*/