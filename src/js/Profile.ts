import DTPIdentity = require("./Model/DTPIdentity");
import Crypto = require("./Crypto");
import ProfileController = require("./ProfileController");
import IProfile from "./IProfile";
import { jsonIgnoreReplacer, jsonIgnore } from 'json-ignore';
import BinaryTrustResult = require("./Model/BinaryTrustResult");
import Decorators = require("./Decorators");
import { ProfileStateEnum } from "./Model/ProfileStateEnum";



class Profile implements IProfile {
    static CurrentUser : IProfile = null;

    public screen_name: string;
    public alias: string;
    public owner: DTPIdentity;
    public userId: string;
    public avatarImage: string;
    public identiconData16: string;

    //public address: any;
    public scope: string;
    public controller: ProfileController;
    public formAuthenticityToken: string;
    public trustResult : BinaryTrustResult;

    public state: ProfileStateEnum = ProfileStateEnum.None; 

    constructor(source: any) { 
        Object.defineProperty(this, 'address', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'scope', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'controller', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'formAuthenticityToken', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'trustResult', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'state', { enumerable: false, writable: true, value: null }); // No serialize to json!

        this.update(source);
    }

    public update(source: IProfile) : boolean {
        this.state = ProfileStateEnum.None;

        this.updateProperty("userId", source.userId);
        this.updateProperty("screen_name", source.screen_name, source.userId);
        this.updateProperty("alias", source.alias);
        this.updateProperty("avatarImage", source.avatarImage);
        this.updateProperty("identiconData16", source.identiconData16);
        this.updateProperty("formAuthenticityToken", source.formAuthenticityToken);
        this.updateProperty("owner", source.owner);

        return this.state == ProfileStateEnum.Changed;
    }

    private updateProperty(name: string, value: any, defaultValue?: any) : void {
        if(value == undefined && defaultValue == undefined)
            return;

        if(this[name] != value) {
            this[name] = (value != undefined) ? value: defaultValue;
            this.state = ProfileStateEnum.Changed;
        }
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