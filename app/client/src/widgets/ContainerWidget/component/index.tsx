import React, { ReactNode, useRef, useEffect, RefObject } from "react";
import styled, { css } from "styled-components";
import { pick } from "lodash";
import tinycolor from "tinycolor2";
import { invisible } from "constants/DefaultTheme";
import { Color } from "constants/Colors";
import { generateClassName, getCanvasClassName } from "utils/generators";
import WidgetStyleContainer, {
  WidgetStyleContainerProps,
} from "components/designSystems/appsmith/WidgetStyleContainer";
import { ComponentProps } from "widgets/BaseComponent";
import { MAIN_CONTAINER_WIDGET_ID } from "constants/WidgetConstants";

const scrollContents = css`
  overflow-y: auto;
`;

const StyledContainerComponent = styled.div<
  ContainerComponentProps & {
    ref: RefObject<HTMLDivElement>;
  }
>`
  &.auto-layout {
    container-name: canvas-container;
    container-type: inline-size;
  }
  height: 100%;
  width: 100%;
  background: ${(props) => props.backgroundColor};
  opacity: ${(props) => (props.resizeDisabled ? "0.8" : "1")};
  position: relative;
  ${(props) => (!props.isVisible ? invisible : "")};
  box-shadow: ${(props) =>
    props.selected ? "inset 0px 0px 0px 3px rgba(59,130,246,0.5)" : "none"};
  border-radius: ${({ borderRadius }) => borderRadius};

  ${(props) =>
    props.shouldScrollContents === true
      ? scrollContents
      : props.shouldScrollContents === false
      ? css`
          overflow: hidden;
        `
      : ""}

  &:hover {
    z-index: ${(props) => (props.onClickCapture ? "2" : "1")};
    cursor: ${(props) => (props.onClickCapture ? "pointer" : "inherit")};
    background: ${(props) => {
      return props.onClickCapture && props.backgroundColor
        ? tinycolor(props.backgroundColor)
            .darken(5)
            .toString()
        : props.backgroundColor;
    }};
  }

  .auto-temp-no-display {
    position: absolute;
    left: -9999px;
  }

  .no-display {
    display: none;
  }
`;

function ContainerComponentWrapper(props: ContainerComponentProps) {
  const containerStyle = props.containerStyle || "card";
  const containerRef: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!props.shouldScrollContents) {
      const supportsNativeSmoothScroll =
        "scrollBehavior" in document.documentElement.style;
      if (supportsNativeSmoothScroll) {
        containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }
    }
  }, [props.shouldScrollContents]);

  return (
    <StyledContainerComponent
      {...props}
      // Before you remove: generateClassName is used for bounding the resizables within this canvas
      // getCanvasClassName is used to add a scrollable parent.
      className={`${
        props.shouldScrollContents ? getCanvasClassName() : ""
      } ${generateClassName(props.widgetId)} ${
        props.useAutoLayout && props.widgetId === MAIN_CONTAINER_WIDGET_ID
          ? "auto-layout"
          : ""
      }`}
      containerStyle={containerStyle}
      ref={containerRef}
      tabIndex={props.shouldScrollContents ? undefined : 0}
    >
      {props.children}
    </StyledContainerComponent>
  );
}

function ContainerComponent(props: ContainerComponentProps) {
  return props.widgetId === MAIN_CONTAINER_WIDGET_ID ? (
    <ContainerComponentWrapper {...props} />
  ) : (
    <WidgetStyleContainer
      {...pick(props, [
        "widgetId",
        "containerStyle",
        "backgroundColor",
        "borderColor",
        "borderWidth",
        "borderRadius",
        "boxShadow",
        "direction",
      ])}
    >
      <ContainerComponentWrapper {...props} />
    </WidgetStyleContainer>
  );
}

export type ContainerStyle = "border" | "card" | "rounded-border" | "none";

export interface ContainerComponentProps
  extends ComponentProps,
    WidgetStyleContainerProps {
  children?: ReactNode;
  className?: string;
  backgroundColor?: Color;
  shouldScrollContents?: boolean;
  resizeDisabled?: boolean;
  selected?: boolean;
  focused?: boolean;
  minHeight?: number;
  useAutoLayout?: boolean;
  direction?: string;
  justifyContent?: string;
  alignItems?: string;
}

export default ContainerComponent;
