declare var tce: any;
import ProfileView = require('./ProfileView');
import TrustStrategy = require('./TrustStrategy');
import Profile = require('./Profile');
import { QueryRequest, QueryContext } from '../lib/dtpapi/model/models';
import BinaryTrustResult = require('./Model/BinaryTrustResult');
import DTPIdentity = require('./Model/DTPIdentity');
import Crypto = require('./Crypto');
import TwitterService = require('./TwitterService');
import ProfileRepository = require('./ProfileRepository');

class ProfileController {
    profile: Profile;
    view: any;
    host: any;
    domElements: any[];
    blocked: boolean;
    following: boolean = false;
    binaryTrustResult : BinaryTrustResult = new BinaryTrustResult();
    selectedElement: JQuery<any>;


    constructor(profile: Profile, view, host) { 
        this.profile = profile;
        this.view = view;
        this.view.controller = this;
        this.host = host;
        this.domElements = [];
    }

    // Update data for the profile
    update() : JQueryPromise<Profile> {
        let deferred = $.Deferred<Profile>();

        if(this.profile.owner) {
            deferred.resolve(this.profile);
        } else {
            this.host.twitterService.getProfileDTP(this.profile.userId).then((owner: DTPIdentity) => {
                if(owner != null) {
                    try {
                        if(Crypto.Verify(owner, this.profile.userId)) {
                            this.profile.owner = owner;
                            this.save();
                            this.host.profileRepository.setIndexKey(owner.ID, this.profile); // Save an index to the profile
                        }
                    } catch(error) {
                        DTP['trace'](error); // Catch it if Crypto.Verify fails!
                    }
                }
                deferred.resolve(this.profile);
            });
        }

        return deferred.promise();
    }

    save () {
        this.host.profileRepository.setProfile(this.profile);
    }
    
    render (element?: any) {
        if(element) {
            this.view.renderElement(element);
            return;
        }

        for (let item of this.domElements) {
            this.view.renderElement(item);
        }
    }
   
   trust () {
        console.log('Trust clicked');
        DTP['trace']("Trust "+ this.profile.screen_name);
        return this.trustProfile("true", 0);
    }

   distrust () {
        DTP['trace']("Distrust "+ this.profile.screen_name);

        return this.trustProfile("false", 0);
    }

    untrust () {
        DTP['trace']("Untrust "+ this.profile.screen_name);
        return this.trustProfile("", 1);
    }

    follow () {
        DTP['trace']("Follow "+ this.profile.screen_name);
        if(this.domElements.length == 0)
            return;

        let $selectedTweet = $(this.domElements[0]);

        let follow = $selectedTweet.data("you-follow");
        if(follow || this.following)
            return;

        var  $button = this.view.createFollowButton($selectedTweet);

        $button.click();
    }


    trustProfile (value, expire) {
        //const self = this;
        return this.buildAndSubmitBinaryTrust( this.profile, value, expire).then(function(result) {
            //self.controller.render();
            DTP['trace']('TrustProfile done!');
        });
    }

    twitterUserAction () {
        if(!this.binaryTrustResult)
            return;

        if(location.href.indexOf(this.profile.screen_name) >= 0) 
            return; // Ignore the profile page for now
    
        if(this.binaryTrustResult.state > 0) {
            if(this.host.settings.twittertrust == "autofollow") {
                this.follow();
            }
            return;
        }


        if(this.binaryTrustResult.state < 0) {

            if(this.blocked || this.domElements.length == 0)
                return;

            let $selectedTweet = $(this.domElements[0]);

            if(this.host.settings.twitterdistrust == "automute") {
                $selectedTweet.find("li.mute-user-item").trigger("click");
            }

            if(this.host.settings.twitterdistrust == "autoblock") {
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


    buildAndSubmitBinaryTrust (profile: Profile, value: any, expire: number) {
        const self = this;
        let trustPackage = this.host.subjectService.BuildBinaryClaim(profile, value, null, expire);
        this.host.packageBuilder.SignPackage(trustPackage);
        DTP['trace']("Updating trust");
        return this.host.dtpService.PostPackage(trustPackage).then((trustResult) => {
            DTP['trace']("Posting package code: "+trustResult.status+ ' - Action: '+ trustResult.statusText);

            // Requery everything, as we have changed a trust
            self.host.queryDTP(self.host.profileRepository.getSessionProfiles());

        }).fail(function(trustResult){ 
            DTP['trace']("Adding trust failed: " +trustResult.statusText);
        });
    }


    // profile will usually be a deserialized neutral object
   static addTo(profile: Profile, twitterService : any, domElement) : void {
        if(!profile)
            return;
        try {
            
            if (!profile.getController()) {
                profile.setController(new ProfileController(profile, new ProfileView(), twitterService));
            }
        } catch (error) {
            console.log(error);
        }
    profile.getController().domElements.push(domElement);

        $(domElement).data("dtp_profile", profile);
    }

    static bindEvents(element, profileRepository : ProfileRepository) : void {
            $(element).on('click', '.trustIcon',  (event) => {
                let button = event.target;
                $(button).addClass('trustSpinner24');
                let tweetContainer = ProfileController.getTweetContainer(button);
                //let screen_name = $(tweetContainer).attr("data-screen-name");
                let userId = $(tweetContainer).attr("data-user-id");
                let profile = profileRepository.ensureProfile(userId);
                profile.getController().selectedElement = tweetContainer;

                this.loadProfile(userId, profileRepository).then(function(profile: Profile) {
                    if(button['classList'].contains('trust')) {
                        profile.getController().trust().then(RemoveSpinner);
                    }

                    if(button['classList'].contains('distrust')) {
                        profile.getController().distrust().then(RemoveSpinner);
                    }

                    if(button['classList'].contains('untrust')) {
                        profile.getController().untrust().then(RemoveSpinner);
                    }

                    if(button['classList'].contains('follow')) {
                        profile.getController().follow();
                        RemoveSpinner();
                    }

                });

                function RemoveSpinner() {
                    $(button).removeClass('trustSpinner24');
                }
            });

    }

   static getTweetContainer(element) : JQuery<any> {
        return $(element).closest('div.tweet'); //.attr("data-screen-name");
    }

  static loadProfile(id: string, profileRepository) {
        let profile = profileRepository.getProfile(id);
        return profile.getController().update();
    }

}
export = ProfileController