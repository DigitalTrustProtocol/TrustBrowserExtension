import DTPIdentity = require("./Model/DTPIdentity");
import ProfileController = require("./ProfileController");
import { jsonIgnoreReplacer, jsonIgnore } from 'json-ignore';
import BinaryTrustResult = require("./Model/BinaryTrustResult");
import { ProfileStateEnum } from "./Model/ProfileStateEnum";
import { QueryContext } from "../lib/dtpapi/model/models";

export default interface IProfile {
    userId: string;
    screen_name: string;
    alias?: string;
    aliasProof: string;
    avatarImage?: string;
    owner?: DTPIdentity;
    //address?: any;

    scope: string;
    controller: ProfileController;
    formAuthenticityToken: string;
    trustResult : BinaryTrustResult;
    queryResult : QueryContext; 
    identiconData16: string;
    state: ProfileStateEnum; 


    update(source: IProfile) : boolean;
    updateProperty(name: string, value: any, defaultValue?: any) : void;
}
