import Decorators = require("../Decorators");

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

    private _platformID : string; 
    public PlatformID: string;

    constructor(source: any) {
        // Object.defineProperty(this, 'PlatformID', {
        //     get() {
        //       return this._platformID;
        //     },
        //     set(value: string) {

        //         if(value && typeof value != 'string')
        //             throw new Error('PlatformID (string) cannot be set to object of type: ' +(typeof value));
        //         this._platformID = value;
        //     }
        //   });

        this.ID = source.ID ;
        this.Proof = source.Proof;

        this.PlatformID = source.PlatformID;
    }
}
Decorators.typeCheck(DTPIdentity.prototype, "PlatformID", "string");

export = DTPIdentity