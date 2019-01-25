import  PackageBuilder = require('./PackageBuilder');
import ISettings from './Settings.interface';
import { ModelPackage,QueryContext, Claim } from '../lib/dtpapi/model/models';
import BinaryTrustResult = require('./Model/BinaryTrustResult');


class TrustHandler  {
    settings: ISettings;
    queryContext: QueryContext;
    subjects: any[];
    alias: any[];
    packageBuilder: PackageBuilder;
    
    constructor(result : QueryContext, settings: ISettings) {
        console.log('trust', result)

        this.settings = settings;
        this.queryContext = result;
        this.subjects = [];
        this.alias = [];
        this.packageBuilder = new PackageBuilder(settings);

        if(!this.queryContext) 
        {
            this.queryContext = <QueryContext>{};
        }

    }

    BuildSubjects() {
        
        if(!this.queryContext.results.claims)
            return;

        this.queryContext.results.claims.forEach((claim) => {
            if(claim.type === this.packageBuilder.BINARY_TRUST_DTP1) {
                var list = this.subjects[claim.subject.id];

                if(!list) {
                    list = [];
                    this.subjects[claim.subject.id] = list;
                } 

                list.push(claim);
            }

            if(claim.type === this.packageBuilder.ALIAS_IDENTITY_DTP1) {
                let list = this.alias[claim.subject.id];

                if(!list) {
                    list = [];
                    this.alias[claim.subject.id] = list;
                } 

                list.push(claim);
            }
        });
    }


    CalculateBinaryTrust(subjectId, ownerId) : BinaryTrustResult {
        let result = new BinaryTrustResult();

        let subjectClaims = this.subjects[subjectId];
        let ownerClaims = this.subjects[ownerId];
        if(!subjectClaims && !ownerClaims)
            return result;

        let CalcTrust = (claims) => {
            if(!claims) return;
            claims.forEach((claim) => {
                if(claim.type !== this.packageBuilder.BINARY_TRUST_DTP1) 
                    return;
                
                if(claim.value === "true" || claim.value === "1")
                    result.trust++;
                else
                    result.distrust++;
                                // IssuerAddress is base64
                if(claim.issuer.id == this.settings.address)
                {
                    result.direct = true;
                    result.directValue = claim.value;
                }
            });
        }
        
        CalcTrust(subjectClaims);   
        CalcTrust(ownerClaims); 

        result.state = result.trust - result.distrust;

        return result;
    }
 
    CalculateBinaryTrust2 (subjectAddress, ownerAddress) {
        //let self = this;
        let result = {
            networkScore : 0,
            personalScore: 0,
        };
        //var binaryTrustCount = 0;
        
        let subjectTrusts = this.subjects[subjectAddress];
        let ownerTrusts = this.subjects[ownerAddress];
        if(!subjectTrusts && !ownerTrusts)
            return result;

        function CalcTrust(trusts, pkgBuilder, settings) {
            if(!trusts) return;
            for(const key in trusts) {
                const trust = trusts[key];

                if(trust.type != pkgBuilder.BINARY_TRUST_DTP1)
                    continue;

                //binaryTrustCount ++;

                if(trust.issuer.address == settings.address) { // Its your trust!
                    result.personalScore += (trust.claim) ? 1 : -1;
                } else {
                    result.networkScore += (trust.claim) ? 1 : -1;
                }
            }
        }
        CalcTrust(subjectTrusts, this.packageBuilder, this.settings);   
        CalcTrust(ownerTrusts, this.packageBuilder, this.settings);
        
        if (result.personalScore != 0) {
            result.networkScore = result.personalScore;
        }

        //result.trustPercent = Math.floor((result.networkScore * 100) / binaryTrustCount);

        return result;
    }
}
export = TrustHandler