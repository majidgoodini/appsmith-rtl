import { isEqual } from "lodash";
import { JSLibraries, resetJSLibraries } from "workers/common/JSLibrary";

export function updateJSLibraryGlobals(data: any) {
  const { add, libs } = data;
  if (add) {
    JSLibraries.push(...libs);
  } else if (add === false) {
    for (const lib of libs) {
      const idx = JSLibraries.findIndex((l) =>
        isEqual(l.accessor.sort(), lib.accessor.sort()),
      );
      if (idx === -1) return;
      JSLibraries.splice(idx, 1);
    }
  } else {
    resetJSLibraries();
    JSLibraries.push(...libs);
  }
  return true;
}
