import {
  createMessage,
  TEMPLATES_BACK_BUTTON,
} from "@appsmith/constants/messages";
import { Button, Icon } from "design-system";
import { Text, TextType } from "design-system-old";
import React from "react";
import styled from "styled-components";

const BackButtonWrapper = styled.div<{ width?: number; hidden?: boolean }>`
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spaces[2]}px;
  ${(props) => props.width && `width: ${props.width};`}
  ${(props) => props.hidden && "visibility: hidden;"}
`;

const HeaderWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  padding-bottom: ${(props) => props.theme.spaces[9]}px;
`;

type TemplateModalHeaderProps = {
  onBackPress?: () => void;
  onClose: () => void;
  hideBackButton?: boolean;
  className?: string;
};

function TemplateModalHeader(props: TemplateModalHeaderProps) {
  return (
    <HeaderWrapper className={props.className}>
      <BackButtonWrapper
        hidden={props.hideBackButton}
        onClick={props.onBackPress}
      >
        <Icon name="view-less" size="md" />
        <Text type={TextType.P4}>{createMessage(TEMPLATES_BACK_BUTTON)}</Text>
      </BackButtonWrapper>
      <Button
        isIconButton
        kind="tertiary"
        onClick={props.onClose}
        size="sm"
        startIcon="close-x"
      />
    </HeaderWrapper>
  );
}

export default TemplateModalHeader;
