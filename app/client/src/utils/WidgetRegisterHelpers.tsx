import React from "react";
import store from "store";
import type BaseWidget from "widgets/BaseWidget";
import WidgetFactory, { NonSerialisableWidgetConfigs } from "./WidgetFactory";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import type { WidgetConfiguration } from "widgets/constants";
import { generateReactKey } from "./generators";
import type { RegisteredWidgetFeatures } from "./WidgetFeatures";
import {
  WidgetFeaturePropertyEnhancements,
  WidgetFeatureProps,
} from "./WidgetFeatures";
import { withBaseWidgetHOC } from "widgets/BaseWidgetHOC/withBaseWidgetHOC";

export const registerWidget = (
  Widget: typeof BaseWidget,
  config: WidgetConfiguration,
) => {
  const EnhancedWidget = withBaseWidgetHOC(
    Widget,
    !!config.needsMeta,
    !!config.eagerRender,
  );

  WidgetFactory.registerWidgetBuilder(
    config.type,
    {
      buildWidget(widgetData: any): JSX.Element {
        return <EnhancedWidget {...widgetData} key={widgetData.widgetId} />;
      },
    },
    config.properties.derived,
    config.properties.default,
    config.properties.meta,
    config.properties.config,
    config.properties.contentConfig,
    config.properties.styleConfig,
    config.features,
    config.properties.loadingProperties,
    config.properties.stylesheetConfig,
    config.properties.autocompleteDefinitions,
    config.autoLayout,
    config.properties.setterConfig,
  );

  configureWidget(config);
};

export const configureWidget = (config: WidgetConfiguration) => {
  let features: Record<string, unknown> = {};

  if (config.features) {
    Object.keys(config.features).forEach((registeredFeature: string) => {
      features = Object.assign(
        {},
        WidgetFeatureProps[registeredFeature as RegisteredWidgetFeatures],
        WidgetFeaturePropertyEnhancements[
          registeredFeature as RegisteredWidgetFeatures
        ](config),
      );
    });
  }

  const _config = {
    ...config.defaults,
    ...features,
    searchTags: config.searchTags,
    tags: config.tags,
    type: config.type,
    hideCard: !!config.hideCard || !config.iconSVG,
    isDeprecated: !!config.isDeprecated,
    replacement: config.replacement,
    displayName: config.name,
    key: generateReactKey(),
    iconSVG: config.iconSVG,
    isCanvas: config.isCanvas,
    canvasHeightOffset: config.canvasHeightOffset,
    needsHeightForContent: config.needsHeightForContent,
  };

  const nonSerialisableWidgetConfigs: Record<string, unknown> = {};

  Object.values(NonSerialisableWidgetConfigs).forEach((entry) => {
    if (_config[entry] !== undefined) {
      nonSerialisableWidgetConfigs[entry] = _config[entry];
    }
    delete _config[entry];
  });

  WidgetFactory.storeNonSerialisablewidgetConfig(
    config.type,
    nonSerialisableWidgetConfigs,
  );

  WidgetFactory.storeWidgetConfig(config.type, _config);

  if (config.methods) {
    WidgetFactory.setWidgetMethods(config.type, config.methods);
  }

  store.dispatch({
    type: ReduxActionTypes.ADD_WIDGET_CONFIG,
    payload: _config,
  });
};