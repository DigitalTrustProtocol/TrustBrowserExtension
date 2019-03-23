import DTPIdentity = require("./Model/DTPIdentity");
import Crypto = require("./Crypto");
import ProfileController = require("./ProfileController");
import IProfile from "./IProfile";
import { jsonIgnoreReplacer, jsonIgnore } from 'json-ignore';
import BinaryTrustResult = require("./Model/BinaryTrustResult");
import Decorators = require("./Decorators");

class Profile implements IProfile {
    static CurrentUser : Profile = null;

    public screen_name: string;
    public alias: string;
    public owner: DTPIdentity;
    public userId: string;
    public biggerImage: string;
    public identiconData16: string;

    //public address: any;
    public scope: string;
    public controller: ProfileController;
    public formAuthenticityToken: string;
    public binaryTrustResult : BinaryTrustResult;

    constructor(source: any) { 
        Object.defineProperty(this, 'address', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'scope', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'controller', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'formAuthenticityToken', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'binaryTrustResult', { enumerable: false, writable: true, value: null }); // No serialize to json!

        this.binaryTrustResult = new BinaryTrustResult()

        this.update(source);
    }

    update(source: any) : void {
        this.userId = source.userId;
        this.screen_name = (source.screen_name) ? source.screen_name : source.userId;
        this.alias = (source.alias) ? source.alias : source.userId;
        this.identiconData16 = source.identiconData16;
        this.scope = Profile.SimpleDomainFormat(window.location.hostname);
        this.formAuthenticityToken = (source.formAuthenticityToken) ? source.formAuthenticityToken: null;
        this.owner = source.owner;
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

//Decorators.typeCheck(Profile.prototype, "userId", "string");

export = Profile