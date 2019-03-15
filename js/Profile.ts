import DTPIdentity = require("./Model/DTPIdentity");
import Crypto = require("./Crypto");
import ProfileController = require("./ProfileController");
import IProfile from "./IProfile";
import { jsonIgnoreReplacer, jsonIgnore } from 'json-ignore';

class Profile implements IProfile {
    static Current = null;

    public screen_name: string;
    public alias: string;
    public owner: DTPIdentity;
    public userId: string;
    public biggerImage: string;

    @jsonIgnore() public address: any;
    @jsonIgnore() public scope: string;
    @jsonIgnore() public controller: ProfileController;

    constructor(source: IProfile) { 
        Object.defineProperty(this, 'address', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'scope', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'controller', { enumerable: false, writable: true, value: null }); // No serialize to json!

        this.userId = source.userId;
        this.screen_name = (source.screen_name) ? source.screen_name : source.userId;
        this.alias = (source.alias) ? source.alias : source.userId;
        this.address = Crypto.Hash160(this.userId).toDTPAddress(); // Convert id to DTP Address
        this.scope = Profile.SimpleDomainFormat(window.location.hostname);
    }

    static SimpleDomainFormat(host: string) : string {
        host = host.toLocaleLowerCase();
        if(host.indexOf("www.") == 0) 
            host = host.substr("www.".length);

        if(host.indexOf("old.") == 0) 
            host = host.substr("old.".length);
        return host;
    }


}
export = Profile