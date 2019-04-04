import BinaryTrustResult = require("../Model/BinaryTrustResult");
import { QueryContext } from "../../lib/dtpapi/model/models";
import IProfile from "../IProfile";

export default interface ITrustStrategy {
    calculateBinaryTrustResult(trustResult: BinaryTrustResult): void
    ProcessResult(queryContext : QueryContext, profiles: Array<IProfile>) : JQueryPromise<{}>;
}
