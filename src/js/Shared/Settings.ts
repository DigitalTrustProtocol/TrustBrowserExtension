import ISettings from "../Interfaces/Settings.interface";

export default class Settings implements ISettings {
    alias: string = "";
    aliasProof: string = "";
    aliasChanged: boolean = false;
    password: string = "";
    seed: string = "";
    rememberme: boolean = true;
    infoserver: string = "https://trust.dance";
    identicon : string = "";
    time: number = 0;
    keyPair?: any;
    hash:any;
    
    constructor() {
        Object.defineProperty(this, 'hash', { enumerable: false, writable: true, value: null }); // No serialize to json!
        Object.defineProperty(this, 'keyPair', { enumerable: false, writable: true, value: null }); // No serialize to json!
    }

    public static copy(source : ISettings) : Settings {
        let target = new Settings();
        target.alias = source.alias;
        target.aliasProof = source.aliasProof;
        target.aliasChanged = source.aliasChanged;
        target.password = source.password;
        target.seed = source.seed;
        target.rememberme = source.rememberme;
        target.infoserver = source.infoserver;
        target.identicon = source.identicon;
        target.time = source.time;

        return target;
    }
}

