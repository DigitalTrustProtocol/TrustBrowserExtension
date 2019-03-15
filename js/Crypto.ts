import DTPIdentity = require("./Model/DTPIdentity");

declare var tce: any;

class Crypto {
    static Sign(keyPair: any, data: string) : string
    {
        return tce.bitcoin.message.sign(keyPair,   data);
    }

    static Verify(dtpIdentity: DTPIdentity, message): boolean
    {
        return tce.bitcoin.message.verify(dtpIdentity.ID, dtpIdentity.Proof, message);
    }
    
    static Hash160(text: string) : any {
        return tce.bitcoin.crypto.hash160(new tce.buffer.Buffer(text, 'UTF8'));
    }
}

export = Crypto