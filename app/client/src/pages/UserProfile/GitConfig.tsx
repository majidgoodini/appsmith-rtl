import React, { useEffect, useState } from "react";
import {
  Wrapper,
  FieldWrapper,
  LabelWrapper,
  Loader,
} from "./StyledComponents";
import {
  createMessage,
  AUTHOR_EMAIL,
  AUTHOR_NAME,
  SUBMIT,
} from "@appsmith/constants/messages";
import { Classes } from "@blueprintjs/core";
import {
  notEmptyValidator,
  Text,
  TextInput,
  TextType,
  emailValidator,
} from "design-system-old";
import { Button, toast } from "design-system";
import { useDispatch, useSelector } from "react-redux";
import {
  getGlobalGitConfig,
  getIsFetchingGlobalGitConfig,
} from "selectors/gitSyncSelectors";
import {
  fetchGlobalGitConfigInit,
  updateGlobalGitConfigInit,
} from "actions/gitSyncActions";

export default function GitConfig() {
  const dispatch = useDispatch();
  const globalGitConfig = useSelector(getGlobalGitConfig);

  const [areFormValuesUpdated, setAreFormValuesUpdated] = useState(false);

  const [authorName, setAuthorNameInState] = useState(
    globalGitConfig.authorName,
  );
  const [authorEmail, setAuthorEmailInState] = useState(
    globalGitConfig.authorEmail,
  );

  const setAuthorName = (value: string) => {
    setAuthorNameInState(value);
    if (authorName) setAreFormValuesUpdated(true);
  };

  const setAuthorEmail = (value: string) => {
    setAuthorEmailInState(value);
    if (authorEmail) setAreFormValuesUpdated(true);
  };

  const isFetching = useSelector(getIsFetchingGlobalGitConfig);
  const isSubmitDisabled = !authorName || !authorEmail || !areFormValuesUpdated;

  useEffect(() => {
    setAreFormValuesUpdated(false);
    setAuthorNameInState(globalGitConfig.authorName);
    setAuthorEmailInState(globalGitConfig.authorEmail);
  }, [globalGitConfig]);

  const updateConfig = () => {
    if (authorName && authorEmail && emailValidator(authorEmail).isValid) {
      setAreFormValuesUpdated(false);
      dispatch(updateGlobalGitConfigInit({ authorName, authorEmail }));
    } else {
      toast.show("Please enter valid user details");
    }
  };

  useEffect(() => {
    // onMount Fetch Global config
    dispatch(fetchGlobalGitConfigInit());
  }, []);

  return (
    <Wrapper>
      <FieldWrapper>
        <LabelWrapper>
          <Text type={TextType.H4}>{createMessage(AUTHOR_NAME)}</Text>
        </LabelWrapper>
        {isFetching && <Loader className={Classes.SKELETON} />}
        {!isFetching && (
          <div style={{ flex: 1 }}>
            <TextInput
              cypressSelector="t--git-author-name"
              defaultValue={authorName}
              fill={false}
              onChange={setAuthorName}
              placeholder={createMessage(AUTHOR_NAME)}
              validator={notEmptyValidator}
            />
          </div>
        )}
      </FieldWrapper>
      <FieldWrapper>
        <LabelWrapper>
          <Text type={TextType.H4}>{createMessage(AUTHOR_EMAIL)}</Text>
        </LabelWrapper>
        {isFetching && <Loader className={Classes.SKELETON} />}
        {!isFetching && (
          <div style={{ flex: 1 }}>
            <TextInput
              cypressSelector="t--git-author-email"
              defaultValue={authorEmail}
              fill={false}
              onChange={setAuthorEmail}
              placeholder={createMessage(AUTHOR_EMAIL)}
              validator={emailValidator}
            />
          </div>
        )}
      </FieldWrapper>
      <FieldWrapper>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <Button
            isDisabled={isSubmitDisabled}
            isLoading={isFetching}
            onClick={updateConfig}
            size="md"
          >
            {createMessage(SUBMIT)}
          </Button>
        </div>
      </FieldWrapper>
    </Wrapper>
  );
}
