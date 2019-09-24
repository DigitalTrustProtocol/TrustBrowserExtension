import * as bitcoin from "bitcoinjs-lib";
import * as bitcoinMessage from "bitcoinjs-message";
import { Buffer } from 'buffer';


export default class Crypto {
    static Sign(keyPair: any, message: any) : any
    {
        return bitcoinMessage.sign(message, keyPair.privateKey, keyPair.compressed);
    }

    static Verify(message: any, address: string, signature: string): boolean
    {
        try {
            return bitcoinMessage.verify(message, address, signature);
        } catch {
            return false;
        }
    }
   
    static Hash160(data: any) : any {
        if(typeof data === 'string')
            data = Buffer.from(data, "utf8");
        return bitcoin.crypto.hash160(data);
    }

    static Hash256(data: any) : any {
        if(typeof data === 'string')
            data = Buffer.from(data, "utf8");

        return Crypto.Sha256(Crypto.Sha256(data));
    }

    static Sha256(data: any) : any {
        if(typeof data === 'string')
            data = Buffer.from(data, "utf8");
        return bitcoin.crypto.sha256(data);
    }

    static toDTPAddress = function (buf: Buffer, prefix?: number) : string {
        prefix = prefix || 30; // dtp2K prefix is 5101629, 4 bytes Uint32LE
        return bitcoin.address.toBase58Check(buf, prefix);
    } 
    
}