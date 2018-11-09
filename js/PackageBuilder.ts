declare var tce: any;
class PackageBuilder {
   settings: any;
   public BINARY_TRUST_DTP1: string = "binary.trust.dtp1";
   public CONFIRM_TRUST_DTP1: string = "confirm.trust.dtp1";
   public RATING_TRUST_DTP1: string = "rating.trust.dtp1";
   public IDENTITY_DTP1: string = "identity.dtp1";
   public ALIAS_IDENTITY_DTP1: string = "alias.identity.dtp1";
   
    constructor(settings) {
        this.settings = settings;
    }

   CreatePackage(trust) {
        let trustpackage = {
            trusts: (trust) ? [trust] : []
        }
        return trustpackage;
    }

    SignPackage(trustpackage) {
        for(let trustIndex in trustpackage.trusts) {
            let trust = trustpackage.trusts[trustIndex];
            this.CalculateTrustId(trust);
            this.SignTrust(trust);
        }
        return this;
    }

    CreateBinaryTrust (issuer, script, subject, value : boolean, note, scope, activate, expire, note2)
    {
        return this.CreateTrust(issuer, script, subject, this.BINARY_TRUST_DTP1, scope, value, activate, expire, note);
    }

    CreateAliasIdentityTrust (issuer, script, subject, claim : string, scope, activate, expire, note)
    {
        return this.CreateTrust(issuer, script, subject, this.ALIAS_IDENTITY_DTP1, scope, JSON.stringify(claim), activate, expire, note);
    }

    CreateTrust (issuer, script, subject, type, scope, claim, activate, expire, note)  {
        if(typeof scope != 'string')
            scope = JSON.stringify(scope);

        let trust = {
            issuer : { 
                type: script,
                address: issuer
            },
            subject : {
                address: subject
            },
            type: type,
            claim: (claim) ? claim : "",
            scope: (scope) ? scope: "",
            created: Math.round(Date.now()/1000.0),
            activate: (activate) ? activate: 0,
            expire: (expire) ? expire: 0,
            node: note
        }

        return trust;
    }

    SignTrust (trust) {
        //trust.issuer.signature = this.settings.keyPair.signCompact(id);
        trust.issuer.signature = tce.bitcoin.message.sign(this.settings.keyPair, trust.id.base64ToBuffer());
    }

    CalculateTrustId (trust) {
        let buf = new tce.buffer.Buffer(1024 * 256); // 256 Kb
        let offset = 0;

        if(trust.issuer) {
            if(trust.issuer.type)
                offset += buf.write(trust.issuer.type.toLowerCase(), offset);

            if(trust.issuer.address) {
                //var address = trust.issuer.address.base64ToBuffer();
                //offset += address.copy(buf, offset, 0, trust.issuer.address.length);
                offset += buf.write(trust.issuer.address, offset);

            }
        }

        if(trust.subject) {
            if(trust.subject.type)
                offset += buf.write(trust.subject.type.toLowerCase(), offset);

            if(trust.subject.address) {
                // var subjectaddress = trust.subject.address.base64ToBuffer();
                // offset += subjectaddress.copy(buf, offset, 0, trust.subject.address.length); // Bytes!
                offset += buf.write(trust.subject.address, offset);
            }
        }

        if(trust.type)
            offset += buf.write(trust.type.toLowerCase(), offset);


        if(trust.claim) {
            if(typeof trust.claim != 'string') 
            {
                var claimString = JSON.stringify(trust.claim);
                offset += buf.write(claimString, offset);
            }
            else
                offset += buf.write(trust.claim, offset);
        }

        if(trust.scope) {
           offset += buf.write(trust.scope, offset);
        }

        offset = buf.writeInt32LE(trust.created, offset);
        offset = buf.writeInt32LE(trust.activate, offset);
        offset = buf.writeInt32LE(trust.expire, offset);

        var data = new tce.buffer.Buffer(offset);
        buf.copy(data, 0, 0, offset);
        trust.id = tce.bitcoin.crypto.hash256(data); 
    }
}
export = PackageBuilder