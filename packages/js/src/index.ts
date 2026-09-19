import { Commands } from "@templatic/core";
import { SINGLE_PACKAGE } from "./commands/singlepackage/index.js";

Commands.begin("@templatic/js", {
  "single-package": SINGLE_PACKAGE,
});
