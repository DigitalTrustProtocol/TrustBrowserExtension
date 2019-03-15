import  PackageBuilder = require('./PackageBuilder');
import ISettings from './Settings.interface';
import { ModelPackage,QueryContext, Claim } from '../lib/dtpapi/model/models';
import BinaryTrustResult = require('./Model/BinaryTrustResult');
import ProfileRepository = require('./ProfileRepository');


class TrustStrategy  {
    settings: ISettings;
    subjects: any[];
    alias: any[];
    packageBuilder: PackageBuilder;
    profileRepository: ProfileRepository;
    queryContext:any;

    constructor(settings: ISettings, profileRepository: ProfileRepository) {
        this.settings = settings;
        this.profileRepository = profileRepository;
    }

    ProcessResult(queryContext : QueryContext) {
        if(!queryContext || !queryContext.results || !queryContext.results.claims)
            return;

        const checkTime = Math.round(Date.now()/1000.0);
        
        let claims = queryContext.results.claims;
        for(let key in claims) {
            if (!claims.hasOwnProperty(key))
                continue;            

            let claim = claims[key];
            if(claim.type === PackageBuilder.BINARY_TRUST_DTP1) {
                let profile = this.profileRepository.getProfile(claim.subject.id);
                if(profile == null) 
                    profile = this.profileRepository.getProfileByIndex(claim.subject.id);
                
                if(profile == null) {
                    continue; // No Profile found, wait for now
                }
                
                let trustResult = profile.getController().binaryTrustResult;

                if(trustResult.time != checkTime) {
                    trustResult.Clean(); // Reset the trustResult
                    trustResult.time = checkTime; // Set check time
                    trustResult.queryContext = queryContext;
                }

                const exists = (claim.issuer.id in trustResult.claims);
                if(exists)
                    continue; // There are already one claim for the subject

                trustResult.claims[claim.issuer.id] = claim; // Make sure that only one claim per issuer is added.

                if(claim.value === "true" || claim.value === "1")
                    trustResult.trust++;
                else
                    trustResult.distrust++;
                                // IssuerAddress is base64
                if(claim.issuer.id == this.settings.address)
                {
                    trustResult.direct = true;
                    trustResult.directValue = claim.value;
                }
            }
        }
    }

    // BuildSubjects() {
    //     if(!this.queryContext.results)
    //         return;

    //     if(!this.queryContext.results.claims)
    //         return;

    //     this.queryContext.results.claims.forEach((claim) => {
    //         if(claim.type === PackageBuilder.BINARY_TRUST_DTP1) {
    //             var list = this.subjects[claim.subject.id];

    //             if(!list) {
    //                 list = [];
    //                 this.subjects[claim.subject.id] = list;
    //             } 

    //             list.push(claim);
    //         }

    //         if(claim.type === PackageBuilder.ALIAS_IDENTITY_DTP1) {
    //             let list = this.alias[claim.subject.id];

    //             if(!list) {
    //                 list = [];
    //                 this.alias[claim.subject.id] = list;
    //             } 

    //             list.push(claim);
    //         }
    //     });
    // }


    // CalculateBinaryTrust(subjectId, ownerId) : BinaryTrustResult {
    //     let result = new BinaryTrustResult();

    //     let subjectClaims = this.subjects[subjectId];
    //     let ownerClaims = this.subjects[ownerId];
    //     if(!subjectClaims && !ownerClaims)
    //         return result;

    //     let CalcTrust = (claims) => {
    //         if(!claims) return;
    //         claims.forEach((claim) => {
    //             if(claim.type !== PackageBuilder.BINARY_TRUST_DTP1) 
    //                 return;
                
    //             if(claim.value === "true" || claim.value === "1")
    //                 result.trust++;
    //             else
    //                 result.distrust++;
    //                             // IssuerAddress is base64
    //             if(claim.issuer.id == this.settings.address)
    //             {
    //                 result.direct = true;
    //                 result.directValue = claim.value;
    //             }
    //         });
    //     }
        
    //     CalcTrust(subjectClaims);   
    //     CalcTrust(ownerClaims); 

    //     result.state = result.trust - result.distrust;

    //     return result;
    // }
 
    // CalculateBinaryTrust2 (subjectAddress, ownerAddress) {
    //     //let self = this;
    //     let result = {
    //         networkScore : 0,
    //         personalScore: 0,
    //     };
    //     //var binaryTrustCount = 0;
        
    //     let subjectTrusts = this.subjects[subjectAddress];
    //     let ownerTrusts = this.subjects[ownerAddress];
    //     if(!subjectTrusts && !ownerTrusts)
    //         return result;

    //     function CalcTrust(trusts, settings) {
    //         if(!trusts) return;
    //         for(const key in trusts) {
    //             const trust = trusts[key];

    //             if(trust.type != PackageBuilder.BINARY_TRUST_DTP1)
    //                 continue;

    //             //binaryTrustCount ++;

    //             if(trust.issuer.address == settings.address) { // Its your trust!
    //                 result.personalScore += (trust.claim) ? 1 : -1;
    //             } else {
    //                 result.networkScore += (trust.claim) ? 1 : -1;
    //             }
    //         }
    //     }
    //     CalcTrust(subjectTrusts, this.settings);   
    //     CalcTrust(ownerTrusts, this.settings);
        
    //     if (result.personalScore != 0) {
    //         result.networkScore = result.personalScore;
    //     }

    //     //result.trustPercent = Math.floor((result.networkScore * 100) / binaryTrustCount);

    //     return result;
    // }
}
export = TrustStrategy