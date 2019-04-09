import DTPIdentity = require("./Model/DTPIdentity");
import ProfileController = require("./ProfileController");
import { jsonIgnoreReplacer, jsonIgnore } from 'json-ignore';
import BinaryTrustResult = require("./Model/BinaryTrustResult");
import { ProfileStateEnum } from "./Model/ProfileStateEnum";

export default interface IProfile {
    userId: string;
    screen_name: string;
    alias?: string;
    avatarImage?: string;
    owner?: DTPIdentity;
    //address?: any;

    scope: string;
    controller: ProfileController;
    formAuthenticityToken: string;
    binaryTrustResult : BinaryTrustResult;
    identiconData16: string;
    state: ProfileStateEnum; 

    update(source: any) : void;
}
