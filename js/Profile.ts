import DTPIdentity = require("./Model/DTPIdentity");
import Crypto = require("./Crypto");
import ProfileController = require("./ProfileController");

/**
 * @enumerable decorator that sets the enumerable property of a class field to false.
 * @param value true|false
 */
function enumerable(value: boolean) {
    return function (target: any, propertyKey: string) {
        let descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {};
        if (descriptor.enumerable != value) {
            descriptor.enumerable = value;
            descriptor.writable = true;
            Object.defineProperty(target, propertyKey, descriptor)
        }
    };
}
class Profile {
    static Current = null;
    screen_name: string;
    alias: string;
    address: any;
    scope: string;
    owner: DTPIdentity;
    userId: string;
    biggerImage: string;

    //@enumerable(false)
    //controller: ProfileController;

    constructor(id: string) { 
        this.userId = id;
        this.screen_name = id;
        this.alias = id;
        this.address = Crypto.Hash160(id).toDTPAddress(); // Convert id to DTP Address
        this.scope = Profile.SimpleDomainFormat(window.location.hostname);

        Object.defineProperty(this, 'controller', { enumerable: false, writable: true, value: null }); // No serialize to json!
    }

    getController() : ProfileController {
        return this["controller"];
    }

    setController(controller : ProfileController) {
        this["controller"] = controller;
    }


    static SimpleDomainFormat(host: string) : string {
        host = host.toLocaleLowerCase();
        if(host.indexOf("www.") == 0) 
            host = host.substr("www.".length);

        if(host.indexOf("old.") == 0) 
            host = host.substr("old.".length);
        return host;
    }


   static LoadCurrent(settings, profileRepository) : void {
        Profile.Current = JSON.parse($("#init-data")[0]['value']);
        if(settings.address) 
            Profile.Current.owner = new DTPIdentity(settings.address, Crypto.Sign(settings.keyPair, Profile.Current.userId));

        let profile = profileRepository.ensureProfile(Profile.Current.userId);
        profile.owner =   Profile.Current.owner;
        profileRepository.setProfile(profile);
    }
}
export = Profile