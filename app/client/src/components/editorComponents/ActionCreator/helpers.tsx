import React from "react";
import {
  getFuncExpressionAtPosition,
  getFunction,
  replaceActionInQuery,
} from "@shared/ast";
import { setGlobalSearchCategory } from "actions/globalSearchActions";
import { createNewJSCollection } from "actions/jsPaneActions";
import { createModalAction } from "actions/widgetActions";
import { AppState } from "ce/reducers";
import { getEntityNameAndPropertyPath } from "ce/workers/Evaluation/evaluationUtils";
import { ENTITY_TYPE, TreeDropdownOption, Icon } from "design-system-old";
import { PluginType } from "entities/Action";
import { JSAction, Variable } from "entities/JSCollection";
import { isString, keyBy } from "lodash";
import { getActionConfig } from "pages/Editor/Explorer/Actions/helpers";
import {
  JsFileIconV2,
  jsFunctionIcon,
} from "pages/Editor/Explorer/ExplorerIcons";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ActionDataState } from "reducers/entityReducers/actionsReducer";
import { JSCollectionData } from "reducers/entityReducers/jsActionsReducer";
import { getCurrentPageId } from "selectors/editorSelectors";
import {
  getActionsForCurrentPage,
  getJSCollectionsForCurrentPage,
} from "selectors/entitiesSelector";
import {
  getModalDropdownList,
  getNextModalName,
} from "selectors/widgetSelectors";
import { getDynamicBindings } from "utils/DynamicBindingUtils";
import { filterCategories, SEARCH_CATEGORY_ID } from "../GlobalSearch/utils";
import {
  AppsmithFunction,
  AppsmithFunctionsWithFields,
  FieldType,
  NAVIGATE_TO_TAB_OPTIONS,
  NEW_MODAL_LABEL,
} from "./constants";
import { FIELD_GROUP_CONFIG } from "./FieldGroup/FieldGroupConfig";
import {
  DataTreeForActionCreator,
  GenericFunction,
  SelectorField,
  SwitchType,
} from "./types";
import { getCodeFromMoustache } from "./utils";

const actionList: {
  label: string;
  value: string;
  children?: TreeDropdownOption[];
}[] = Object.entries(FIELD_GROUP_CONFIG).map((action) => ({
  label: action[1].label,
  value: action[0],
  children: action[1].children,
  icon: <Icon name={action[1].icon} />,
}));

export function getFieldFromValue(
  value: string,
  activeTabApiAndQueryCallback: SwitchType,
  activeTabNavigateTo: SwitchType,
  getParentValue?: (changeValue: string) => string,
  dataTree?: DataTreeForActionCreator,
  isChainedAction = false,
): SelectorField[] {
  const fields: SelectorField[] = [];

  // No value case - no action has been selected, show the action selector field
  if (!value && isChainedAction) {
    return [
      {
        field: FieldType.ACTION_SELECTOR_FIELD,
        getParentValue,
        value,
      },
    ];
  }

  let entity;

  if (isString(value)) {
    const trimmedVal = value && value.replace(/(^{{)|(}}$)/g, "");
    const entityProps = getEntityNameAndPropertyPath(trimmedVal);
    entity = dataTree && dataTree[entityProps.entityName];
  }

  if (entity && "ENTITY_TYPE" in entity) {
    if (entity.ENTITY_TYPE === ENTITY_TYPE.ACTION) {
      // get fields for API action
      return getActionEntityFields(
        fields,
        getParentValue as (changeValue: string) => string,
        value,
        activeTabNavigateTo,
        activeTabApiAndQueryCallback,
        dataTree as DataTreeForActionCreator,
        isChainedAction,
      );
    }

    if (entity.ENTITY_TYPE === ENTITY_TYPE.JSACTION) {
      // get fields for js action execution
      return getJsFunctionExecutionFields(
        fields,
        getParentValue as (changeValue: string) => string,
        value,
        entity,
        isChainedAction,
      );
    }
  }

  getFieldsForSelectedAction(
    fields,
    getParentValue as (changeValue: string) => string,
    value,
    activeTabNavigateTo,
    isChainedAction,
  );

  return fields;
}

function replaceAction(value: string, changeValue: string, argNum: number) {
  // if no action("") then send empty arrow expression
  // else replace with arrow expression and action selected
  const changeValueWithoutBrackets = getDynamicBindings(changeValue)
    .jsSnippets[0];
  const reqChangeValue =
    changeValue === "" ? `() => {}` : `() => { ${changeValueWithoutBrackets} }`;
  return `{{${replaceActionInQuery(
    value,
    reqChangeValue,
    argNum,
    self.evaluationVersion,
  )}}}`;
}

function getActionEntityFields(
  fields: any[],
  getParentValue: (changeValue: string) => string,
  value: string,
  activeTabNavigateTo: SwitchType,
  activeTabApiAndQueryCallback: SwitchType,
  dataTree: DataTreeForActionCreator,
  isChainedAction = false,
) {
  // requiredValue is value minus the surrounding {{ }}
  // eg: if value is {{download()}}, requiredValue = download()
  const requiredValue = getCodeFromMoustache(value);
  const successFunction = getFuncExpressionAtPosition(
    requiredValue,
    0,
    self.evaluationVersion,
  );
  const successValue = getFunction(successFunction, self.evaluationVersion);

  const errorFunction = getFuncExpressionAtPosition(
    requiredValue,
    1,
    self.evaluationVersion,
  );
  const errorValue = getFunction(errorFunction, self.evaluationVersion);
  if (isChainedAction) {
    fields.push({
      field: FieldType.ACTION_SELECTOR_FIELD,
      getParentValue,
      value,
    });
    fields.push({
      field: FieldType.API_AND_QUERY_SUCCESS_FAILURE_TAB_FIELD,
      getParentValue,
      value,
    });
    fields.push({
      field: FieldType.CALLBACK_FUNCTION_API_AND_QUERY,
      getParentValue,
      value:
        activeTabApiAndQueryCallback.id === "onSuccess"
          ? successValue
          : errorValue,
    });
  }

  // requiredValue is value minus the surrounding {{ }}
  // eg: if value is {{download()}}, requiredValue = download()

  // get the fields for onSuccess
  // const successFields = getFieldFromValue(
  //   successValue,
  //   activeTabNavigateTo,
  //   activeTabApiAndQueryCallback,
  //   (changeValue: string) => replaceAction(requiredValue, changeValue, 0),
  //   dataTree,
  //   true,
  // );
  // successFields[0].label = "Action";

  // // get the fields for onError
  // const errorFields = getFieldFromValue(
  //   errorValue,
  //   activeTabNavigateTo,
  //   activeTabApiAndQueryCallback,
  //   (changeValue: string) => replaceAction(requiredValue, changeValue, 1),
  //   dataTree,
  //   true,
  // );
  // errorFields[0].label = "Action";

  // if (activeTabApiAndQueryCallback.id === "onSuccess") {
  //   console.log("Ac***", { successFields, errorFields });
  //   fields.push(successFields);
  // } else {
  //   console.log("Ac***", { successFields, errorFields });
  //   fields.push(errorFields);
  // }

  return fields;
}

function getJsFunctionExecutionFields(
  fields: any[],
  getParentValue: (changeValue: string) => string,
  value: string,
  entity: any,
  isChainedAction = false,
) {
  // const matches = [...value.matchAll(ACTION_TRIGGER_REGEX)];
  // if (matches.length === 0) {
  // when format doesn't match, it is function from js object
  // fields.push({
  //   field: FieldType.ACTION_SELECTOR_FIELD,
  //   getParentValue,
  //   value,
  //   args: [],
  // });
  // } else if (matches.length) {
  // const entityPropertyPath = matches[0][1];
  const { propertyPath } = getEntityNameAndPropertyPath(value);
  const path = propertyPath && propertyPath.replace("();", "");
  const argsProps =
    path && entity.meta && entity.meta[path] && entity.meta[path].arguments;
  if (isChainedAction) {
    fields.push({
      field: FieldType.ACTION_SELECTOR_FIELD,
      getParentValue,
      value,
      args: argsProps ? argsProps : [],
    });
  }

  if (argsProps && argsProps.length > 0) {
    for (const index of argsProps) {
      fields.push({
        field: FieldType.ARGUMENT_KEY_VALUE_FIELD,
        getParentValue,
        value,
        label: argsProps[index] && argsProps[index].name,
        index: index,
      });
    }
  }
  // }
  return fields;
}

function getFieldsForSelectedAction(
  fields: any[],
  getParentValue: (changeValue: string) => string,
  value: string,
  activeTabNavigateTo: SwitchType,
  isChainedAction = false,
) {
  /*
   * if an action is present, push actions selector field
   * then push all fields specific to the action selected
   */
  if (isChainedAction) {
    fields.push({
      field: FieldType.ACTION_SELECTOR_FIELD,
      getParentValue,
      value,
    });
  }

  /**
   *  We need to find out if there are more than one function in the value
   *  If yes, we need to find out the first position position-wise
   *  this is done to get rid of other functions fields being shown in the selector
   *  See - https://github.com/appsmithorg/appsmith/issues/15895
   **/
  const matches = AppsmithFunctionsWithFields.filter((func) =>
    value.includes(func),
  );

  const functionMatchesWithPositions: Array<{
    position: number;
    func: string;
  }> = [];
  matches.forEach((match) => {
    functionMatchesWithPositions.push({
      position: value.indexOf(match),
      func: match,
    });
  });
  functionMatchesWithPositions.sort((a, b) => a.position - b.position);

  const functionMatch =
    functionMatchesWithPositions.length && functionMatchesWithPositions[0].func;

  if (functionMatch && functionMatch.length > 0) {
    for (const field of FIELD_GROUP_CONFIG[functionMatch].fields) {
      fields.push({
        field: field,
      });
    }

    /**
     * The second field for navigateTo is dependent on activeTabNavigateTo value
     * if PAGE_NAME then this field will be PAGE_SELECTOR_FIELD (default)
     * if URL then this field will be URL_FIELD
     **/
    if (
      functionMatch === "navigateTo" &&
      activeTabNavigateTo.id === NAVIGATE_TO_TAB_OPTIONS.URL
    ) {
      fields[isChainedAction ? 2 : 1] = {
        field: FieldType.URL_FIELD,
      };
    }

    return fields;
  }
}

export function useModalDropdownList() {
  const dispatch = useDispatch();
  const nextModalName = useSelector(getNextModalName);

  let finalList: TreeDropdownOption[] = [
    {
      label: NEW_MODAL_LABEL,
      value: "Modal",
      id: "create",
      icon: "plus",
      className: "t--create-modal-btn",
      onSelect: (option: TreeDropdownOption, setter?: GenericFunction) => {
        const modalName = nextModalName;
        if (setter) {
          setter({
            value: `${modalName}`,
          });
          dispatch(createModalAction(modalName));
        }
      },
    },
  ];

  finalList = finalList.concat(
    (useSelector(getModalDropdownList) || []) as TreeDropdownOption[],
  );

  return finalList;
}

function getApiQueriesAndJsActionOptionsWithChildren(
  pageId: string,
  plugins: any,
  actions: ActionDataState,
  jsActions: Array<JSCollectionData>,
  dispatch: any,
  handleClose: () => void,
) {
  // this function gets a list of all the queries/apis and attaches it to actionList
  getApiAndQueryOptions(plugins, actions, dispatch, handleClose);

  // this function gets a list of all the JS objects and attaches it to actionList
  getJSOptions(pageId, jsActions, dispatch);

  return actionList;
}

function getApiAndQueryOptions(
  plugins: any,
  actions: ActionDataState,
  dispatch: any,
  handleClose: () => void,
) {
  const createQueryObject: TreeDropdownOption = {
    label: "New Query",
    value: "datasources",
    id: "create",
    icon: "plus",
    className: "t--create-datasources-query-btn",
    onSelect: () => {
      handleClose();
      dispatch(
        setGlobalSearchCategory(
          filterCategories[SEARCH_CATEGORY_ID.ACTION_OPERATION],
        ),
      );
    },
  };

  const queries = actions.filter(
    (action) => action.config.pluginType === PluginType.DB,
  );

  const apis = actions.filter(
    (action) =>
      action.config.pluginType === PluginType.API ||
      action.config.pluginType === PluginType.SAAS ||
      action.config.pluginType === PluginType.REMOTE,
  );

  const queryOptions = actionList.find(
    (action) => action.value === AppsmithFunction.integration,
  );

  const apiOptions = actionList.find(
    (action) => action.value === AppsmithFunction.runAPI,
  );

  if (apiOptions) {
    apiOptions.children = [{ ...createQueryObject, label: "New API" }];

    apis.forEach((api) => {
      (apiOptions.children as TreeDropdownOption[]).push({
        label: api.config.name,
        id: api.config.id,
        value: api.config.name,
        type: apiOptions.value,
        icon: getActionConfig(api.config.pluginType)?.getIcon(
          api.config,
          plugins[(api as any).config.datasource.pluginId],
          api.config.pluginType === PluginType.API,
        ),
      } as TreeDropdownOption);
    });
  }

  if (queryOptions) {
    queryOptions.children = [createQueryObject];

    queries.forEach((query) => {
      (queryOptions.children as TreeDropdownOption[]).push({
        label: query.config.name,
        id: query.config.id,
        value: query.config.name,
        type: queryOptions.value,
        icon: getActionConfig(query.config.pluginType)?.getIcon(
          query.config,
          plugins[(query as any).config.datasource.pluginId],
        ),
      } as TreeDropdownOption);
    });
  }
}

export function getJSOptions(
  pageId: string,
  jsActions: Array<JSCollectionData>,
  dispatch: any,
) {
  const createJSObject: TreeDropdownOption = {
    label: "New JS Object",
    value: AppsmithFunction.jsFunction,
    id: "create",
    icon: "plus",
    className: "t--create-js-object-btn",
    onSelect: () => {
      dispatch(createNewJSCollection(pageId, "ACTION_SELECTOR"));
    },
  };

  const jsOption = actionList.find(
    (action) => action.value === AppsmithFunction.jsFunction,
  );

  if (jsOption) {
    jsOption.children = [createJSObject];

    jsActions.forEach((jsAction) => {
      if (jsAction.config.actions && jsAction.config.actions.length > 0) {
        const jsObject = ({
          label: jsAction.config.name,
          id: jsAction.config.id,
          value: jsAction.config.name,
          type: jsOption.value,
          icon: JsFileIconV2,
        } as unknown) as TreeDropdownOption;

        ((jsOption.children as unknown) as TreeDropdownOption[]).push(jsObject);

        if (jsObject) {
          //don't remove this will be used soon
          // const createJSFunction: TreeDropdownOption = {
          //   label: "Create New JS Function",
          //   value: "JSFunction",
          //   id: "create",
          //   icon: "plus",
          //   className: "t--create-js-function-btn",
          //   onSelect: () => {
          //     history.push(
          //       JS_COLLECTION_ID_URL(applicationId, pageId, jsAction.config.id),
          //     );
          //   },
          // };
          jsObject.children = [];

          jsAction.config.actions.forEach((js: JSAction) => {
            const jsArguments = js.actionConfiguration.jsArguments;
            const argValue: Array<any> = [];

            if (jsArguments && jsArguments.length) {
              jsArguments.forEach((arg: Variable) => {
                argValue.push(arg.value);
              });
            }

            const jsFunction = {
              label: js.name,
              id: js.id,
              value: jsAction.config.name + "." + js.name,
              type: jsOption.value,
              icon: jsFunctionIcon,
              args: argValue,
            };

            (jsObject.children as TreeDropdownOption[]).push(
              (jsFunction as unknown) as TreeDropdownOption,
            );
          });
        }
      }
    });
  }
}

export function useApisQueriesAndJsActionOptions(handleClose: () => void) {
  const pageId = useSelector(getCurrentPageId) || "";
  const dispatch = useDispatch();
  const plugins = useSelector((state: AppState) => {
    return state.entities.plugins.list;
  });
  const pluginGroups: any = useMemo(() => keyBy(plugins, "id"), [plugins]);
  const actions = useSelector(getActionsForCurrentPage);
  const jsActions = useSelector(getJSCollectionsForCurrentPage);

  // this function gets all the Queries/API's/JS objects and attaches it to actionList
  return getApiQueriesAndJsActionOptionsWithChildren(
    pageId,
    pluginGroups,
    actions,
    jsActions,
    dispatch,
    handleClose,
  );
}
