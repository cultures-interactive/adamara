import React from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { UndoRedoSlideMenu } from '../editor/UndoRedoSlideMenu';
import { GlobalCombatVariablesEditor } from './GlobalCombatVariablesEditor';
import { PlayerAttacksEditor } from './PlayerAttacksEditor';
import { combatStore } from '../../stores/CombatStore';

const Container = styled.div`
    padding: 1em;
    padding-top: 3em;
`;

export const CombatConfigurator: React.FunctionComponent = observer(() => {
    return (
        <Container>
            <UndoRedoSlideMenu />
            {combatStore.hasConfig && (
                <>
                    <GlobalCombatVariablesEditor />
                    <PlayerAttacksEditor />
                </>
            )}
        </Container>
    );
});