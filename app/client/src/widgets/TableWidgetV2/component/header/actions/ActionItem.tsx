import React, { useCallback } from "react";
import { IconWrapper } from "constants/IconConstants";
import { Colors } from "constants/Colors";
import styled from "styled-components";
import Tooltip from "components/editorComponents/Tooltip";
import { TooltipContentWrapper } from "../../TableStyledWrappers";
import { importSvg } from "design-system-old";

const FilterIcon = importSvg(
  () => import("assets/icons/control/filter-icon.svg"),
);
const DownloadIcon = importSvg(
  () => import("assets/icons/control/download-data-icon.svg"),
);
const AddIcon = importSvg(() => import("assets/icons/control/add.svg"));

export const TableIconWrapper = styled.div<{
  selected?: boolean;
  disabled?: boolean;
  titleColor?: string;
  borderRadius?: string;
}>`
  height: calc(100% - 12px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wds-color-bg);
  border-radius: ${(props) => props.borderRadius || "0"};
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
  cursor: ${(props) => !props.disabled && "pointer"};
  color: ${(props) => (props.selected ? Colors.CODE_GRAY : Colors.GRAY)};
  position: relative;
  margin-left: 8px;
  padding: 0 6px;
  ${(props) =>
    !props.disabled &&
    `&:hover {
    background: var(--wds-color-bg-hover);
  }`}

  span {
    font-size: 13px;
  }

  .action-title {
    margin-left: 4px;
    white-space: nowrap;
    color: ${(props) => props.titleColor || Colors.GRAY};
    margin-top: 2px;
  }
`;

interface ActionItemProps {
  selected?: boolean;
  selectMenu: (selected: boolean) => void;
  className: string;
  icon: string;
  title: string;
  titleColor?: string;
  width?: number;
  borderRadius?: string;
  disabled?: boolean;
  disabledMessage?: string;
}

function ActionItem(props: ActionItemProps) {
  const handleIconClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!props.disabled) {
        props.selectMenu(!props.selected);
        e.stopPropagation();
      }
    },
    [props.selected, props.disabled],
  );

  const getIcon = () => {
    switch (props.icon) {
      case "download":
        return <DownloadIcon />;
      case "filter":
        return <FilterIcon />;
      case "add":
        return <AddIcon />;
    }
  };

  const item = (
    <TableIconWrapper
      borderRadius={props.borderRadius}
      className={`${props.className} ${props.disabled && "disabled"}`}
      disabled={props.disabled}
      onClick={handleIconClick}
      selected={props.selected}
      titleColor={props.titleColor}
    >
      <IconWrapper
        color={props.titleColor ? props.titleColor : Colors.GRAY}
        height={20}
        width={props.width || 20}
      >
        {getIcon()}
      </IconWrapper>
      <span className="action-title">{props.title}</span>
    </TableIconWrapper>
  );

  if (props.disabled && props.disabledMessage) {
    return (
      <Tooltip
        autoFocus={false}
        content={
          <TooltipContentWrapper>{props.disabledMessage}</TooltipContentWrapper>
        }
        hoverOpenDelay={200}
        position="auto"
      >
        {item}
      </Tooltip>
    );
  } else {
    return item;
  }
}

export default ActionItem;
