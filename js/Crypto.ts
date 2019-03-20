import DTPIdentity = require("./Model/DTPIdentity");
import bitcoin = require('bitcoinjs-lib');
import bitcoinMessage = require('bitcoinjs-message');
import { Buffer } from 'buffer';

class Crypto {
    static Sign(keyPair: any, message: string) : any
    {
        return bitcoinMessage.sign(message, keyPair.privateKey, keyPair.compressed);
    }

    static Verify(dtpIdentity: DTPIdentity, message: string): boolean
    {
        return bitcoinMessage.verify(message, dtpIdentity.ID, dtpIdentity.Proof);
    }
    
    static Hash160(data: any) : any {
        if(typeof data === 'string')
            data = new Buffer(data, 'UTF8');
        return bitcoin.crypto.hash160(data);
    }

    static Hash256(data: any) : any {
        if(typeof data === 'string')
            data = new Buffer(data, 'UTF8');

        return Crypto.Sha256(Crypto.Sha256(data));
    }

    static Sha256(data: any) : any {
        if(typeof data === 'string')
            data = new Buffer(data, 'UTF8');
        return bitcoin.crypto.sha256(data);
    }
}
export = Crypto