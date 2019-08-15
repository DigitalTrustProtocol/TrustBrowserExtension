import { MessageHandler } from "./MessageHandler";
import bitcoin = require('bitcoinjs-lib');
import Crypto = require("../Crypto");
import { SettingsServer } from "../background/SettingsServer";
import ISettings from "../Interfaces/Settings.interface";
import Settings = require("./Settings");


class SettingsClient {
    private settings: ISettings;
    private messageHandler: MessageHandler;
    private context: any;
    
    constructor(messageHandler : MessageHandler, context: any) {
        this.messageHandler = messageHandler;
        this.context = context;

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
        let keystring = settings.password + settings.seed;
        let hash = Crypto.Hash256(keystring);
                
        settings.keyPair = bitcoin.ECPair.fromPrivateKey(hash);

        const { address } = bitcoin.payments.p2pkh({ pubkey: settings.keyPair.publicKey });
        settings.address = address;
        return settings.keyPair;
    }
}

export = SettingsClient
