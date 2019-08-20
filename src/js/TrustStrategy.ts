import  PackageBuilder = require('./PackageBuilder');
import { ModelPackage,QueryContext, Claim } from '../lib/dtpapi/model/models';
import BinaryTrustResult = require('./Model/BinaryTrustResult');
import ProfileRepository = require('./ProfileRepository');
import Profile = require('./Profile');
import IProfile from './IProfile';
import DTPIdentity = require('./Model/DTPIdentity');
import ITrustStrategy from './Interfaces/ITrustStrategy';
import ProfileController = require('./ProfileController');
import ISettings from './Interfaces/Settings.interface';


class TrustStrategy implements ITrustStrategy {
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

    public calculateBinaryTrustResult(trustResult: BinaryTrustResult) : void {
        trustResult.direct = false;
        trustResult.trust = 0;
        trustResult.distrust = 0;
        trustResult.state = 0;

        for(let key in trustResult.queryContext.results.claims) {
            let claim = trustResult.queryContext.results.claims[key];
            if(claim.type != PackageBuilder.BINARY_TRUST_DTP1) 
                continue; // Ignore all cliams that is not BINARY_TRUST_DTP1

            trustResult.processClaim(claim, this.settings.address);
        }
    }

    // private processClaim(trustResult: BinaryTrustResult, claim: Claim) : void {

    //     if(claim.type === PackageBuilder.BINARY_TRUST_DTP1) {
    //         if(claim.value === "true" || claim.value === "1")
    //             trustResult.trust++;
            
    //         if(claim.value === "false" || claim.value === "0")
    //             trustResult.distrust++;

    //         // IssuerAddress is base64
    //         if(claim.issuer.id == this.settings.address)
    //         {
    //             trustResult.direct = true;
    //             trustResult.directValue = claim.value;
    //         }
    //         trustResult.state = trustResult.trust - trustResult.distrust;
    //     }
    // }



    private CreateSubjectIndex(claims : Array<Claim>) : object {
        let subjectIndex = {};
        claims.forEach((claim) => {
            if(claim.type != PackageBuilder.ID_IDENTITY_DTP1)
                return;
                
            subjectIndex[claim.subject.id] = claim.value; // Subject ID is a DTP ID, value is the local ID
        });
        return subjectIndex;
    }

    public ProcessClaims(claims : Array<Claim>) : object {
        let results = {};
        claims.forEach((claim) => {
            // Include all claims in trust result
            let trustResult = results[claim.subject.id] as BinaryTrustResult;
            if(!trustResult) {
                trustResult = results[claim.subject.id] = new BinaryTrustResult();
            } 
            trustResult.claims.push(claim);
            trustResult.processClaim(claim, this.settings.address);
        });

        return results;
    }

    public ProcessResult(queryContext : QueryContext, controllers: ProfileController[]) : void {
        if(!queryContext || !queryContext.results || !queryContext.results.claims)
            return;

        let results = this.ProcessClaims(queryContext.results.claims);

        // Update controllers
        for(let controller of controllers) { 

            let tempTrustResult = results[controller.profile.userId] as BinaryTrustResult;
            
            if(tempTrustResult) {
                if(!tempTrustResult.isEqual(controller.trustResult)) 
                    controller.trustResult = tempTrustResult;
            } else
                controller.trustResult = new BinaryTrustResult(); // Set default trustResult on controller that do not have a result.

            controller.trustResult.queryContext = queryContext;
            this.calculateBinaryTrustResult(controller.trustResult);
        }
    }

    public ProcessSingleResult(queryContext : QueryContext) : BinaryTrustResult {
        if(!queryContext || !queryContext.results || !queryContext.results.claims)
            return null;

        let result = new BinaryTrustResult();
        result.queryContext = queryContext;


        this.calculateBinaryTrustResult(result);
        return result;
    }


    public UpdateProfiles(queryContext : QueryContext, profiles: Array<IProfile>) : void {
        if(queryContext && queryContext.results && queryContext.results.claims) {
            let trustResults = this.ProcessClaims(queryContext.results.claims);
            profiles.forEach(p => { 
                    p.trustResult = trustResults[p.userId] || new BinaryTrustResult();
                    p.queryResult = queryContext;
                });
        } else
            profiles.forEach(p => p.trustResult = new BinaryTrustResult());
    }


    // public ProcessResult2(queryContext : QueryContext, controllers: Array<ProfileController>) : void {
    //     if(!queryContext || !queryContext.results || !queryContext.results.claims)
    //         return;

    //     let claims = queryContext.results.claims;
    //     let subjectIndex: Array<string> = [];
    //     const checkTime = Math.round(Date.now()/1000.0);

    //     claims.forEach((claim) => {
    //         if(claim.type != PackageBuilder.ID_IDENTITY_DTP1)
    //             return;
                
    //         subjectIndex[claim.subject.id] = claim.value; // Subject is a DTP ID, value is the local ID
    //     });

    //     let results = {};

    //     claims.forEach((claim) => {
    //         if(claim.type != PackageBuilder.BINARY_TRUST_DTP1) 
    //             return; // Ignore all cliams that is not BINARY_TRUST_DTP1

    //         let subjectId = subjectIndex[claim.subject.id];
    //         if(!subjectId) // Undefined
    //             subjectId = claim.subject.id;

    //         let controller = controllers[subjectId];
    //         if(!controller) {
    //             console.log("Controller not found!! subject id: "+subjectId);
    //             return;
    //         }

    //         let profile = controller.profile;

    //         // Make sure that an owner is added if missing and a ID identity claim is available.
    //         if(!profile.owner && subjectId != claim.subject.id) {
    //             profile.owner = new DTPIdentity({ID:claim.subject.id}); // Proof are missing, verify later if needed!
    //             this.profileRepository.setProfile(profile);
    //         } 

    //         let trustResult = results[subjectId];
    //         if(!trustResult) {
    //             trustResult = new BinaryTrustResult();
    //             //trustResult["controllerId"] = subjectId;
    //             trustResult.time = checkTime;
    //             trustResult.queryContext = queryContext;
    //             results[subjectId] = trustResult;
    //         } 

    //         const exists = (claim.issuer.id in trustResult.claims);
    //         if(exists)
    //              return; // There are already one claim for the subject

    //         trustResult.claims[claim.issuer.id] = claim; // Make sure that only one claim per issuer is added.

    //         this.processClaim(trustResult, claim);
    //     });

    //     for(let subjectId in controllers) { 
    //         if (!controllers.hasOwnProperty(subjectId))
    //             continue;

    //         let controller = controllers[subjectId] as ProfileController;
    //         let tempTrustResult = results[subjectId] as BinaryTrustResult;
            
    //         if(tempTrustResult) {
    //             tempTrustResult.claims = Object.keys(tempTrustResult.claims).map((key) => { 
    //                 return (tempTrustResult.claims.hasOwnProperty(key)) ? tempTrustResult.claims[key] : undefined; 
    //             });
    //             if(!tempTrustResult.isEqual(controller.trustResult))
    //                 controller.trustResult = tempTrustResult;
    //         } else
    //             controller.trustResult = new BinaryTrustResult(); // Set default trustResult on controller that do not have a result.
    //     }
    // }
}
export = TrustStrategy