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

class ProfileController {
    profile: IProfile;
    view: ProfileView;
    host: any;
    domElements: any[];
    queueElements: Array<HTMLElement> = [];
    blocked: boolean;
    following: boolean = false;
    profileRepository: ProfileRepository;
    queried: boolean;




    constructor(userId: string, view: any, profileRepository: ProfileRepository) {
        this.profile = new Profile({ userId: userId });
        this.view = view;
        this.view.controller = this;
        this.profileRepository = profileRepository;
        //this.host = host;
        this.domElements = [];
    }

    // Update data for the profile
    update(): JQueryPromise<IProfile> {
        let deferred = $.Deferred<IProfile>();

        if (this.profile.owner) {
            deferred.resolve(this.profile);
        } else {
            this.host.updateProfiles([this.profile]).then((profiles) => {
                deferred.resolve(this.profile);
            });

            // this.host.twitterService.getProfileDTP(this.profile.userId).then((owner: DTPIdentity) => {
            //     if(owner != null) {
            //         try {
            //             if(Crypto.Verify(owner, this.profile.userId)) {
            //                 this.profile.owner = owner;
            //                 this.save();
            //                 this.host.profileRepository.setIndexKey(this.profile); // Save an index to the profile
            //             }
            //         } catch(error) {
            //             DTP['trace'](error); // Catch it if Crypto.Verify fails!
            //         }
            //     }
            //     deferred.resolve(this.profile);
            // });
        }

        return deferred.promise();
    }

    updateProfile(source: IProfile): JQueryPromise<IProfile> {
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

    // Render all elements
    public renderAll() : void {
        for (let key in this.domElements) {
            let element = this.domElements[key] as HTMLElement;
            this.view.renderElement(element);
        }
        this.render(); // Pickup all queue elements as well
    }

    // Render new elements
    public render(): void {
        for (let key in this.queueElements) {
            let element = this.queueElements[key] as HTMLElement;
            this.domElements.push(element);
            this.view.renderElement(element);
        }
        this.queueElements = [];
    }

    trust() {
        console.log('Trust clicked');
        DTP['trace']("Trust " + this.profile.screen_name);
        return this.trustProfile("true", 0);
    }

    distrust() {
        DTP['trace']("Distrust " + this.profile.screen_name);

        return this.trustProfile("false", 0);
    }

    untrust() {
        DTP['trace']("Untrust " + this.profile.screen_name);
        return this.trustProfile("", 1);
    }

    follow() {
        DTP['trace']("Follow " + this.profile.screen_name);
        if (this.domElements.length == 0)
            return;

        let $selectedTweet = $(this.domElements[0]);

        let follow = $selectedTweet.data("you-follow");
        if (follow || this.following)
            return;

        var $button = this.view.createFollowButton($selectedTweet);

        $button.click();
    }


    trustProfile(value, expire): JQueryPromise<any> {
        return this.buildAndSubmitBinaryTrust(this.profile, value, expire).then(function (result) {
            //self.controller.render();
            DTP['trace']('TrustProfile done!');
        });
    }

    twitterUserAction() {
        if (!this.profile.binaryTrustResult)
            return;

        if (location.href.indexOf(this.profile.screen_name) >= 0)
            return; // Ignore the profile page for now

        if (this.profile.binaryTrustResult.state > 0) {
            if (this.host.settings.twittertrust == "autofollow") {
                this.follow();
            }
            return;
        }


        if (this.profile.binaryTrustResult.state < 0) {

            if (this.blocked || this.domElements.length == 0)
                return;

            let $selectedTweet = $(this.domElements[0]);

            if (this.host.settings.twitterdistrust == "automute") {
                $selectedTweet.find("li.mute-user-item").trigger("click");
            }

            if (this.host.settings.twitterdistrust == "autoblock") {
                $selectedTweet.find("li.block-link").trigger("click");
                $("body").removeClass("modal-enabled");
                $(document).find("#block-dialog").hide();
                $(document).find("button.block-button").trigger("click");
                $(document).find("span.Icon--close").trigger("click");
            }

            this.blocked = true;

            // $selectedTweet.trigger("uiBlockAction", {
            //     screenName: self.profile.screen_name, 
            //     userId: self.profile.userId,
            //     tweetId: tweet_id,
            //     scribeContext: {component: "block_dialog", element: "tweet"}
            // });

        }



    }


    buildAndSubmitBinaryTrust(profile: IProfile, value: any, expire: number): JQueryPromise<any> {
        const self = this;
        let deferred = $.Deferred<any>();

        this.update().then(() => {
            let trustPackage = this.host.subjectService.BuildBinaryClaim(profile, value, null, expire);
            this.host.packageBuilder.SignPackage(trustPackage);
            DTP['trace']("Issuing trust");
            DTP['trace'](JSON.stringify(trustPackage, undefined, 2));
            this.host.dtpService.PostPackage(trustPackage).then((trustResult) => {
                DTP['trace']("Posting package code: " + trustResult.status + ' - Action: ' + trustResult.statusText);

                // Requery everything, as we have changed a trust
                self.host.queryDTP(self.host.profileRepository.getSessionProfiles());
                deferred.resolve(trustResult);
            }).fail(function (trustResult) {
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

            if (classList.contains('follow')) {
                this.follow();
                RemoveSpinner();
            }

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