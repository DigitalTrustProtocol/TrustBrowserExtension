import DTPIdentity = require("./Model/DTPIdentity");
import ProfileController = require("./ProfileController");
import { jsonIgnoreReplacer, jsonIgnore } from 'json-ignore';
import BinaryTrustResult = require("./Model/BinaryTrustResult");

export default interface IProfile {
    userId: string;
    screen_name: string;
    alias: string;
    biggerImage?: string;
    owner?: DTPIdentity;

    //address?: any;

    scope: string;
    controller: ProfileController;
    formAuthenticityToken: string;
    binaryTrustResult : BinaryTrustResult;
    identiconData16: string;

    update(source: any) : void;
}
