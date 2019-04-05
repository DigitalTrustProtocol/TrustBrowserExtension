
import ISettings from './Settings.interface';
import Crypto = require('./Crypto');
import bitcoin = require('bitcoinjs-lib');
import localforage = require('localforage');

 class SettingsController {
    settings: ISettings;
    context: any;

    constructor(context: any){
        this.context = context;
    
        // initialize settings with default value
         this.settings = {
            "password": '',
            "seed": '',
            "rememberme": true,
            "infoserver": "https://trust.dance",
            'twitterdistrust': 'hidecontent',
            "twittertrust": 'noaction',
            "identicon" : "",
            "time": 0
        } as ISettings;

        Object.defineProperty(this.settings, 'keyPair', { enumerable: false, writable: true, value: null }); // No serialize to json!

    }
    saveSettings (settings: ISettings){
        if (settings.rememberme) {
            //settings.keyPair = undefined;
            // localforage.setItem('key', 'value', function (err) {
            //     // if err is non-null, we got an error
            //     localforage.getItem('key', function (err, value) {
            //       // if err is non-null, we got an error. otherwise, value is the value
            //     });
            //   });
            //this.buildKey(settings);

            let obj = {};
            obj[this.getCacheKey("Settings")] = settings;

            chrome.storage.local.set(obj, () => {
                console.log('Settings saved');
            });
        }
    }

    loadSettings (cb) {
        const key = this.getCacheKey("Settings");
        chrome.storage.local.get(key, (result) => {
            console.log('storage',result[key] );
            console.log('crmethod',this.settings );
            let settings: ISettings = (result[key]) ? result[key] : this.settings;

            Object.defineProperty(settings, 'keyPair', { enumerable: false, writable: true, value: null }); // No serialize to json!
            this.buildKey(settings);
            cb(settings);
        });
    }

    getCacheKey(key: string) {
        return this.context.host+this.context.userId+key;
    }

   public buildKey(settings) {
        let keystring = settings.password + settings.seed;
        let hash = Crypto.Hash256(keystring);
                
        settings.keyPair = bitcoin.ECPair.fromPrivateKey(hash);

        const { address } = bitcoin.payments.p2pkh({ pubkey: settings.keyPair.publicKey });
        settings.address = address;
        return settings.keyPair;
    }
}
export = SettingsController;