
import ISettings from './Settings.interface';
import Crypto = require('./Crypto');
import bitcoin = require('bitcoinjs-lib');

 class SettingsController {
    settings: ISettings
    constructor(){

        // initialize settings with default value
         this.settings = {
            "password": '',
            "seed": '',
            "rememberme": true,
            "infoserver": "https://trust.dance",
            'twitterdistrust': 'hidecontent',
            "twittertrust": 'noaction',
            "identicon" : ""
        } as ISettings;
    }
    saveSettings (settings: ISettings){
        if (settings.rememberme) {
            settings.keyPair = undefined;
            chrome.storage.local.set({ usersettings: settings }, () => {
                this.buildKey(settings);
                console.log('Settings saved');

            });
        }
    }

    loadSettings (cb) {
        chrome.storage.local.get('usersettings', (result) => {
            console.log('storage',result.usersettings );
            console.log('crmethod',this.settings );
            let settings: ISettings = (result.usersettings) ? result.usersettings : this.settings;
            this.buildKey(settings);
            cb(settings);
        });
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