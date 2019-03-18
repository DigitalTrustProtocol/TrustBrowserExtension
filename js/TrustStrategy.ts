import  PackageBuilder = require('./PackageBuilder');
import ISettings from './Settings.interface';
import { ModelPackage,QueryContext, Claim } from '../lib/dtpapi/model/models';
import BinaryTrustResult = require('./Model/BinaryTrustResult');
import ProfileRepository = require('./ProfileRepository');
import Profile = require('./Profile');
import IProfile from './IProfile';
import DTPIdentity = require('./Model/DTPIdentity');


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

    ProcessResult(queryContext : QueryContext) : BinaryTrustResult {
        if(!queryContext || !queryContext.results || !queryContext.results.claims)
            return;

        const checkTime = Math.round(Date.now()/1000.0);
        
        let claims = queryContext.results.claims;
        let subjectIndex: Array<string> = [];

        claims.forEach((claim) => {
            if(claim.type != PackageBuilder.ID_IDENTITY_DTP1)
                return;
                
            subjectIndex[claim.subject.id] = claim; // Subject is a DTP ID, value is the local ID
        });


        claims.forEach((claim) => {
            if(claim.type != PackageBuilder.BINARY_TRUST_DTP1) 
                return;

            let subjectId = subjectIndex[claim.subject.id];
            if(!subjectId) // Undefined
                subjectId = claim.subject.id;

            let profile = this.profileRepository.getProfile(subjectId); // Id can be user id or a DTP id
            if(profile == null) {
                if(subjectId == claim.subject.id)
                    return; // The profile do not exist! No data on who the claim is about.

                
                // Create a new profile, but do not load its DTP data
                // The profile should not be a subject as they are all known!(?)
                let data = { 
                    userId: subjectId, // Should be local id
                    screen_name: 'Unknown', 
                    alias: claim.subject.id, // Should be DTP ID
                    //owner: new DTPIdentity({ID:claim.subject.id}) // Proof are missing, verify later if needed!
                 };
                profile = new Profile(data);
                //this.profileRepository.setProfile(profile);
            }

            // Make sure that an owner is added if missing and a ID identity claim is available.
            if(!profile.owner && subjectId != claim.subject.id) {
                profile.owner = new DTPIdentity({ID:claim.subject.id}); // Proof are missing, verify later if needed!
                this.profileRepository.setProfile(profile);
            }

            let trustResult = profile.binaryTrustResult as BinaryTrustResult;

            if(trustResult.time != checkTime) {
                trustResult.Clean(); // Reset the trustResult
                trustResult.time = checkTime; // Set check time
                trustResult.queryContext = queryContext;
            }

            const exists = (claim.issuer.id in trustResult.claims);
            if(exists)
                return; // There are already one claim for the subject

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

            trustResult.state = trustResult.trust - trustResult.distrust;
        
            // Issuer is always DTP ID, add reference to the issuer profile.
            trustResult.profiles.push(this.profileRepository.getProfileByIndex(claim.issuer.id));
        });
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