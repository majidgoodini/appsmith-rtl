import React from "react";
import styled from "styled-components";
import InfoWrapper from "./InfoWrapper";
import Link from "./Link";
import {
  createMessage,
  GIT_CONFLICTING_INFO,
  LEARN_MORE,
  OPEN_REPO,
} from "@appsmith/constants/messages";
import { Text, TextType } from "design-system-old";
import { Button, Icon } from "design-system";
import { Colors } from "constants/Colors";

const Row = styled.div`
  display: flex;
  align-items: center;
`;

const StyledButton = styled(Button)`
  margin-right: ${(props) => props.theme.spaces[3]}px;
`;

type Props = {
  browserSupportedRemoteUrl: string;
  learnMoreLink: string;
};

const ConflictInfoContainer = styled.div`
  margin-top: ${(props) => props.theme.spaces[7]}px;
  margin-bottom: ${(props) => props.theme.spaces[7]}px;
`;

export default function ConflictInfo({
  browserSupportedRemoteUrl,
  learnMoreLink,
}: Props) {
  return (
    <ConflictInfoContainer data-testid="t--conflict-info-container">
      <InfoWrapper data-testid="t--conflict-info-error-warning" isError>
        <Icon color={Colors.CRIMSON} name="info" size="lg" />
        <div style={{ display: "block" }}>
          <Text color={Colors.CRIMSON} type={TextType.P3}>
            {createMessage(GIT_CONFLICTING_INFO)}
          </Text>
          <Link
            color={Colors.CRIMSON}
            link={learnMoreLink}
            text={createMessage(LEARN_MORE)}
          />
        </div>
      </InfoWrapper>
      <Row>
        <StyledButton
          className="t--commit-button"
          href={browserSupportedRemoteUrl}
          kind="secondary"
        >
          {createMessage(OPEN_REPO)}
        </StyledButton>
      </Row>
    </ConflictInfoContainer>
  );
}
