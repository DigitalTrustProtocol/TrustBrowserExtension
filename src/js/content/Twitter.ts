import ProfileController = require('../ProfileController');
import TwitterProfileView = require('./TwitterProfileView');
import ProfileRepository = require('../ProfileRepository');
import dtpService = require('../DTPService');
import ISettings from '../Interfaces/Settings.interface';
import SubjectService = require('../SubjectService')
import PackageBuilder = require('../PackageBuilder');
//import TwitterService = require('./TwitterService');
import TrustStrategy = require('../TrustStrategy')
import DTPService = require('../DTPService');
import { QueryRequest, QueryContext, Claim } from '../../lib/dtpapi/model/models';
import BinaryTrustResult = require('../Model/BinaryTrustResult');
import IProfile from '../IProfile';
import Profile = require('../Profile');
import Crypto = require('../Crypto');
import DTPIdentity = require('../Model/DTPIdentity');
import bitcoin = require('bitcoinjs-lib');
import bitcoinMessage = require('bitcoinjs-message');
import SiteManager = require('../SiteManager');
import { TrustGraphPopupClient } from '../Shared/TrustGraphPopupClient';
import * as $ from 'jquery';
import { Runtime } from 'webextension-polyfill-ts';
import { MessageHandler, CallbacksMap } from '../Shared/MessageHandler';
import ITrustStrategy from '../Interfaces/ITrustStrategy';
import TrustGraphDataAdapter = require('./TrustGraphDataAdapter');

class Twitter {
    OwnerPrefix: string;
    settings: ISettings;
    subjectService: any;
    targets: any[];
    packageBuilder: any;
    dtpService: DTPService;
    profileRepository: ProfileRepository;
    waiting: boolean;
    profilesToQuery: Array<IProfile> = [];

    controllers = {};
    profileView: TwitterProfileView;
    trustGraphPopupClient: TrustGraphPopupClient;

    public static handlerName: string = "TwitterService";

    public BaseUrl = 'https://twitter.com';

    private messageHandler: MessageHandler;
    private methods: CallbacksMap = {};
    private trustStrategy: ITrustStrategy;



    constructor(settings, packageBuilder, subjectService, dtpService: DTPService, profileRepository: ProfileRepository, trustGraphPopupClient: TrustGraphPopupClient, messageHandler : MessageHandler, trustStrategy: ITrustStrategy) {

        this.OwnerPrefix = "[#owner_]";
        this.settings = settings;
        this.subjectService = subjectService;
        this.targets = [];
        this.packageBuilder = packageBuilder;
        this.dtpService = dtpService;
        this.profileRepository = profileRepository;
        this.trustGraphPopupClient = trustGraphPopupClient;
        this.waiting = false;
        this.profileView = new TwitterProfileView(this.trustGraphPopupClient, settings, Twitter.handlerName);
        this.messageHandler = messageHandler;
        this.trustStrategy = trustStrategy;

        this.methods["getGraphData"] = (params, sender) => { return this.getGraphData(params, sender); }
        this.methods["getProfile"] = (params, sender) => { return this.getProfile(params, sender); }
        this.methods["getProfileDTP"] = (params, sender) => { return this.getProfileDTP(params, sender); }
        this.messageHandler.receive(Twitter.handlerName, (params: any, sender: Runtime.MessageSender) => {
            let method = this.methods[params.action];
            if(method)
                return method(params, sender);
        });

        console.log('twitter class init', this.settings)
    }

    public getGraphData(params: any, sender: Runtime.MessageSender) : JQueryPromise<any> {

        return this.profileRepository.getProfile(params.userId).then(profile => {

            let controller = this.controllers[profile.userId] as ProfileController;
            let claims = controller.trustResult.queryContext.results.claims;
            let claimCollections = this.trustStrategy.ProcessClaims(claims);

            let profiles: object = {};
            let trustResults = this.buildGraph(profile, profile.userId, controller.trustResult, profiles, {}, claimCollections);

            //let adapter = new TrustGraphDataAdapter(this.trustStrategy, this.controllers);
            //adapter.build(trustResult.claims, profile, Profile.CurrentUser);

            let dialogData = {
                scope: "twitter.com",
                currentUser: Profile.CurrentUser,
                subjectProfileId: profile.userId,
                profiles: profiles,
                trustResults: trustResults
            };
            return dialogData;
        });
    }

    private buildGraph(profile: IProfile, id: string, trustResult: BinaryTrustResult, profiles: any, trustResults: any, claimCollections: any) : Object {
        if(profiles[id])
            return; // Exist, then it has been processed.

        profiles[id] = profile;

        if(!trustResult)
            return trustResults;
            
        trustResults[id] = trustResult;
        
        for(let key in trustResult.claims) {
            let claim = trustResult.claims[key] as Claim;

            // Get a profile from the Issuer ID, as only profiles with a DTP id can be retrived.
            // The profile may not be in index, but in DB, but it will be up to the popup window to handle this.
            let parentProfile = this.profileRepository.index[claim.issuer.id] as IProfile;
            if(!parentProfile) { // Do profile exist?
                parentProfile = new Profile({userId: "?", screen_name: "Unknown", alias: "Unknown"}) as IProfile;
                parentProfile.owner = new DTPIdentity({ ID: claim.issuer.id });
            }
            let parentTrustResult = claimCollections[parentProfile.owner.ID] as BinaryTrustResult; 

            this.buildGraph(parentProfile, parentProfile.owner.ID, parentTrustResult, profiles, trustResults, claimCollections);
        }
        return trustResults;
    }

    public getProfile(profile: IProfile, sender: Runtime.MessageSender): JQueryPromise<DTPIdentity> {
        let deferred = $.Deferred<DTPIdentity>();
        let url = '/search?f=tweets&q=UserID:' + profile.userId;
        
        if (profile.screen_name) {
            url += '%20from%3A' + profile.screen_name;
        }
        url += '&src=typd';

        this.getData(url, 'html').then((html: string) => {

            let result = this.extractDTP(html);

            deferred.resolve(result);
        }).fail((error) => deferred.fail(error));

        return deferred.promise();
    }


    getProfileDTP(profile: IProfile, sender: Runtime.MessageSender): JQueryPromise<DTPIdentity> {
        let deferred = $.Deferred<DTPIdentity>();
        let url = '/search?f=tweets&q=%23DTP%20ID%20Proof%20UserID:' + profile.userId
        // /search?l=&q=%23DTP%20ID%20Proof%20UserID%3A22551796%20OR%20UserID%3A1002660175277363200&src=typd
        if (profile.screen_name) {
            url += '%20from%3A' + profile.screen_name;
        }
        url += '&src=typd';

        this.getData(url, 'html').then((html: string) => {

            //let $body = $(html);
            //let tweets = $body.find(null)
            let result = this.extractDTP(html);

            deferred.resolve(result);
        }).fail((error) => deferred.fail(error));

        return deferred.promise();
    }

    getProfilesDTP(profiles : Array<IProfile>) : JQueryPromise<string>
    {
        let deferred = $.Deferred<string>();

        let userIds = profiles.map((profile)=>{ return 'UserID%3A'+profile.userId;});
        let froms = profiles.map((profile)=>{ return profile.screen_name;});
        let path = '/search?f=tweets&q=ID%20Proof%20'+ userIds.join('%20OR%20') +'%20%23DTP%20' + froms.join('%20OR%20') +'&src=typd';

        this.getData(path, 'html').then((html: string) => {
            deferred.resolve(html);
        }).fail((error) => deferred.fail(error));

        return deferred.promise();
    }

    updateProfilesFromHtml(html: string, profiles : Array<IProfile>) : number {
        let $document = $(html);
        let count = 0;

        profiles.forEach((profile) => {
            let $tweets = $document.find('div.tweet[data-user-id="'+ profile.userId +'"]')
            let done = false;

            $tweets.each((index, element) => {
                if(done)
                    return;

                let $tweet = $(element);

                let owner = this.extractDTP($tweet.html());
                if(owner.PlatformID != profile.userId) {
                    console.log("Invalid userID in tweet!");
                    return;
                }

                try {
                    if(Crypto.Verify(owner, profile.userId)) {
                        if(profile.owner && profile.owner.ID != owner.ID)  
                        {
                            console.log("DTP Owner is not the same as tweeted")
                            return;
                        }
                        profile.owner = owner;
                        profile.avatarImage = $tweet.find('img.avatar').attr('src');
                        count ++;
                        done= true;
                    }
                } catch(error) {
                    DTP['trace'](error); // Catch it if Crypto.Verify fails!
                }
            });
        });

        return count;
    }
    


    extractDTP(html: any): DTPIdentity {
        let content = html.findSubstring('<div class="js-tweet-text-container">', '</div>');
        if (content == null) {
            return null;
        }

        let text = $(content).text();
        text = text.replace(/(?:\r\n|\r|\n)/g, ' ').trim();

        if (text.length === 0) {
            return null;
        }

        let id = text['findSubstring']('ID:', ' ', true, true);
        let proof = text['findSubstring']('Proof:', ' ', true, true);
        let userId = text['findSubstring']('UserID:', ' ', true, true);

        return new DTPIdentity({ ID: id, Proof: proof, PlatformID: userId });
    }

    getData(path: string, dataType: any): JQueryPromise<any> {
        let deferred = $.Deferred<any>();

        let url = this.BaseUrl + path;
        dataType = dataType || "json";

        $.ajax({
            type: "GET",
            url: url,
            headers: {
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'x-twitter-active-user': 'yes'
            },
            dataType: dataType,
        }).done((data, textStatus, jqXHR) => {
            deferred.resolve(data);
        }).fail((jqXHR, textStatus, errorThrown) => {
            this.errorHandler(jqXHR, textStatus, errorThrown);
            deferred.reject();
        });
        return deferred.promise();
    }


    sendTweet(data: any): JQueryPromise<any> {
        return this.postData('/i/tweet/create', data);
    }

    postData(path: string, data: any): JQueryPromise<any> {
        var deferred = $.Deferred<any>();

        let url = this.BaseUrl + path;
        //let postData = 'authenticity_token=' + DTP.Profile.CurrentUser.formAuthenticityToken + '&' + data;
        data.authenticity_token = Profile.CurrentUser.formAuthenticityToken;

        $.ajax({
            type: "POST",
            url: url,
            data: data,
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
            headers: {
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'x-twitter-active-user': 'yes'
            },
            dataType: 'json',
        }).done((msg, textStatus, jqXHR) => {
            deferred.resolve(msg);
        }).fail((jqXHR, textStatus, errorThrown) => {
            this.errorHandler(jqXHR, textStatus, errorThrown);
            deferred.reject();
        });
        return deferred.promise();
    }

    errorHandler(jqXHR, textStatus, errorThrown) {
        if (jqXHR.status == 404 || errorThrown == 'Not Found') {
            let msg = 'Error 404: Server was not found.';
            TwitterProfileView.showMessage(msg);
        }
        else {
            let msg: string = textStatus + " : " + errorThrown;
            if (jqXHR.responseJSON.ExceptionMessage) {
                msg = JSON.stringify(jqXHR.responseJSON.ExceptionMessage, null, 2);
            } else if (jqXHR.responseJSON.message) {
                msg = JSON.stringify(jqXHR.responseJSON.message, null, 2);
            }
            TwitterProfileView.showMessage(msg);
        }
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

        this.getProfilesDTP(profiles).then((html: string) => {

            this.updateProfilesFromHtml(html, profiles);
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
            // if(controller.profile.userId == "160139307")
            profiles.push(controller.profile);
        }

        return this.dtpService.Query(profiles, window.location.hostname).done((result: QueryContext) => {
            DTP['trace'](JSON.stringify(result, null, 2));

            // Process the result
             this.trustStrategy.ProcessResult(result, controllers);

             for(let key in controllers) {
                if (!controllers.hasOwnProperty(key))
                    continue;
                let controller = controllers[key] as ProfileController;

                controller.queried = true;
                controller.render();
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

        this.sendTweet(data).then((result) => {
            TwitterProfileView.showMessage("DTP tweet created");
        });
    }


    loadCurrentUserProfile(user: any): JQueryPromise<void> {
        return this.profileRepository.ensureProfile(user.userId).then(profile => {
            Profile.CurrentUser = profile;
            Profile.CurrentUser.update(user);
            Profile.CurrentUser.avatarImage = $('img.DashboardProfileCard-avatarImage').attr('src');

            if (Profile.CurrentUser.owner == null)
                this.updateProfiles([Profile.CurrentUser]);

            Profile.CurrentUser.owner = new DTPIdentity({ ID: this.settings.address, Proof: Crypto.Sign(this.settings.keyPair, user.userId).toString('base64') });
            
            this.profileRepository.setProfile(Profile.CurrentUser); // Save the profile, locally and in DB

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

                TwitterProfileView.createTweetDTPButton();

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