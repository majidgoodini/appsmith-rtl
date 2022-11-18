import { ApiResponse } from "api/ApiResponses";
import LibraryApi from "api/LibraryAPI";
import { createMessage, customJSLibraryMessages } from "ce/constants/messages";
import {
  ReduxAction,
  ReduxActionErrorTypes,
  ReduxActionTypes,
} from "ce/constants/ReduxActionConstants";
import { Toaster, Variant } from "design-system";
import {
  actionChannel,
  ActionPattern,
  all,
  call,
  put,
  select,
  take,
  takeEvery,
  takeLatest,
} from "redux-saga/effects";
import { getCurrentApplicationId } from "selectors/editorSelectors";
import TernServer from "utils/autocomplete/TernServer";
import { EVAL_WORKER_ACTIONS, TJSLibrary } from "utils/DynamicBindingUtils";
import { validateResponse } from "./ErrorSagas";
import { EvalWorker } from "./EvaluationsSaga";

export function* installLibrarySaga(lib: Partial<TJSLibrary>) {
  const { url } = lib;
  const { accessor, defs, success } = yield call(
    EvalWorker.request,
    EVAL_WORKER_ACTIONS.INSTALL_LIBRARY,
    url,
  );

  if (!success) {
    yield put({
      type: ReduxActionErrorTypes.INSTALL_LIBRARY_FAILED,
      payload: url,
    });
    Toaster.show({
      text: createMessage(customJSLibraryMessages.INSTALLATION_FAILED),
      variant: Variant.danger,
    });
    return;
  }

  const name: string = lib.name || accessor[accessor.length - 1];
  const applicationId: string = yield select(getCurrentApplicationId);

  const versionMatch = (url as string).match(/(?<=@)(\d+\.)(\d+\.)(\d+)/);
  const [version] = versionMatch ? versionMatch : [];

  const response: ApiResponse = yield call(
    LibraryApi.addLibrary,
    applicationId,
    {
      name,
      version,
      accessor,
      defs,
      url,
    },
  );

  try {
    const isValidResponse: boolean = yield validateResponse(response, false);
    if (!isValidResponse) {
      yield put({
        type: ReduxActionErrorTypes.INSTALL_LIBRARY_FAILED,
        payload: url,
      });
      Toaster.show({
        text: createMessage(customJSLibraryMessages.INSTALLATION_FAILED),
        variant: Variant.danger,
      });
      return;
    }
  } catch (e) {
    yield put({
      type: ReduxActionErrorTypes.INSTALL_LIBRARY_FAILED,
      payload: url,
    });
    Toaster.show({
      text: createMessage(customJSLibraryMessages.INSTALLATION_FAILED),
      variant: Variant.danger,
    });
    return;
  }

  TernServer.updateDef(defs["!name"], defs);

  yield put({
    type: ReduxActionTypes.UPDATE_LINT_GLOBALS,
    payload: {
      libs: [
        {
          name,
          version,
          url,
          accessor,
        },
      ],
      add: true,
    },
  });

  yield put({
    type: ReduxActionTypes.INSTALL_LIBRARY_SUCCESS,
    payload: {
      url,
      accessor,
      version,
      name,
    },
  });
  Toaster.show({
    text: createMessage(
      customJSLibraryMessages.INSTALLATION_SUCCESSFUL,
      accessor[accessor.length - 1],
    ),
    variant: Variant.success,
  });
}

function* uninstallLibrarySaga(action: ReduxAction<TJSLibrary>) {
  const { accessor, name } = action.payload;
  const applicationId: string = yield select(getCurrentApplicationId);

  try {
    const response: ApiResponse = yield call(
      LibraryApi.removeLibrary,
      applicationId,
      action.payload,
    );

    const isValidResponse: boolean = yield validateResponse(response);

    if (!isValidResponse) {
      yield put({
        type: ReduxActionErrorTypes.UNINSTALL_LIBRARY_FAILED,
        payload: accessor,
      });
      return;
    }

    yield put({
      type: ReduxActionTypes.UPDATE_LINT_GLOBALS,
      payload: {
        libs: [action.payload],
        add: false,
      },
    });

    const success: boolean = yield call(
      EvalWorker.request,
      EVAL_WORKER_ACTIONS.UNINSTALL_LIBRARY,
      accessor,
    );
    if (!success) {
      Toaster.show({
        text: createMessage(customJSLibraryMessages.UNINSTALL_FAILED, name),
        variant: Variant.danger,
      });
    }

    yield put({
      type: ReduxActionTypes.UNINSTALL_LIBRARY_SUCCESS,
      payload: action.payload,
    });

    Toaster.show({
      text: createMessage(customJSLibraryMessages.UNINSTALL_SUCCESS, name),
      variant: Variant.success,
    });
  } catch (e) {
    Toaster.show({
      text: createMessage(customJSLibraryMessages.UNINSTALL_FAILED, name),
      variant: Variant.danger,
    });
  }
}

function* fetchJSLibraries(action: ReduxAction<string>) {
  const applicationId: string = action.payload;

  try {
    const response: ApiResponse = yield call(
      LibraryApi.getLibraries,
      applicationId,
    );
    const isValidResponse: boolean = yield validateResponse(response);
    if (!isValidResponse) return;

    const libraries = response.data as Array<
      TJSLibrary & { defs: Record<string, any> }
    >;

    const success: boolean = yield call(
      EvalWorker.request,
      EVAL_WORKER_ACTIONS.LOAD_LIBRARIES,
      libraries.map((lib) => ({
        name: lib.name,
        version: lib.version,
        url: lib.url,
        accessor: lib.accessor,
      })),
    );

    if (!success) {
      yield put({
        type: ReduxActionErrorTypes.FETCH_JS_LIBRARIES_FAILED,
      });
      return;
    }

    yield put({
      type: ReduxActionTypes.UPDATE_LINT_GLOBALS,
      payload: {
        libs: libraries,
        add: true,
      },
    });

    yield put({
      type: ReduxActionTypes.FETCH_JS_LIBRARIES_SUCCESS,
      payload: libraries.map((lib) => ({
        name: lib.name,
        accessor: lib.accessor,
        version: lib.version,
        url: lib.url,
        docsURL: lib.docsURL,
      })),
    });

    for (const lib of libraries) {
      TernServer.updateDef(lib.defs["!name"], lib.defs);
    }
  } catch (e) {
    yield put({
      type: ReduxActionErrorTypes.FETCH_JS_LIBRARIES_FAILED,
    });
  }
}

function* startInstallationRequestChannel() {
  const queueInstallChannel: ActionPattern<any> = yield actionChannel([
    ReduxActionTypes.INSTALL_LIBRARY_INIT,
  ]);
  while (true) {
    const action: ReduxAction<Partial<TJSLibrary>> = yield take(
      queueInstallChannel,
    );
    yield put({
      type: ReduxActionTypes.INSTALL_LIBRARY_START,
      payload: action.payload.url,
    });
    yield call(installLibrarySaga, action.payload);
  }
}

export default function*() {
  yield all([
    takeEvery(ReduxActionTypes.UNINSTALL_LIBRARY_INIT, uninstallLibrarySaga),
    takeLatest(ReduxActionTypes.FETCH_JS_LIBRARIES_INIT, fetchJSLibraries),
    call(startInstallationRequestChannel),
  ]);
}
