import { ModelPackage, Claim, IssuerIdentity, SubjectIdentity } from "../lib/dtpapi/model/models";
import { Buffer } from 'buffer';
import Crypto = require("./Crypto");

Buffer.prototype.toJSON = function() {
    return this.toString('base64');
}
class PackageBuilder {
   settings: any;
   static BINARY_TRUST_DTP1: string = "binary.trust.dtp1";
   static CONFIRM_TRUST_DTP1: string = "confirm.trust.dtp1";
   static RATING_TRUST_DTP1: string = "rating.trust.dtp1";
   static IDENTITY_DTP1: string = "identity.dtp1";
   static ID_IDENTITY_DTP1: string = "id.identity.dtp1";
   static ALIAS_IDENTITY_DTP1: string = "alias.identity.dtp1";
   static IDENTITY_TYPE_NAME = "name";
   static IDENTITY_TYPE_ID = "id";
   
    constructor(settings) {
        this.settings = settings;
    }

   CreatePackage(claim) : ModelPackage {
        let claimPackage : ModelPackage = {
            claims: (claim) ? [claim] : [],
        }
        return claimPackage;
    }

    SignPackage(claimPackage : ModelPackage) : PackageBuilder {
        for(let index in claimPackage.claims) {
            let claim = claimPackage.claims[index];
            let source = this.BuildIdSource(claim);
            claim.issuer.proof = this.Sign(source);
        }
        return this;
    }

    CreateNameClaim (issuer, script, subject, value : string, scope, activate, expire, metadata?: string) : Claim
    {
        return this.CreateClaim(issuer, script, subject, PackageBuilder.IDENTITY_TYPE_NAME, PackageBuilder.BINARY_TRUST_DTP1, scope, value, activate, expire, metadata);
    }


    CreateBinaryClaim (issuer, script, subject, value : string, scope, activate, expire, metadata?: string) : Claim
    {
        return this.CreateClaim(issuer, script, subject, PackageBuilder.IDENTITY_TYPE_ID, PackageBuilder.BINARY_TRUST_DTP1, scope, value, activate, expire, metadata);
    }

    CreateAliasIdentityClaim (issuer, script, subject, value : string, scope, activate, expire, metadata? : string) : Claim
    {
        return this.CreateClaim(issuer, script, subject, PackageBuilder.IDENTITY_TYPE_ID, PackageBuilder.ALIAS_IDENTITY_DTP1, scope, value, activate, expire, metadata);
    }

    CreateIDIdentityClaim (issuer, script, subject, value : string, scope, activate, expire, metadata? : string) : Claim
    {
        return this.CreateClaim(issuer, script, subject, PackageBuilder.IDENTITY_TYPE_ID, PackageBuilder.ID_IDENTITY_DTP1, scope, value, activate, expire, metadata);
    }

    CreateClaim (issuer: any, script, subject, subjectType, type, scope, value: string, activate, expire, metadata? : string) : Claim {
        if(typeof scope != 'string')
            scope = JSON.stringify(scope);

        if(value == undefined || value == null)
            value = "";
        
        var stringValue = (typeof value === 'string') ? value : JSON.stringify(value);

        let claim : Claim = {
            issuer : <IssuerIdentity>{ 
                type: script,
                id: issuer
            },
            subject : <SubjectIdentity>{
                id: subject
            },
            type: type,
            value: stringValue,
            scope: (scope) ? scope: "",
            created: Math.round(Date.now()/1000.0),
            activate: (activate) ? activate: 0,
            expire: (expire) ? expire: 0,
            metadata: metadata
        }

        if(subjectType) 
            claim.subject.type = subjectType;

        return claim;
    }

    Sign (data: any) : any[] {
        let message = (typeof data === 'string') ? data : data.toString('base64');
        let buf = Crypto.Sign(this.settings.keyPair, message);
        let sig = [...buf];
        return sig;
    }

    CalculateClaimId (claim : Claim) : any {
        let buf = this.BuildIdSource(claim);
        return Crypto.Hash256(buf); 
    }
    
    BuildIdSource(claim: Claim): Buffer {
        let buffers = [];

        function addInt32LE(value : number) {
            if(!value || value == 0) {
                addUInt8(0);
                return;
            }
            
            addUInt8(4);
            let buf = Buffer.allocUnsafe(4);
            buf.writeInt32LE(value, 0, true);
            buffers.push(buf);
        }

        function addUInt8(value : number) {
            let buf = Buffer.allocUnsafe(1);
            buf.writeUInt8(value, 0, true);
            buffers.push(buf);
        }

        function addString(text: string) {
            if(!text) {
                addUInt8(0);
                return;
            }

            var buf = Buffer.from(text, "UTF8");
            addUInt8(buf.byteLength); // Add the length 
            buffers.push(buf);
        }

        function addSringLowerCase(text: string) {
            if(!text) 
            {
                addUInt8(0);
                return;
            }

            addString(text.toLowerCase());
        }

       
        // Build byte array
        addSringLowerCase(claim.type);

        addSringLowerCase(claim.issuer.type);
        addString(claim.issuer.id); // id may be base64 encoded
        addSringLowerCase(claim.subject.type);
        addString(claim.subject.id);

        if(typeof claim.value != 'string' && claim.value != null && claim.value != undefined) 
        {
            var claimString = JSON.stringify(claim.value);
            addString(claimString);
        }
        else
            addString(claim.value);

        addString(claim.scope);
        addString(claim.metadata); // Metadata
        addInt32LE(claim.created);
        addInt32LE(claim.activate);
        addInt32LE(claim.expire);

        let data = Buffer.concat(buffers);
        return data;
    }
}
export = PackageBuilder