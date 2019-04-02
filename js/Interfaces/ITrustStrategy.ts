import BinaryTrustResult = require("../Model/BinaryTrustResult");
import { QueryContext } from "../../lib/dtpapi/model/models";

export default interface ITrustStrategy {
    calculateBinaryTrustResult(trustResult: BinaryTrustResult): void
    ProcessResult(queryContext : QueryContext) : void;
}
