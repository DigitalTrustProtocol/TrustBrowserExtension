import Decorators = require("../Decorators");
import IProfile from "../IProfile";
import { ProfileStateEnum } from "./ProfileStateEnum";

// function typeCheck(typeName: string) {
//     return function (target: any, propertyKey: string) {
//         let descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {};
//         descriptor.set = function (value) {
//             if (typeof value != typeName)
//                 throw new Error(`${propertyKey} (${typeName}) cannot be set to object of type: ${typeof value}`);
//             target["propertyKey"] = value;
//         }
//         Object.defineProperty(target, propertyKey, descriptor)
//     }
// }


class DTPIdentity {
    public ID: string;
    public Proof: string;
    public PlatformID: string;

    public state: ProfileStateEnum = ProfileStateEnum.None; 

    constructor(source: any) {
        this.ID = source.ID ;
        this.Proof = source.Proof;

        this.PlatformID = source.PlatformID;

        Object.defineProperty(this, 'state', { enumerable: false, writable: true, value: null }); // No serialize to json!
    }

    public static update(profile: IProfile, source: DTPIdentity) : boolean {
        if(!profile.owner && !source) return;
        if(!source) return;
        if(!profile.owner) {
            profile.owner = source;
            profile.state = ProfileStateEnum.Changed;
            return true;
        }

        DTPIdentity.updateProperty(profile.owner, "ID", source.ID);
        DTPIdentity.updateProperty(profile.owner, "Proof", source.Proof);
        DTPIdentity.updateProperty(profile.owner, "PlatformID", source.PlatformID);

        if(profile.owner.state == ProfileStateEnum.Changed) 
            profile.state = ProfileStateEnum.Changed;

        return profile.state == ProfileStateEnum.Changed;
    }


    public static updateProperty(owner: DTPIdentity, name: string, value: any, defaultValue?: any) : void {
        if(value == undefined && defaultValue == undefined)
            return;

        if(owner[name] != value) {
            owner[name] = (value != undefined) ? value: defaultValue;
            owner.state = ProfileStateEnum.Changed;
        }
    }

}
//Decorators.typeCheck(DTPIdentity.prototype, "PlatformID", "string");

export = DTPIdentity