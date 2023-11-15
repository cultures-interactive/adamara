import React from 'react';
import { routes } from '../../data/routes';
import { userStore } from '../../stores/UserStore';
import { NavigateTo } from '../shared/NavigateTo';
import { Game } from './Game';

export const PlayCodeRoute: React.FunctionComponent = () => {
    if (!userStore.isWorkshopPlayer)
        return <NavigateTo to={routes.home} />;

    return (
        <Game />
    );
};
