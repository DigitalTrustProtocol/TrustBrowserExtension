import DTPIdentity = require("./Model/DTPIdentity");
import bitcoin = require('bitcoinjs-lib');
import bitcoinMessage = require('bitcoinjs-message');
import { Buffer } from 'buffer';


class Crypto {
    static Sign(keyPair: any, message: any) : any
    {
        return bitcoinMessage.sign(message, keyPair.privateKey, keyPair.compressed);
    }

    static Verify(dtpIdentity: DTPIdentity, message: any): boolean
    {
        try {
            //let buf = new Buffer(dtpIdentity.Proof, "base64");
            //return bitcoinMessage.verify(message, dtpIdentity.ID, buf);
            return bitcoinMessage.verify(message, dtpIdentity.ID, dtpIdentity.Proof);
        } catch {
            return false;
        }
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

    static toDTPAddress = function (buf: Buffer, prefix?: number) : string {
        prefix = prefix || 30; // dtp2K prefix is 5101629, 4 bytes Uint32LE
        return bitcoin.address.toBase58Check(buf, prefix);
    } 
    
}

export = Crypto