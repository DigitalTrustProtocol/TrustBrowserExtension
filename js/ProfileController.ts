import ProfileView = require('./ProfileView');
import TrustStrategy = require('./TrustStrategy');
import { QueryRequest, QueryContext } from '../lib/dtpapi/model/models';
import BinaryTrustResult = require('./Model/BinaryTrustResult');
import DTPIdentity = require('./Model/DTPIdentity');
import Crypto = require('./Crypto');
import TwitterService = require('./TwitterService');
import ProfileRepository = require('./ProfileRepository');
import IProfile from './IProfile';
import Profile = require('./Profile');
import ISettings from './Settings.interface';
import { ProfileStateEnum } from './Model/ProfileStateEnum';
import DTPService = require('./DTPService');
import SubjectService = require('./SubjectService');
import PackageBuilder = require('./PackageBuilder');

class ProfileController {
    profile: IProfile;
    view: ProfileView;
    host: any;
    public domElements: Array<HTMLElement> = [];
    queueElements: Array<HTMLElement> = [];
    //blocked: boolean;
    following: boolean = false;
    profileRepository: ProfileRepository;
    queried: boolean;
    trustResult : BinaryTrustResult;
    changed: boolean = true;
    public updateProfilesCallBack = (profiles) => { return $.Deferred<Array<IProfile>>().resolve(null).promise(); };
    dtpService: DTPService;
    subjectService: SubjectService;
    packageBuilder: PackageBuilder;
    trustSubmittedCallBack: any;
    scope: string;


    constructor(userId: string, view: any, profileRepository: ProfileRepository, dtpService: DTPService, subjectService: SubjectService, packageBuilder: PackageBuilder, scope: string) {
        this.profile = new Profile({ userId: userId });
        this.view = view;
        this.profileRepository = profileRepository;
        this.dtpService = dtpService;
        this.subjectService = subjectService;
        this.packageBuilder = packageBuilder;
        this.scope = scope;
    }

    // Update data for the profile
    private loadProfileFromHost(): JQueryPromise<IProfile> {
        let deferred = $.Deferred<IProfile>();

        if (this.profile.owner) {
            deferred.resolve(this.profile);
        } else {
            if(!this.updateProfilesCallBack)
                deferred.resolve(this.profile);
            
            this.updateProfilesCallBack([this.profile]).then((profiles) => {
                deferred.resolve(this.profile);
            });
        }

        return deferred.promise();
    }

    public updateProfile(source: IProfile): JQueryPromise<IProfile> {
        this.profile.update(source);
        if (this.profile.state == ProfileStateEnum.Changed) {
            return this.profileRepository.setProfile(this.profile);
        }
        return $.when(this.profile).promise();
    }

    public addElement(element: HTMLElement): void {
        //this.domElements.push(element);
        this.queueElements.push(element);
        this.bindEvents(element);
        $(element).data("dtp_controller", this);
    }

    public save(): JQueryPromise<IProfile> {
        return this.profileRepository.setProfile(this.profile);
    }

    public updateTrustResult(source: BinaryTrustResult) : boolean {
        let changed = false;
        if(this.trustResult) {
            // Comparer
            changed = this.trustResult.claims.length != source.claims.length ? true : changed;
            changed = this.trustResult.direct != source.direct ? true : changed;
            changed = this.trustResult.directValue != source.directValue ? true : changed;
            changed = this.trustResult.distrust != source.distrust ? true : changed;
            changed = this.trustResult.trust != source.trust ? true : changed;
            changed = this.trustResult.state != source.state ? true : changed;
        }
        
        if(changed || !this.trustResult) {
            this.trustResult = source;
            this.changed = true;
        }

        return this.changed;
    }


    // Render all elements
    public renderAll() : void {
        if(!this.changed) // If data have not change, no need for a rerender!
            return;

        for (let key in this.domElements) {
            let element = this.domElements[key] as HTMLElement;
            this.view.render(this, element);
        }
        this.render(); // Pickup all queue elements as well
        this.changed = false; // Now reset the changed property
    }

    // Render new elements
    public render(): void {
        for (let key in this.queueElements) {
            let element = this.queueElements[key] as HTMLElement;
            this.domElements.push(element);
            this.view.render(this, element);
        }
        this.queueElements = [];
    }



    trust() {
        console.log('Trust clicked');
        DTP['trace']("Trust " + this.profile.screen_name);
        return this.trustProfile("trust","true", 0);
    }

    distrust() {
        DTP['trace']("Distrust " + this.profile.screen_name);

        return this.trustProfile("distrust", "false", 0);
    }

    untrust() {
        DTP['trace']("Untrust " + this.profile.screen_name);
        return this.trustProfile("untrust","", 1);
    }




    trustProfile(name: string, value: any, expire: number): JQueryPromise<any> {
        return this.buildAndSubmitBinaryTrust(this.profile, value, this.scope, expire).then((result) => {
            DTP['trace']('TrustProfile done!');

            if(this.trustSubmittedCallBack)
                // this.trustSubmittedCallBack({
                //     name: name,
                //     value: value,
                //     expire: expire,
                //     controller: this
                // });
                this.trustSubmittedCallBack(result);

            return result;
        });
    }

    buildAndSubmitBinaryTrust(profile: IProfile, value: any, scope:string, expire: number): JQueryPromise<any> {
        const self = this;
        let deferred = $.Deferred<any>();

        this.loadProfileFromHost().then(() => {
            let trustPackage = this.subjectService.BuildBinaryClaim(profile, value, null, scope, expire);
            this.packageBuilder.SignPackage(trustPackage);
            DTP['trace']("Issuing trust");
            DTP['trace'](JSON.stringify(trustPackage, undefined, 2));
            this.dtpService.PostPackage(trustPackage).then((trustResult) => {
                DTP['trace']("Posting package code: " + trustResult.status + ' - Action: ' + trustResult.statusText);
              
                deferred.resolve(trustResult);
            }, (trustResult) => {
                DTP['trace']("Adding trust failed: " + trustResult.statusText);
                deferred.fail();
            });
        })
        return deferred.promise();
    }


    // profile will usually be a deserialized neutral object
    //    static addTo(profile: IProfile, twitterService : any, domElement) : void {
    //         if(!profile)
    //             return;
    //         try {

    //             if (!profile.controller) {
    //                 profile.controller = new ProfileController(profile, new ProfileView(), twitterService);
    //             }
    //         } catch (error) {
    //             console.log(error);
    //         }
    //         profile.controller.domElements.push(domElement);

    //         $(domElement).data("dtp_profile", profile);
    //     }

    private bindEvents(element: HTMLElement): void {
        $(element).on('click', '.trustIcon', (event) => {
            let button = event.target;
            $(button).addClass('trustSpinner24');
            //let tweetContainer = ProfileController.getTweetContainer(button);
            //let screen_name = $(tweetContainer).attr("data-screen-name");

            // let userId = $(tweetContainer).attr("data-user-id");
            // profileRepository.ensureProfile(userId).then(profile => {

            //this.loadProfile(userId, profileRepository).then(function(profile: IProfile) {
            let classList = button['classList'];

            if (classList.contains('trust')) {
                this.trust().then(RemoveSpinner);
            }

            if (classList.contains('distrust')) {
                this.distrust().then(RemoveSpinner);
            }

            if (classList.contains('untrust')) {
                this.untrust().then(RemoveSpinner);
            }

            // if (classList.contains('follow')) {
            //     this.follow();
            //     RemoveSpinner();
            // }

            //});

            function RemoveSpinner() {
                $(button).removeClass('trustSpinner24');
            }
            //});
        });
    }

    static getTweetContainer(element): JQuery<any> {
        return $(element).closest('div.tweet'); //.attr("data-screen-name");
    }

    //    loadProfile(id: string, profileRepository : ProfileRepository) : JQueryPromise<IProfile> {
    //         return profileRepository.getProfile(id).then(profile => {
    //             if(profile != null)
    //                 return profile.controller.update();
    //             return null;
    //         });
    //     }
}

export = ProfileController