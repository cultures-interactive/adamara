import React from 'react';
import styled from 'styled-components';

const Image = styled.img`
    margin: 5px;
    margin-bottom: 15px;
`;

export const AdamaraLogo: React.FunctionComponent = () => {
    return (
        <Image src="assets/branding/ADAMARA_harshwaters_loading.png" alt='logo' />
    );
};