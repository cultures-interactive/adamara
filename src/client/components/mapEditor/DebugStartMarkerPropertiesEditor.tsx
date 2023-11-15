import React from 'react';
import { AiFillDelete } from 'react-icons/ai';
import styled from 'styled-components';
import { undoableSetDebugStartMarkerOp } from '../../stores/undo/operation/MapEditorDebugStartMarkerChangeOp';
import { MenuCard } from '../menu/MenuCard';
import { MenuCardLabel } from '../menu/MenuCardLabel';
import { LayerDeleteButton } from './EditorTileInspectorLayer';

const TitleBar = styled.div`
    display: flex;
`;

const TitleName = styled(MenuCardLabel)`
    flex-grow: 1;
`;

const Buttons = styled.div`
    flex-shrink: 0;
`;

export const DebugStartMarkerPropertiesEditor: React.FunctionComponent = () => {
    const deleteElement = () => {
        undoableSetDebugStartMarkerOp(null, null);
    };

    return (
        <MenuCard>
            <TitleBar>
                <TitleName>
                    <div>Debug Start</div>
                </TitleName>
                <Buttons>
                    <LayerDeleteButton onClick={deleteElement}><AiFillDelete /></LayerDeleteButton>
                </Buttons>
            </TitleBar>
        </MenuCard>
    );
};