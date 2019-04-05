import  PackageBuilder = require('./PackageBuilder');
import ISettings from './Settings.interface';
import { ModelPackage,QueryContext, Claim } from '../lib/dtpapi/model/models';
import BinaryTrustResult = require('./Model/BinaryTrustResult');
import ProfileRepository = require('./ProfileRepository');
import Profile = require('./Profile');
import IProfile from './IProfile';
import DTPIdentity = require('./Model/DTPIdentity');
import ITrustStrategy from './Interfaces/ITrustStrategy';
import ProfileController = require('./ProfileController');


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

        for(let key in trustResult.claims) {
            let claim = trustResult.claims[key];

            this.processClaim(trustResult, claim);
        }
    }

    private processClaim(trustResult: BinaryTrustResult, claim: Claim) : void {
        if(claim.value === "true" || claim.value === "1")
            trustResult.trust++;
        
        if(claim.value === "false" || claim.value === "0")
            trustResult.distrust++;

        // IssuerAddress is base64
        if(claim.issuer.id == this.settings.address)
        {
            trustResult.direct = true;
            trustResult.directValue = claim.value;
        }

        trustResult.state = trustResult.trust - trustResult.distrust;
    }

    public ProcessResult(queryContext : QueryContext, controllers: Array<ProfileController>) : void {
        if(!queryContext || !queryContext.results || !queryContext.results.claims)
            return;

        let claims = queryContext.results.claims;
        let subjectIndex: Array<string> = [];

        claims.forEach((claim) => {
            if(claim.type != PackageBuilder.ID_IDENTITY_DTP1)
                return;
                
            subjectIndex[claim.subject.id] = claim.value; // Subject is a DTP ID, value is the local ID
        });

        let tasks = [];
        let results = {};

        claims.forEach((claim) => {
            if(claim.type != PackageBuilder.BINARY_TRUST_DTP1) 
                return; // Ignore all cliams that is not BINARY_TRUST_DTP1

            let subjectId = subjectIndex[claim.subject.id];
            if(!subjectId) // Undefined
                subjectId = claim.subject.id;

            let controller = controllers[subjectId];
            if(!controller) {
                console.log("Controller not found!! subject id: "+subjectId);
                return;
            }

            let profile = controller.profile;

            // // Id can be user id or a DTP id
            // if(profile == null) {
            //     if(subjectId == claim.subject.id)
            //         return; // The profile do not exist! No data on who the claim is about.

                       
            //     // Create a new profile, but do not load its DTP data
            //     // The profile should not be a subject as they are all known!(?)
            //     let data = { 
            //         userId: subjectId, // Should be local id
            //         screen_name: 'Unknown', 
            //         alias: '', // Should be DTP ID
            //         //owner: new DTPIdentity({ID:claim.subject.id}) // Proof are missing, verify later if needed!
            //     };
            //     profile = new Profile(data);
            //     this.profileRepository.setProfile(profile);
            // }

            // Make sure that an owner is added if missing and a ID identity claim is available.
            if(!profile.owner && subjectId != claim.subject.id) {
                profile.owner = new DTPIdentity({ID:claim.subject.id}); // Proof are missing, verify later if needed!
                this.profileRepository.setProfile(profile);
            } 


            //if(!controller.trustResult)
            let trustResult = results[subjectId];
            if(!trustResult) {
                trustResult = new BinaryTrustResult();
                trustResult["controllerId"] = subjectId;
                results[subjectId] = trustResult;
            } 

            
            //let trustResult = controller.trustResult as BinaryTrustResult;


            // if(trustResult.time != checkTime) {
            //     trustResult.Clean(); // Reset the trustResult
            //     //trustResult.time = checkTime; // Set check time
            //     trustResult.queryContext = queryContext;
            // }


            // const exists = (claim.issuer.id in trustResult.claims);
            // if(exists)
            //     return; // There are already one claim for the subject

            trustResult.claims[claim.issuer.id] = claim; // Make sure that only one claim per issuer is added.

            this.processClaim(trustResult, claim);
    
            // let deferred = $.Deferred();
            // tasks.push(deferred);

            // Issuer is always DTP ID, add reference to the issuer profile.
            //let issuerProfile = 
            // 
            // this.profileRepository.getProfileByIndex(claim.issuer.id).then(issuerProfile => {
            //     if(issuerProfile)
            //         trustResult.profiles.push(issuerProfile);

            //     deferred.resolve();
            // });

        });

        for(let subjectId in controllers) {
            if (!controllers.hasOwnProperty(subjectId))
                continue;

            let controller = controllers[subjectId] as ProfileController;
            let result = results[subjectId] as BinaryTrustResult;

            if(result) {
                result.claims = Object.keys(result.claims).map((key) => { return (result.claims.hasOwnProperty(key)) ? result.claims[key] : undefined; });
                controller.updateTrustResult(result);
            } else {
                controller.updateTrustResult(new BinaryTrustResult()); // Clean out the trust result
            }


        }


        // function resultDeferredDone() {
        //     resultDeferred.resolve();
        // }

        // $.when(tasks).done(resultDeferredDone);

        //return resultDeferred.promise();
    }
}
export = TrustStrategy