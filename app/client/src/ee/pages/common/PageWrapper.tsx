export * from "ce/pages/common/PageWrapper";
import {
  Wrapper,
  PageBody,
  PageWrapperProps,
} from "ce/pages/common/PageWrapper";
import React from "react";
import { Helmet } from "react-helmet";
import { useSelector } from "react-redux";
import { useRouteMatch } from "react-router";
import styled from "styled-components";
import { BannerMessage, IconSize, Text, TextType } from "design-system-old";
import { Colors } from "constants/Colors";
import {
  getRemainingDays,
  isTrialLicense,
  shouldShowLicenseBanner,
  isAdminUser,
} from "@appsmith/selectors/tenantSelectors";
import {
  CONTINUE_USING_FEATURES,
  createMessage,
  TRIAL_EXPIRY_WARNING,
  UPGRADE,
  NON_ADMIN_USER_TRIAL_EXPIRTY_WARNING,
} from "@appsmith/constants/messages";
import { goToCustomerPortal } from "@appsmith/utils/billingUtils";
import capitalize from "lodash/capitalize";
import { selectFeatureFlags } from "selectors/usersSelectors";

const StyledBanner = styled(BannerMessage)`
  position: fixed;
  z-index: 1;
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StyledText = styled(Text)<{ color: string; underline?: boolean }>`
  text-decoration: ${(props) => (props.underline ? "underline" : "none")};
  text-underline-offset: 4px;
  color: ${(props) => props.color ?? "inherit"};
  letter-spacing: 0.2px;
  line-height: 16px;
  font-size: 13px;
`;

const enum Suffix {
  DAYS = "days",
  DAY = "day",
  HOURS = "hours",
  HOUR = "hour",
}

export function PageWrapper(props: PageWrapperProps) {
  const { isFixed = false, isSavable = false } = props;
  const isTrial = useSelector(isTrialLicense);
  const { days: gracePeriod, suffix } = useSelector(getRemainingDays);
  const showBanner = useSelector(shouldShowLicenseBanner);
  const isHomePage = useRouteMatch("/applications")?.isExact;
  const isAdmin = useSelector(isAdminUser);
  const features = useSelector(selectFeatureFlags);

  const getBannerMessage: any = () => {
    const lessThanThreeDays =
      (gracePeriod <= 3 && (suffix === Suffix.DAYS || suffix === Suffix.DAY)) ||
      suffix === Suffix.HOURS ||
      suffix === Suffix.HOUR;

    const color = lessThanThreeDays ? Colors.RED_500 : Colors.GRAY_800;
    if (isTrial) {
      return {
        backgroundColor: lessThanThreeDays
          ? Colors.DANGER_NO_SOLID_HOVER
          : Colors.WARNING_ORANGE,
        className: "t--deprecation-warning banner",
        icon: "warning-line",
        iconColor: color,
        iconSize: IconSize.XXL,
        message: (
          <>
            <StyledText
              color={color}
              dangerouslySetInnerHTML={{
                __html: createMessage(() =>
                  TRIAL_EXPIRY_WARNING(gracePeriod, suffix),
                ),
              }}
              type={TextType.P1}
              weight="600"
            />
            {isAdmin ? (
              <>
                <StyledText
                  as="button"
                  color={color}
                  onClick={goToCustomerPortal}
                  type={TextType.P1}
                  underline
                  weight="600"
                >
                  {capitalize(createMessage(UPGRADE))}
                </StyledText>{" "}
                <StyledText color={color} type={TextType.P1} weight="600">
                  {createMessage(CONTINUE_USING_FEATURES)}
                </StyledText>
              </>
            ) : (
              <StyledText
                color={gracePeriod > 3 ? Colors.GRAY_800 : Colors.RED_500}
                type={TextType.P1}
                weight="600"
              >
                {createMessage(NON_ADMIN_USER_TRIAL_EXPIRTY_WARNING)}
              </StyledText>
            )}
          </>
        ),
      };
    }
  };

  return (
    <Wrapper isFixed={isFixed}>
      {features.USAGE_AND_BILLING &&
        showBanner &&
        isHomePage &&
        getBannerMessage && <StyledBanner {...getBannerMessage()} />}
      <Helmet>
        <title>{`${
          props.displayName ? `${props.displayName} | ` : ""
        }Appsmith`}</title>
      </Helmet>
      <PageBody isSavable={isSavable}>{props.children}</PageBody>
    </Wrapper>
  );
}

export default PageWrapper;
