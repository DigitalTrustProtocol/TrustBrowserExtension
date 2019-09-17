import BinaryTrustResult = require("../Model/BinaryTrustResult");
import { QueryContext, Claim } from "../../lib/dtpapi/model/models";
import IProfile from "../IProfile";

export default interface ITrustStrategy {
    //calculateBinaryTrustResult(queryContext:DtpGraphCoreModelQueryContext,trustResult: BinaryTrustResult): void;
    ProcessClaims(claims : Array<Claim>) : object;
}
