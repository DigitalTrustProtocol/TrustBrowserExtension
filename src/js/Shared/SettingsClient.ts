import { MessageHandler } from "./MessageHandler";
import * as bitcoin from "bitcoinjs-lib";
import Crypto from "../Crypto";
import { SettingsServer } from "../background/SettingsServer";
import ISettings from "../Interfaces/Settings.interface";
import Settings from "./Settings";


export default class SettingsClient {
    private settings: ISettings;
    private messageHandler: MessageHandler;
    
    constructor(messageHandler : MessageHandler) {
        this.messageHandler = messageHandler;

        this.settings = new Settings();
    }

    public loadSettings(callback?: (value: ISettings, err?: any) => void): Promise<ISettings> {
        const key = this.getCacheKey("Settings");
        let param = SettingsServer.action("getItem", key);
        return this.messageHandler.send(SettingsServer.handlerName, param, result => {
            let data = (typeof result === "string") ? JSON.parse(result) as ISettings : result as ISettings;
            let settings: ISettings = (data) ? data : this.settings;
            
            Object.defineProperty(settings, 'keyPair', { enumerable: false, writable: true, value: null }); // No serialize to json!
            this.buildKey(settings);
            if(callback)
                callback(settings);
            return settings;
        });     
    }

    public saveSettings(value: ISettings, callback?: (value: ISettings, err?:any) => void): Promise<ISettings> {
        const key = this.getCacheKey("Settings");
        let param = SettingsServer.action("setItem", key, Settings.copy(value)); // Clean out no-seializeable properties.
        
        return this.messageHandler.send(SettingsServer.handlerName, param, result => {
            if(callback)
                callback(result);
        });     
    }


    private getCacheKey(key: string) : string {
        //return this.context.host+this.context.userId+key;
        return "url"+key;
    }

    public buildKey(settings: ISettings) : any {
        let keystring = (settings.password) ? settings.password : '';
        keystring += (settings.seed) ? settings.seed : '';

        let hash = Crypto.Hash256(keystring);
                
        settings.keyPair = bitcoin.ECPair.fromPrivateKey(hash);

        const { address } = bitcoin.payments.p2pkh({ pubkey: settings.keyPair.publicKey });
        settings.address = address;
        if(settings.alias) {
            let buf = Crypto.Sign(settings.keyPair, settings.alias);
            settings.aliasProof = buf.toString('base64');
        }
        return settings.keyPair;
    }   
}