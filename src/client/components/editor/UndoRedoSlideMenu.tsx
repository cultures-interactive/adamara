import React from 'react';
import { observer } from 'mobx-react-lite';
import { HeaderUndoRedo } from './HeaderUndoRedo';
import { Adjustment, SlideMenu, State } from '../menu/SlideMenu';

export const UndoRedoSlideMenu: React.FunctionComponent = observer(() => {
    return (
        <SlideMenu
            identifier={"undo-redo-top"}
            orientation={Adjustment.Top}
            start={570}
            state={State.Expanded}
            collapsible={false}>
            <HeaderUndoRedo />
        </SlideMenu>
    );
});
