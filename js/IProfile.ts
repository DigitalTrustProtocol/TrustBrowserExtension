import DTPIdentity = require("./Model/DTPIdentity");
import ProfileController = require("./ProfileController");
import { jsonIgnoreReplacer, jsonIgnore } from 'json-ignore';

export default interface IProfile {
    userId: string;
    screen_name: string;
    alias: string;
    biggerImage: string;
    owner: DTPIdentity;
    address: any;
    scope: string;
    controller: ProfileController;
}
