import React, { useMemo, useRef } from "react";
import styled from "styled-components";
import { Text } from "design-system";
import { useDispatch, useSelector } from "react-redux";
import { debounce } from "lodash";

import Form from "@appsmith/components/InputsForm/Form";
import InputField from "@appsmith/components/InputsForm/Fields/InputField";
import {
  MODULE_INSTANCE_EMPTY_INPUT,
  createMessage,
} from "@appsmith/constants/messages";
import { updateModuleInstance } from "@appsmith/actions/moduleInstanceActions";
import type { Module } from "@appsmith/constants/ModuleConstants";
import type { ModuleInstance } from "@appsmith/constants/ModuleInstanceConstants";
import equal from "fast-deep-equal/es6";
import { klona } from "klona";
import { getModuleInstanceEvalValues } from "@appsmith/selectors/moduleInstanceSelectors";

interface InputsFormProps {
  inputsForm: Module["inputsForm"];
  defaultValues: {
    inputs?: ModuleInstance["inputs"];
  };
  moduleInstanceId: string;
  moduleInstanceName: string;
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--ads-v2-spaces-4);
`;

const InputFieldWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--ads-v2-spaces-3);
`;

const DEBOUNCE_TIMEOUT = 150;

function InputsForm({
  defaultValues,
  inputsForm,
  moduleInstanceId,
  moduleInstanceName,
}: InputsFormProps) {
  const valuesRef = useRef<InputsFormProps["defaultValues"]>(defaultValues);
  const dispatch = useDispatch();
  const formSection = inputsForm[0].children;
  const inputsEvaluatedValues = useSelector((state) =>
    getModuleInstanceEvalValues(state, moduleInstanceName),
  );

  const onUpdateInputsForm = useMemo(() => {
    const onUpdate = (values: InputsFormProps["defaultValues"]) => {
      if (!moduleInstanceId) return;

      if (!equal(valuesRef.current, values)) {
        valuesRef.current = klona(values);

        dispatch(
          updateModuleInstance({
            id: moduleInstanceId,
            moduleInstance: {
              inputs: values.inputs,
            },
          }),
        );
      }
    };

    return debounce(onUpdate, DEBOUNCE_TIMEOUT);
  }, [updateModuleInstance, moduleInstanceId, dispatch]);

  if (!formSection.length) {
    return <Text>{createMessage(MODULE_INSTANCE_EMPTY_INPUT)}</Text>;
  }
  return (
    <Wrapper>
      <Text kind="heading-s">Inputs</Text>
      <Form defaultValues={defaultValues} onUpdateForm={onUpdateInputsForm}>
        <InputFieldWrapper>
          {formSection.map(({ id, label, propertyName }) => {
            return (
              <div key={id}>
                <Text>{label}</Text>
                <InputField
                  dataTreePath={`${moduleInstanceName}.inputs.${label}`}
                  evaluatedValue={inputsEvaluatedValues[label]}
                  name={propertyName}
                />
              </div>
            );
          })}
        </InputFieldWrapper>
      </Form>
    </Wrapper>
  );
}

export default InputsForm;
