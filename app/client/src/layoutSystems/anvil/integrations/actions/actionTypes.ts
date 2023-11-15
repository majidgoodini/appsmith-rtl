export interface AnvilReduxAction<T> {
  type: AnvilReduxActionTypes;
  payload: T;
}

export enum AnvilReduxActionTypes {
  READ_LAYOUT_ELEMENT_POSITIONS = "READ_LAYOUT_ELEMENT_POSITIONS",
  UPDATE_LAYOUT_ELEMENT_POSITIONS = "UPDATE_LAYOUT_ELEMENT_POSITIONS",
  REMOVE_LAYOUT_ELEMENT_POSITIONS = "REMOVE_LAYOUT_ELEMENT_POSITIONS",
  ANVIL_ADD_NEW_WIDGET = "ANVIL_ADD_NEW_WIDGET",
  ANVIL_MOVE_WIDGET = "ANVIL_MOVE_WIDGET",
  ANVIL_ADD_SUGGESTED_WIDGET = "ANVIL_ADD_SUGGESTED_WIDGET",
  ANVIL_SECTION_ZONES_UPDATE = "ANVIL_SECTION_ZONES_UPDATE",
}
