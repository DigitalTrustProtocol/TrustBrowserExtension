import DTPIdentity = require("./Model/DTPIdentity");
import ProfileController = require("./ProfileController");
import { jsonIgnoreReplacer, jsonIgnore } from 'json-ignore';

export default interface IProfile {
    userId: string;
    screen_name: string;
    alias: string;
    address: any;
    biggerImage: string;
    owner: DTPIdentity;
    @jsonIgnore() public address: any;
    @jsonIgnore() public scope: string;
    @jsonIgnore() public controller: ProfileController;
}
