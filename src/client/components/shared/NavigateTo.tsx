import React from 'react';
import { Redirect, useLocation } from "react-router";
import { getFullRoute } from '../../helper/navigationHelpers';

interface NavigateToProps {
    to: string;
}

export const NavigateTo: React.FunctionComponent<NavigateToProps> = ({ to }) => {
    const location = useLocation();
    return <Redirect to={getFullRoute(to, location)} />;
};