import './common.js';
import { ModelPackage, Claim, IssuerIdentity, SubjectIdentity } from "../lib/dtpapi/model/models";

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

   CreatePackage(claim) {
        let claimPackage : ModelPackage = {
            claims: (claim) ? [claim] : [],
        }
        return claimPackage;
    }

    SignPackage(claimPackage : ModelPackage) {
        for(let index in claimPackage.claims) {
            let claim = claimPackage.claims[index];
            this.CalculateClaimId(claim);
            this.SignClaim(claim);
        }
        return this;
    }

    CreateBinaryClaim (issuer, script, subject, value : boolean, note, scope, activate, expire, note2)
    {
        return this.CreateClaim(issuer, script, subject, this.BINARY_TRUST_DTP1, scope, value, activate, expire, note);
    }

    CreateAliasIdentityClaim (issuer, script, subject, claim : string, scope, activate, expire, note)
    {
        return this.CreateClaim(issuer, script, subject, this.ALIAS_IDENTITY_DTP1, scope, JSON.stringify(claim), activate, expire, note);
    }

    CreateClaim (issuer: any, script, subject, type, scope, value, activate, expire, note)  {
        if(typeof scope != 'string')
            scope = JSON.stringify(scope);

        let claim : Claim = {
            issuer : <IssuerIdentity>{ 
                type: script,
                id: issuer
            },
            subject : <SubjectIdentity>{
                id: subject
            },
            type: type,
            value: (value) ? value : "",
            scope: (scope) ? scope: "",
            created: Math.round(Date.now()/1000.0),
            activate: (activate) ? activate: 0,
            expire: (expire) ? expire: 0,
            note: note
        }

        return claim;
    }

    SignClaim (claim) {
        //claim.issuer.signature = this.settings.keyPair.signCompact(id);
        claim.issuer.signature = tce.bitcoin.message.sign(this.settings.keyPair, claim.id.base64ToBuffer());
    }

    CalculateClaimId (claim : Claim) {
        let buffers = [];
        
        function addBuffer(value: any) {
            if(value === null || value === undefined)
                return;

            if(typeof value === 'string')
                buffers.push(new tce.buffer.Buffer(value));
            else
                buffers.push(value);
        }

        function addBufferLowerCase(value: string) {
            if(value == null || undefined) return;
            addBuffer(value.toLowerCase());
        }
        

        function addInt32LE(value : number) {
            let buf = new tce.buffer.Buffer(4);
            buf.writeInt32LE(value);
            addBuffer(buf);
        }
       

        if(claim.issuer) {
            addBufferLowerCase(claim.issuer.type);
            addBuffer(claim.issuer.id);
        }


        if(claim.subject) {
            addBufferLowerCase(claim.subject.type);
            addBuffer(claim.subject.id);
        }

        addBufferLowerCase(claim.type);

        if(claim.value) {
            if(typeof claim.value != 'string') 
            {
                var claimString = JSON.stringify(claim.value);
                addBuffer(claimString);
            }
            else
                addBuffer(claim.value);
        }

        if(claim.scope) {
           addBuffer(claim.scope);
        }

        addInt32LE(claim.created);
        addInt32LE(claim.activate);
        addInt32LE(claim.expire);

        let data = tce.buffer.Buffer.concat(buffers);

        // let offset = 0;
        // let data = new tce.buffer.Buffer(offset);
        // buffers.forEach(buffer => {
        //     buffer.copy(data, 0, 0, offset);
        //     offset += buffer.length;
        // });

        claim.id = tce.bitcoin.crypto.hash256(data); 
    }


}
export = PackageBuilder