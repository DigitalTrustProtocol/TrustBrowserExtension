import ProfileController = require('../ProfileController');
import TwitterProfileView = require('./TwitterProfileView');
import ProfileRepository = require('../ProfileRepository');
import dtpService = require('../DTPService');
import ISettings from '../Interfaces/Settings.interface';
import SubjectService = require('../SubjectService')
import PackageBuilder = require('../PackageBuilder');
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
import { MessageHandler, CallbacksMap } from '../Shared/MessageHandler';
import ITrustStrategy from '../Interfaces/ITrustStrategy';
import TrustGraphDataAdapter = require('./TrustGraphDataAdapter');
import { DtpGraphCoreModelQueryContext } from '../../lib/typescript-jquery-client/model/models';
import { IdentityPopupClient } from '../Shared/IdentityPopupClient';
import IGraphData from './IGraphData';
import { browser, Runtime, Bookmarks } from "webextension-polyfill-ts";

// Array.prototype.wait = function(arr: JQueryPromise[]) {

// }

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

    wait: boolean;

    public static handlerName: string = "TwitterService";

    public BaseUrl = 'https://twitter.com';

    private messageHandler: MessageHandler;
    private methods: CallbacksMap = {};
    private trustStrategy: ITrustStrategy;
    private identityPopup: IdentityPopupClient;



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
        this.profileView = new TwitterProfileView(settings);
        this.messageHandler = messageHandler;
        this.identityPopup = new IdentityPopupClient(messageHandler);
        this.trustStrategy = trustStrategy;

        this.methods["getProfile"] = (params, sender) => { return this.getProfile(params, sender); }
        this.methods["getProfileDTP"] = (params, sender) => { return this.getProfileDTP(params, sender); }
        this.messageHandler.receive(Twitter.handlerName, (params: any, sender: Runtime.MessageSender) => {
            let method = this.methods[params.action];
            if(method)
                return method(params, sender);
        });

        console.log('twitter class init', this.settings)
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

    processElement(element: HTMLElement): JQueryPromise<ProfileController> { // Element = dom element
        let elementProfile = this.createProfile(element) as IProfile;

        return this.profileRepository.getProfile(elementProfile.userId).then<ProfileController>(loadedProfile => {
            let profile = (!loadedProfile) ? elementProfile : loadedProfile; // Make sure we have the a profile
            profile.update(elementProfile); // Ensure to update the profile

            let controller = this.getController(profile);
            controller.addElement(element);

            return controller;
        });
    }



    getController(profile: IProfile) : ProfileController {
        let controller = this.controllers[profile.userId] as ProfileController;
        if(!controller) {
            controller = new ProfileController(profile, this.profileView, this.profileRepository, this.dtpService, this.subjectService, this.packageBuilder, this.trustGraphPopupClient, "twitter.com");
            controller.updateProfilesCallBack = (profiles) => { return this.updateProfiles(profiles) };
            controller.trustSubmittedCallBack = (result) => { this.trustSubmitted(result); };
            this.controllers[controller.profile.userId] = controller;
        } 
        return controller;
    }

    trustSubmitted(result : any) : void {
        let arr = Object.keys(this.controllers).map((v) => this.controllers[v]);
        this.queryDTP(arr).done((queryContext) => {
            console.log("Trust reload completed");
        });
    }

    createProfile(element: HTMLElement) : IProfile {
        let profile = new Profile({});
        profile.userId = element.attributes["data-user-id"].value;
        profile.screen_name = element.attributes["data-screen-name"].value;
        profile.alias = element.attributes["data-name"].value;
        profile.avatarImage = $(element).find('img.avatar').attr('src');

        var youFollow = (element.attributes["data-you-follow"].value == "true");
        Object.defineProperty(profile, 'youFollow', { enumerable: false, value: youFollow, }); // No serialize to json!
        Object.defineProperty(profile, 'youMute', { enumerable: false, value: false, }); // No serialize to json!
        Object.defineProperty(profile, 'youBlock', { enumerable: false, value: false, }); // No serialize to json!

        var followsYou = (element.attributes["data-follows-you"].value == "true");
        Object.defineProperty(profile, 'followsYou', { enumerable: false, value: youFollow, }); // No serialize to json!

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

    queryDTP(controllers: ProfileController[]): JQueryPromise<{ response: JQueryXHR; body: DtpGraphCoreModelQueryContext; }> {
        if(controllers == null || controllers.length == 0)
            return $.Deferred<{ response: JQueryXHR; body: DtpGraphCoreModelQueryContext; }>().resolve(null).promise();

        let profiles = [];
        for(let key in controllers) {
            if (!controllers.hasOwnProperty(key))
                continue;
            let controller = controllers[key] as ProfileController;
            // if(controller.profile.userId == "160139307")
            profiles.push(controller.profile);
        }

        return this.dtpService.Query(profiles, window.location.hostname).done((response, result) => {
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

    tweetDTP(): string {
        let status = 'Digital Trust Protocol #DTP ID:' + Profile.CurrentUser.owner.ID
            + ' \rProof:' + Profile.CurrentUser.owner.Proof
            + ' \rUserID:' + Profile.CurrentUser.userId;
        return status;
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

    loadPage() : JQueryPromise<ProfileController[]> {
        let deferred = $.Deferred();

        SiteManager.GetUserContext().then((userContext) => {
            this.loadCurrentUserProfile(userContext).then(() => {

                let tweets = this.getTweets().get();
                this.loadControllers(tweets).then(deferred.resolve);

                TwitterProfileView.createTweetDTPButton(this.tweetDTP());

            });
        });

        return deferred.promise();
    }

    attachNodeInserted(doc : Document) : void {
        let wait = false;
        let self = this;
        let elements = [];

        $(doc).on('DOMNodeInserted', (e: JQueryEventObject) => {
            //console.log(e.target.nodeName+' : ' +  $(e.target).attr('class'));

            if(e.target.nodeName.toLocaleUpperCase() == "TITLE") {
                console.log(e.target.nodeName+' : ' +  $(e.target).text());
                
            }
               
            let classObj = e.target["attributes"]['class'];
            if (!classObj)
                return;

            let tweets = $(e.target).find('.tweet.js-stream-tweet, .tweet.permalink-tweet').get();
            if(tweets.length == 0)
                return;

            Array.prototype.push.apply(elements, tweets);

            // Process controllers, but wait a little time before calling server, 
            // this is to batch into fewer calls
            if(!wait) { 
                wait = true;

                setTimeout(() => {

                    let temp = elements; 
                    elements = []; // Reset for new controllers added when calling the DTP server 

                    this.loadControllers(temp).then(controllers => {
                        let query = [];
                        for(let c of controllers)
                            if(!c.queried)
                                query.push(c);
                            else
                                c.render();
        
                        if(query.length == 0) {
                            wait = false;
                            return ;
                        }

                        console.log("Batch call - controllers: "+Object.keys(temp).length)
                        self.queryDTP(query).then(() => {
                            wait = false;
                        });
                    });
                }, 100);
            }                        





        });
    }


    loadControllers(tweets: HTMLElement[]) : JQueryPromise<ProfileController[]> {
        let controllers = [];
        let promises : Array<JQueryPromise<ProfileController>> = [];
        for(let element of tweets)
            promises.push(this.processElement(element));
        
        return $.when.apply(self, promises).then(function() {
            let length = arguments.length;
            for (let i=0; i < length; i++) {
                controllers.push(arguments[i] as ProfileController);
            }

            return controllers;
        });
    }

    updateContentHandler(params, sender) : void {
        let controller = this.getController(params.profile);
        this.queryDTP([controller]).then(()=>{
        });
    }

    public requestSubjectHandler(params: any, sender: Runtime.MessageSender) : JQueryPromise<IGraphData> {

        return this.profileRepository.getProfile(params.profileId).then(profile => {

            let controller = this.controllers[profile.userId] as ProfileController;

            let claims = (controller.trustResult && controller.trustResult.queryContext && controller.trustResult.queryContext.results) ? controller.trustResult.queryContext.results.claims : [];
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
            } as IGraphData;

            return dialogData;
        });
    }


    ready(doc: Document): JQueryPromise<void> {
        return this.loadPage().then((controllers) => {
            this.queryDTP(controllers).done((queryContext) => {
                console.log("Page load completed");
            });
            this.attachNodeInserted(doc);

            // Bind events
            this.trustGraphPopupClient.updateContentHandler = (params, sender) => { this.updateContentHandler(params, sender); };
            this.trustGraphPopupClient.requestSubjectHandler = (params, sender) => { return this.requestSubjectHandler(params, sender); };

            $(doc).on('click', '.tweet-dtp', (event) => {
                this.tweetDTP();
            });
        });
    }
}
export = Twitter;