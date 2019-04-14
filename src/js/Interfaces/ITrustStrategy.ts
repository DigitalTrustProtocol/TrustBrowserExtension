import BinaryTrustResult = require("../Model/BinaryTrustResult");
import { QueryContext, Claim } from "../../lib/dtpapi/model/models";
import IProfile from "../IProfile";
import ProfileController = require("../ProfileController");

export default interface ITrustStrategy {
    calculateBinaryTrustResult(trustResult: BinaryTrustResult): void;
    ProcessClaims(claims : Array<Claim>) : object;
    ProcessResult(queryContext : QueryContext, controllers: Array<ProfileController>) : void;
}
