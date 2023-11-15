import React, { ChangeEvent, useState } from "react";
import styled from "styled-components";
import { MdUploadFile } from "react-icons/md";
import { AiOutlineCheckCircle } from "react-icons/ai";
import { UiConstants } from "../../data/UiConstants";

interface Props {
    onFileSelected?: (file: File) => void;
    acceptMimeType: string;
    labelText: string;
}

const HiddenInput = styled.input`
    display: none;
`;

const InputContent = styled.label`
    cursor: pointer;
    background-color: #BBBBBB;
    &:hover {
        background-color: ${UiConstants.COLOR_HOVER};
    }
    border: solid black 1px;
    display: flex;
    align-items: center;
    padding-top: 2px;
    padding-right: 4px;
    margin: 2px;
    border-radius: ${UiConstants.BORDER_RADIUS};
`;

const UploadIcon = styled(MdUploadFile)`
    cursor: pointer;
    margin-bottom: 2px;
    margin-right: 4px;
    margin-left: 2px;
`;

const CheckIcon = styled(AiOutlineCheckCircle)`
    color: green;
    cursor: pointer;
    margin-bottom: 2px;
    margin-right: 4px;
    margin-left: 2px;
`;

let idCounter = 0;

export const FileUploadButton: React.FunctionComponent<Props> = ({ onFileSelected, acceptMimeType, labelText }) => {
    const [jsonInputId] = useState(() => 'file-selector-' + (idCounter++));
    const [selectedFile, setSelectedFile] = useState("");

    function onSelect(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files[0];
        setSelectedFile(file.name);
        onFileSelected(file);
    }

    return (
        <>
            <HiddenInput id={jsonInputId} type="file" accept={acceptMimeType} onChange={onSelect} />
            <InputContent htmlFor={jsonInputId}>
                {
                    !selectedFile &&
                    <><UploadIcon size={24} /> {labelText}</>
                }
                {
                    selectedFile &&
                    <><CheckIcon size={24} /> {selectedFile}</>
                }
            </InputContent>
        </>
    );
};
