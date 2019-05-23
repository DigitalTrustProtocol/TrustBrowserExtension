import Decorators = require("../Decorators");
import IProfile from "../IProfile";
import { ProfileStateEnum } from "./ProfileStateEnum";
import Crypto = require('../Crypto');


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

    public toString() :string {
        let result = `id:${this.ID} proof:${this.Proof}`;
        
        if(this.PlatformID && this.PlatformID.length > 0)
            result += ` userId:${this.PlatformID}`;

        return result;
    }

    public static parse(text : string) : DTPIdentity {
        text = text.replace(/(?:\r\n|\r|\n)/g, ' ').trim();
        const lower = text.toLocaleLowerCase();

        const id = DTPIdentity.findSubstring(text, lower, 'id:', ' ');
        if(!id) return null;
        const proof = DTPIdentity.findSubstring(text, lower, 'proof:', ' ');
        if(!proof) return null;
        const userId = DTPIdentity.findSubstring(text, lower, 'userid:', ' ');
        const owner = new DTPIdentity({ ID: id, Proof: proof, PlatformID: userId });

        if(!Crypto.Verify(owner, userId))
            return null;

        return owner;
    }

    private static findSubstring(text: string, lower: string, startText: string, endText: string) {
        let start = lower.indexOf(startText);
        if(start < 0)
            return null;
        start += startText.length; // Only return value!
        
        let end = lower.indexOf(endText, start);
        if(end < 0) {
            end = lower.indexOf('\n', start);
            if(end < 0)
                end = lower.length;
        }
   
        return text.substring(start, end);
    }



}
//Decorators.typeCheck(DTPIdentity.prototype, "PlatformID", "string");

export = DTPIdentity