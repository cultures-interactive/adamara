import styled from "styled-components";
import { Heading1Base } from "../shared/Heading";

export const MenuCardLabel = styled(Heading1Base)`
    display: flex;
    flex-direction: row;
    font-size: larger;
    margin-bottom: 4px;
    cursor: default;
    padding: 2px;
`;

export const MenuCardLabelSuffix = styled.div`
    font-size: initial;
    margin-left: 4px;
    color: #343333;
`;
