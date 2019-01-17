declare var tce: any;
import ProfileView = require('./ProfileView');
class ProfileController {
    profile: any;
    view: any;
    host: any;
    trustHandler: any;
    domElements: any[];
    time: number;
    blocked: boolean;
    following: boolean = false;

    constructor(profile, view, host) { 
        this.profile = profile;
        this.view = view;
        this.view.controller = this;
        this.host = host;
        this.trustHandler = null;
        this.domElements = [];
        this.time = 0;
    }

    // Update data for the profile
    update() {
        let deferred = $.Deferred();
        //let self = this;

        if(this.profile.owner) {
            deferred.resolve(this.profile);

        } else {
            this.host.twitterService.getProfileDTP(this.profile.screen_name).then((owner) => {
                if(owner != null) {
                    try {
                        if(ProfileController.verifyDTPsignature(owner, this.profile.screen_name)) {
                            this.profile.owner = owner;
                            this.save();
                        }
                    } catch(error) {
                        DTP['trace'](error);
                    }
                }
                deferred.resolve(this.profile);
            });
        }

        return deferred;
    }

    save () {
        this.host.profileRepository.setProfile(this.profile);
    }

    calculateTrust () {
        if(!this.trustHandler) 
            return;

        let ownerAddress = (this.profile.owner) ? this.profile.owner.address : "";
        this.profile.result = this.trustHandler.CalculateBinaryTrust(this.profile.screen_name, ownerAddress);
    }


    render (element) {
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
        return this.trustProfile(true, 0);
    }

   distrust () {
        DTP['trace']("Distrust "+ this.profile.screen_name);

        return this.trustProfile(false, 0);
    }

    untrust () {
        DTP['trace']("Untrust "+ this.profile.screen_name);
        return this.trustProfile(undefined, 1);
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
        if(!this.profile.result)
            return;

        if(location.href.indexOf(this.profile.screen_name) >= 0) 
            return; // Ignore the profile page for now
    
        if(this.profile.result.state > 0) {
            if(this.host.settings.twittertrust == "autofollow") {
                this.follow();
            }
            return;
        }


        if(this.profile.result.state < 0) {

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


    buildAndSubmitBinaryTrust (profile, value, expire) {
        const self = this;
        let trustPackage = this.host.subjectService.BuildBinaryClaim(profile, value, null, expire);
        this.host.packageBuilder.SignPackage(trustPackage);
        DTP['trace']("Updating trust");
        return this.host.dtpService.PostPackage(trustPackage).then(function(trustResult){
            DTP['trace']("Posting package is a "+trustResult.status.toLowerCase()+ ' '+ trustResult.message);

            // Requery everything, as we have changed a trust
            self.host.queryDTP(self.host.sessionProfiles);

        }).fail(function(trustResult){ 
            DTP['trace']("Adding trust failed: " +trustResult.message);
        });
    }


    // profile will usually be a deserialized neutral object
   static addTo(profile, twitterService, domElement) {
        if (!profile.controller) {
            let view = new ProfileView(profile.controller);
            let controller = new ProfileController(profile, view, twitterService);
            // Make sure that this property will no be serialized by using Object.defineProperty
            Object.defineProperty(profile, 'controller', { value: controller });
        }
        profile.controller.domElements.push(domElement);

        $(domElement).data("dtp_profile", profile);
    }

    static  bindEvents(element, profileRepository) {
            $(element).on('click', '.trustIcon',  (event) => {
                let button = event.target;
                $(button).addClass('trustSpinner24');
                let tweetContainer = ProfileController.getTweetContainer(button);
                let screen_name = $(tweetContainer).attr("data-screen-name");
                let profile = profileRepository.ensureProfile(screen_name);
                profile.controller.selectedElement = tweetContainer;

                this.loadProfile(screen_name, profileRepository).then(function(profile) {
                    if(button['classList'].contains('trust')) {
                        profile.controller.trust().then(RemoveSpinner);
                    }

                    if(button['classList'].contains('distrust')) {
                        profile.controller.distrust().then(RemoveSpinner);
                    }

                    if(button['classList'].contains('untrust')) {
                        profile.controller.untrust().then(RemoveSpinner);
                    }

                    if(button['classList'].contains('follow')) {
                        profile.controller.follow();
                        RemoveSpinner();
                    }

                });

                function RemoveSpinner() {
                    $(button).removeClass('trustSpinner24');
                }
            });

    }

   static getTweetContainer(element)  {
        return $(element).closest('div.tweet'); //.attr("data-screen-name");
    }

   static verifyDTPsignature(dtp, message) {
        return tce.bitcoin.message.verify(dtp.address, dtp.signature, message);
    }

  static loadProfile(screen_name, profileRepository) {
        let profile = profileRepository.getProfile(screen_name);
        return profile.controller.update();
    }

}
export = ProfileController