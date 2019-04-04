import BinaryTrustResult = require("../Model/BinaryTrustResult");
import { QueryContext } from "../../lib/dtpapi/model/models";
import IProfile from "../IProfile";
import ProfileController = require("../ProfileController");

export default interface ITrustStrategy {
    calculateBinaryTrustResult(trustResult: BinaryTrustResult): void
    ProcessResult(queryContext : QueryContext, controllers: Array<ProfileController>) : void;
}
