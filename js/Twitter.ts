import ProfileController = require('./ProfileController');
import ProfileView = require('./ProfileView');
import ProfileRepository = require('./ProfileRepository');
import dtpService = require('./DTPService');
import ISettings from './Settings.interface';
import SettingsController = require('./SettingsController');
import SubjectService = require('./SubjectService')
import PackageBuilder = require('./PackageBuilder');
import TwitterService = require('./TwitterService');
import TrustStrategy = require('./TrustStrategy')
import DTPService = require('./DTPService');
import { QueryRequest, QueryContext } from '../lib/dtpapi/model/models';
import BinaryTrustResult = require('./Model/BinaryTrustResult');
import IProfile from './IProfile';
import Profile = require('./Profile');
import Crypto = require('./Crypto');
import DTPIdentity = require('./Model/DTPIdentity');
import bitcoin = require('bitcoinjs-lib');
import bitcoinMessage = require('bitcoinjs-message');
import SiteManager = require('./SiteManager');
import { TrustGraphPopupClient } from './Shared/TrustGraphPopupClient';

class Twitter {
    OwnerPrefix: string;
    settings: ISettings;
    subjectService: any;
    targets: any[];
    packageBuilder: any;
    dtpService: DTPService;
    twitterService: TwitterService;
    profileRepository: ProfileRepository;
    waiting: boolean;
    profilesToQuery: Array<IProfile> = [];

    controllers = {};
    profileView: ProfileView;
    trustGraphPopupClient: TrustGraphPopupClient;


    constructor(settings, packageBuilder, subjectService, dtpService: DTPService, twitterService, profileRepository: ProfileRepository, trustGraphPopupClient: TrustGraphPopupClient) {

        this.OwnerPrefix = "[#owner_]";
        this.settings = settings;
        this.subjectService = subjectService;
        this.targets = [];
        this.packageBuilder = packageBuilder;
        this.dtpService = dtpService;
        this.twitterService = twitterService;
        this.profileRepository = profileRepository;
        this.trustGraphPopupClient = trustGraphPopupClient;
        this.waiting = false;
        this.profileView = new ProfileView(this.trustGraphPopupClient);

        console.log('twitter class init', this.settings)
    }


    processElement(element: HTMLElement): ProfileController { // Element = dom element
        let deferred = $.Deferred<IProfile>();

        let source = this.createProfile(element);
        let controller = this.getController(source.userId);
        controller.addElement(element);

        controller.updateProfile(source);

        return controller;
    }

    getController(userId: string) : ProfileController {
        let controller = this.controllers[userId] as ProfileController;
        if(!controller) {
            controller = new ProfileController(userId, this.profileView, this.profileRepository, this.dtpService, this.subjectService, this.packageBuilder, "twitter.com");
            controller.updateProfilesCallBack = (profiles) => { return this.updateProfiles(profiles) };
            controller.trustSubmittedCallBack = (result) => { this.trustSubmitted(result); };
            this.controllers[controller.profile.userId] = controller;
        }
        return controller;
    }

    trustSubmitted(result : any) : void {
        this.queryDTP(this.controllers).done((queryContext) => {
            console.log("Trust reload completed");
        });
    }

    createProfile(element: HTMLElement) : IProfile {
        let profile = new Profile({});
        profile.userId = element.attributes["data-user-id"].value;
        profile.screen_name = element.attributes["data-screen-name"].value;
        profile.alias = element.attributes["data-name"].value;
        profile.avatarImage = $(element).find('img.avatar').attr('src');

        // var youFollow = (element.attributes["data-you-follow"].value == "true");
        // Object.defineProperty(profile, 'youFollow', { enumerable: false, value: youFollow, }); // No serialize to json!

        // var followsYou = (element.attributes["data-follows-you"].value == "true");
        // Object.defineProperty(profile, 'followsYou', { enumerable: false, value: youFollow, }); // No serialize to json!

        //console.log('screen_name: ' + profile.screen_name + ' - ' + profile.alias);
        return profile;
    }

    getTweets(): JQLite {
        let tweets = $('.tweet.js-stream-tweet');
        return tweets;
    }

    updateProfiles(profiles: Array<IProfile>): JQueryPromise<Array<IProfile>> {
        let deferred = $.Deferred<Array<IProfile>>();

        this.twitterService.getProfilesDTP(profiles).then((html: string) => {

            this.twitterService.updateProfiles(html, profiles);
            this.profileRepository.setProfiles(profiles);

            deferred.resolve(profiles);
        });

        return deferred.promise();
    }

    queryDTP(controllers: any): JQueryPromise<QueryContext> {
        if(controllers == null || controllers.length == 0)
            return $.Deferred<QueryContext>().resolve(null).promise();

        let profiles = [];
        for(let key in controllers) {
            if (!controllers.hasOwnProperty(key))
                continue;
            let controller = controllers[key] as ProfileController;
            if(controller.profile.userId == "160139307")
                profiles.push(controller.profile);
        }

        return this.dtpService.Query(profiles, window.location.hostname).done((result: QueryContext) => {
            DTP['trace'](JSON.stringify(result, null, 2));

            // Process the result
             let th = new TrustStrategy(this.settings, this.profileRepository);
             th.ProcessResult(result, controllers);

             for(let key in controllers) {
                if (!controllers.hasOwnProperty(key))
                    continue;
                let controller = controllers[key] as ProfileController;

                if(controller.profile.userId == "160139307") {

                    controller.queried = true;
                    if(controller.changed) {
                        controller.renderAll();
                        this.twitterUserAction(controller);
                    }
                }
            }
        });
    }



    tweetDTP(): void {
        let status = 'Digital Trust Protocol #DTP ID:' + Profile.CurrentUser.owner.ID
            + ' \rProof:' + Profile.CurrentUser.owner.Proof
            + ' \rUserID:' + Profile.CurrentUser.userId;
        let data = {
            batch_mode: 'off',
            is_permalink_page: false,
            place_id: !0,
            status: status
        };

        this.twitterService.sendTweet(data).then((result) => {
            ProfileView.showMessage("DTP tweet created");
        });
    }


    twitterUserAction(controller: ProfileController) {
        if (!controller.trustResult || controller.trustResult.state == 0) {
            this.displayAll(controller);
            return;
        }
            

        if (controller.domElements.length == 0)
            return;


        // if (location.href.indexOf(controller.profile.screen_name) >= 0)
        //     return; // Ignore the profile page for now

        if (controller.trustResult.state > 0) {
            if (this.settings.twittertrust == "autofollow") {
                this.follow(controller);
            }

            this.displayAll(controller);

            return;
        }


        if (controller.trustResult.state < 0) {

            let $selectedTweet = $(controller.domElements[0]);

            if (this.settings.twitterdistrust == "hidecontent") {
                for(let key in controller.domElements) {
                    let element = controller.domElements[key];
                    let $element = $(element);
                    $element.find('.js-tweet-text-container').hide();
                    $element.find('.QuoteTweet-container').hide();
                    $element.find('.AdaptiveMediaOuterContainer').hide();
                    $element.find('.card2').hide();
                }
            }

            if (this.settings.twitterdistrust == "automute") {
                $selectedTweet.find("li.mute-user-item").trigger("click");
            }

            if (this.settings.twitterdistrust == "autoblock") {
                $selectedTweet.find("li.block-link").trigger("click");
                $("body").removeClass("modal-enabled");
                $(document).find("#block-dialog").hide();
                $(document).find("button.block-button").trigger("click");
                $(document).find("span.Icon--close").trigger("click");
            }
        }
    }

    private displayAll(controller: ProfileController) {
        for(let key in controller.domElements) {
            let element = controller.domElements[key];
            let $element = $(element);
            $element.find('.js-tweet-text-container').show();
            $element.find('.QuoteTweet-container').show();
            $element.find('.AdaptiveMediaOuterContainer').show();
            $element.find('.card2').show();
        }
    }

    private follow(controller: ProfileController) : void {
        DTP['trace']("Follow " + controller.profile.screen_name);
        if (controller.domElements.length == 0)
            return;

        let $selectedTweet = $(controller.domElements[0]);

        let follow = $selectedTweet.data("you-follow");
        if (follow || controller.following)
            return;

        var $button = controller.view.createFollowButton($selectedTweet, controller.profile);
        $button.click();
    }


    loadCurrentUserProfile(user: any): JQueryPromise<void> {
        return this.profileRepository.ensureProfile(user.userId).then(profile => {
            Profile.CurrentUser = profile;
            Profile.CurrentUser.update(user);
            Profile.CurrentUser.avatarImage = $('img.DashboardProfileCard-avatarImage').attr('src');

            if (Profile.CurrentUser.owner == null)
                this.updateProfiles([Profile.CurrentUser]);

            Profile.CurrentUser.owner = new DTPIdentity({ ID: this.settings.address, Proof: Crypto.Sign(this.settings.keyPair, user.userId).toString('base64') });
            console.log(Crypto.Verify(Profile.CurrentUser.owner, user.userId));
        }).promise();
    }

    loadPage() : JQueryPromise<{}> {
        let deferred = $.Deferred();

        SiteManager.GetUserContext().then((userContext) => {
            this.loadCurrentUserProfile(userContext).then(() => {
                let controllers = {};
                let tweets = this.getTweets();

                tweets.each((i: number, element: HTMLElement) => {
                    let controller = this.processElement(element);
                    if(!controller.queried)
                        controllers[controller.profile.userId] = controller;
                });

                ProfileView.createTweetDTPButton();

                deferred.resolve(controllers);
            });
        });


        return deferred.promise();
    }

    attatchNodeInserted(doc : Document) : void {
        $(doc).on('DOMNodeInserted', (e: JQueryEventObject) => {
            let controllers = [];
            let self = this;

            let classObj = e.target["attributes"]['class'];
            if (!classObj)
                return;

            let permaTweets = $(e.target).find('.tweet.permalink-tweet');
            permaTweets.each((i: number, element: HTMLElement) => {
                let controller = self.processElement(element);
                if(!controller.trustResult)
                    controllers[controller.profile.userId] = controller;
                else
                    controller.render();
            });

            let tweets = $(e.target).find('.tweet.js-stream-tweet');
            tweets.each((i: number, element: HTMLElement) => {
                let controller = self.processElement(element);
                if(!controller.trustResult)
                    controllers[controller.profile.userId] = controller;
                else
                    controller.render();
            });

            self.queryDTP(controllers).then(() => {
                //deferred.resolve();
            });
        });
    }

    ready(doc: Document): JQueryPromise<void> {
        return this.loadPage().then((controllers) => {
            this.queryDTP(controllers).done((queryContext) => {
                console.log("Page load completed");
            });
            this.attatchNodeInserted(doc);

            $(doc).on('click', '.tweet-dtp', (event) => {
                this.tweetDTP();
            });
        });
    }
}
export = Twitter;