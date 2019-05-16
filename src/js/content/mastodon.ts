import SiteManager = require("../SiteManager");
import PackageBuilder = require("../PackageBuilder");
import SubjectService = require("../SubjectService");
import ProfileRepository = require("../ProfileRepository");
import * as localforage from 'localforage';
import { StorageClient } from "../Shared/StorageClient";
import { TrustGraphPopupClient } from "../Shared/TrustGraphPopupClient";
import SettingsClient = require("../Shared/SettingsClient");
import ISettings from "../Interfaces/Settings.interface";
import DTPService = require("../DTPService");
import TrustStrategy = require("../TrustStrategy");
import IProfile from '../IProfile';
import ProfileController = require('../ProfileController');
import MastodonProfileView = require('./MastodonProfileView');
import dtpService = require('../DTPService');
import { QueryRequest, QueryContext, Claim } from '../../lib/dtpapi/model/models';
import BinaryTrustResult = require('../Model/BinaryTrustResult');
import Profile = require('../Profile');
import Crypto = require('../Crypto');
import DTPIdentity = require('../Model/DTPIdentity');
import bitcoin = require('bitcoinjs-lib');
import bitcoinMessage = require('bitcoinjs-message');
import { MessageHandler, CallbacksMap } from '../Shared/MessageHandler';
import ITrustStrategy from '../Interfaces/ITrustStrategy';
import TrustGraphDataAdapter = require('./TrustGraphDataAdapter');
import { DtpGraphCoreModelQueryContext } from '../../lib/typescript-jquery-client/model/models';
import { IdentityPopupClient } from '../Shared/IdentityPopupClient';
import IGraphData from './IGraphData';
import { browser, Runtime, Bookmarks } from "webextension-polyfill-ts";
import { ProfileStateEnum } from '../Model/ProfileStateEnum';
import * as $ from 'jquery';



class Mastodon {
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
    trustGraphPopupClient: TrustGraphPopupClient;

    wait: boolean = true;
    elementCache = {};
    mastodonContext: any;

    public static handlerName: string = "MastodonService";

    public BaseUrl = 'https://bitcoinhackers.org';

    private messageHandler: MessageHandler;
    private methods: CallbacksMap = {};
    private trustStrategy: ITrustStrategy;
    private identityPopup: IdentityPopupClient;



    constructor(settings: ISettings, packageBuilder: PackageBuilder, subjectService: SubjectService, dtpService: DTPService, profileRepository: ProfileRepository, trustGraphPopupClient: TrustGraphPopupClient, messageHandler : MessageHandler, trustStrategy: ITrustStrategy) {

        this.OwnerPrefix = "[#owner_]";
        this.settings = settings;
        this.subjectService = subjectService;
        this.targets = [];
        this.packageBuilder = packageBuilder;
        this.dtpService = dtpService;
        this.profileRepository = profileRepository;
        this.trustGraphPopupClient = trustGraphPopupClient;
        this.waiting = false;
        this.messageHandler = messageHandler;
        this.identityPopup = new IdentityPopupClient(messageHandler);
        this.trustStrategy = trustStrategy;

        this.methods["getProfile"] = (params, sender) => { return this.getProfile(params, sender); }
        this.methods["getProfileDTP"] = (params, sender) => { return this.getProfileDTP(params, sender); }
        this.messageHandler.receive(Mastodon.handlerName, (params: any, sender: Runtime.MessageSender) => {
            let method = this.methods[params.action];
            if(method)
                return method(params, sender);
        });

        console.log('Mastodon class init', this.settings)
    }

    private async buildGraph(profile: IProfile, id: string, trustResult: BinaryTrustResult, profiles: any, trustResults: any, claimCollections: any) : Promise<Object> {
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
            //let parentProfile = this.profileRepository.index[claim.issuer.id] as IProfile;
            let parentProfile = await this.profileRepository.getProfileByIndex(claim.issuer.id);
            if(!parentProfile) { // Do profile exist?
                parentProfile = new Profile({userId: "?", screen_name: "Unknown", alias: "Unknown"}) as IProfile;
                parentProfile.owner = new DTPIdentity({ ID: claim.issuer.id });
            }
            let parentTrustResult = claimCollections[parentProfile.owner.ID] as BinaryTrustResult; 
            
            await this.buildGraph(parentProfile, parentProfile.owner.ID, parentTrustResult, profiles, trustResults, claimCollections);
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
                let $tweet = $(element);
                const owner = this.getOwner($tweet);
                if(owner == null)
                    return;

                if(owner.PlatformID != profile.userId) {
                    console.log("Invalid userID in tweet!");
                    return;
                }

                DTPIdentity.update(profile, owner);
                const avatarImage = $tweet.find('img.avatar').attr('src');
                profile.updateProperty("avatarImage", avatarImage);
                if(profile.state == ProfileStateEnum.Changed)
                    this.profileRepository.setProfile(profile);
                count ++;
            });
        });

        return count;
    }

    findSubstring(text: string, lower: string, startText: string, endText: string) {
        let start = lower.indexOf(startText);
        if(start < 0)
            return null;
        start += startText.length; // Only return value!
        
        let end = lower.indexOf(endText, start);
        if(end < 0) {
            end = lower.indexOf('\n', start);
            if(end < 0)
                end = lower.length;
        }
   
        return text.substring(start, end);
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

        return this.extractOwner(text);
    }

    extractOwner(text: any): DTPIdentity {
        const lower = text.toLocaleLowerCase();
        if(lower.indexOf('#dtp') < 0) return null; // There has to be a #DTP tag
        const id = this.findSubstring(text, lower, 'id:', ' ');
        if(!id) return null;
        const proof = this.findSubstring(text, lower, 'proof:', ' ');
        if(!proof) return null;
        const userId = this.findSubstring(text, lower, 'userid:', ' ');
        if(!userId) return null;

        const owner = new DTPIdentity({ ID: id, Proof: proof, PlatformID: userId });

        if(!Crypto.Verify(owner, userId))
            return null;

        return owner;
    }

    getOwner($element: JQuery): DTPIdentity {
        const $container = $element.find('.js-tweet-text-container');
        const text = $container.text();
        return this.extractOwner(text);
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
            MastodonProfileView.showMessage(msg);
        }
        else {
            let msg: string = textStatus + " : " + errorThrown;
            if (jqXHR.responseJSON.ExceptionMessage) {
                msg = JSON.stringify(jqXHR.responseJSON.ExceptionMessage, null, 2);
            } else if (jqXHR.responseJSON.message) {
                msg = JSON.stringify(jqXHR.responseJSON.message, null, 2);
            }
            MastodonProfileView.showMessage(msg);
        }
    }

    processElement(element: HTMLElement): JQueryPromise<ProfileController> { // Element = dom element
        let elementProfile = this.createProfile(element) as IProfile;
        if(!elementProfile)
            return null;
            
        return this.profileRepository.getProfile(elementProfile.userId).then<ProfileController>(profile => {
            if(!profile) {
                profile = elementProfile;
                this.profileRepository.setProfile(profile);
            } else {
                if(profile.update(elementProfile))  // Ensure to update the profile
                    this.profileRepository.setProfile(profile);
            }

            let controller = this.getController(profile);
            controller.addElement(element);
            $(element).data("dtp-controller", controller);

            return controller;
        });
    }



    getController(profile: IProfile) : ProfileController {
        let controller = this.controllers[profile.userId] as ProfileController;
        if(!controller) {
            let profileView = new MastodonProfileView(this.settings);

            controller = new ProfileController(profile, profileView, this.profileRepository, this.dtpService, this.subjectService, this.packageBuilder, this.trustGraphPopupClient, "twitter.com");
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
        let status = element.querySelector('a.status__display-name:not(muted)') as HTMLAnchorElement;
        if(!status)
            return null;

        let profile = new Profile({});
        profile.userId = status.href;
        profile.screen_name = status.href.substr(status.href.lastIndexOf("/")+1);
        const aliasElement = status.querySelector('.display-name__html');
        profile.alias = (aliasElement) ? aliasElement.innerHTML : profile.screen_name;
        const divImage = status.querySelector('.account__avatar-overlay-base') as HTMLElement;
        if(divImage) 
            profile.avatarImage = divImage.style.backgroundImage.replace('url("', '').replace('")','');

        var youFollow = false; // (element.attributes["data-you-follow"].value == "true");
        Object.defineProperty(profile, 'youFollow', { enumerable: false, value: youFollow, }); // No serialize to json!
        Object.defineProperty(profile, 'youMute', { enumerable: false, value: false, }); // No serialize to json!
        Object.defineProperty(profile, 'youBlock', { enumerable: false, value: false, }); // No serialize to json!

        var followsYou = false; // (element.attributes["data-follows-you"].value == "true");
        Object.defineProperty(profile, 'followsYou', { enumerable: false, value: youFollow, }); // No serialize to json!

        // const owner = this.getOwner($(element));
        // if(owner) {
        //     if(owner.PlatformID == profile.userId) 
        //         profile.owner = owner;
        // }

        return profile;
    }

    getElements(doc: Document): NodeListOf<HTMLElement> {
        return doc.querySelectorAll("article");
    }

    updateProfiles(profiles: Array<IProfile>): JQueryPromise<Array<IProfile>> {
        return this.getProfilesDTP(profiles).then((html: string) => {
            this.updateProfilesFromHtml(html, profiles);
            return profiles;
        });
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

    private loadControllers(elements: Array<HTMLElement>) : JQueryPromise<ProfileController[]> {
        let controllers = {};

        let promises : Array<JQueryPromise<ProfileController>> = [];
        elements.forEach((element: HTMLElement, key: any, parent: any) => {
            let $element = $(element);
            let controller = $element.data("dtp-controller");
            if(controller)
                controllers[controller.profile.userId] = controller;
            else {
                const promise = this.processElement(element);
                if(promise)
                    promises.push(promise);
            }

        });

        // Wait for all promises
        return $.when.apply($, promises).then(function() {

            let length = arguments.length;
            for (let i=0; i < length; i++) {
                let controller = arguments[i] as ProfileController;
                if(controller)
                    controllers[controller.profile.userId] = controller;
            }

            return Object.keys(controllers).map(function(k) { return controllers[k]; });
        });
    }


    private elements = [];
    
    processElements() : void {
        if(this.wait)
            return;

        this.wait = true; // Now wait for timeout to complete

        setTimeout(() => {

            //let tweets = this.getTweets(); // Get all tweets!
            //let elements = this.getElements(doc);
            console.log("Page Elements loaded: " + this.elements.length);
            const temp = this.elements;
            this.elements = [];

            this.loadControllers(temp).then(controllers => {
                let query = [];
                for(let c of controllers)
                    if(!c.queried)
                        query.push(c);
                    else
                        c.render();

                if(query.length == 0) {
                    this.wait = false;
                    return ;
                }

                this.queryDTP(query).then(() => {
                    this.wait = false;
                });
            });

        }, 200);

    }


    attachNodeInserted(doc : Document) : void {
        $(doc).on('DOMNodeInserted', (e: JQueryEventObject) => {
            if(e.target.nodeName.toLocaleUpperCase() == "TITLE") {
                console.log(e.target.nodeName+' : ' +  $(e.target).text());
            }
            
            if(e.target.nodeName.toLocaleUpperCase() != "ARTICLE")
                return;
            
            let status = e.target.querySelector('a.status__display-name:not(.muted)') as HTMLAnchorElement;
            if(!status)
                 return;

            this.elements.push(e.target);

            this.processElements();
        });
    }

    updateContentHandler(params, sender) : void {
        let controller = this.getController(params.profile);
        this.queryDTP([controller]).then(()=>{
        });
    }

    public async requestSubjectHandler(params: any, sender: Runtime.MessageSender) : Promise<IGraphData> {
        let profile = await this.profileRepository.getProfile(params.profileId);

        // If profile is null?

        let controller = this.controllers[profile.userId] as ProfileController;

        let claims = (controller.trustResult && controller.trustResult.queryContext && controller.trustResult.queryContext.results) ? controller.trustResult.queryContext.results.claims : [];
        let claimCollections = this.trustStrategy.ProcessClaims(claims);

        let profiles: object = {};
        let trustResults = await this.buildGraph(profile, profile.userId, controller.trustResult, profiles, {}, claimCollections);

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


        // return this.profileRepository.getProfile(params.profileId).then(profile => {

        //     // If profile is null?

        //     let controller = this.controllers[profile.userId] as ProfileController;

        //     let claims = (controller.trustResult && controller.trustResult.queryContext && controller.trustResult.queryContext.results) ? controller.trustResult.queryContext.results.claims : [];
        //     let claimCollections = this.trustStrategy.ProcessClaims(claims);

        //     let profiles: object = {};
        //     let trustResults = await this.buildGraph(profile, profile.userId, controller.trustResult, profiles, {}, claimCollections);

        //     //let adapter = new TrustGraphDataAdapter(this.trustStrategy, this.controllers);
        //     //adapter.build(trustResult.claims, profile, Profile.CurrentUser);

        //     let dialogData = {
        //         scope: "twitter.com",
        //         currentUser: Profile.CurrentUser,
        //         subjectProfileId: profile.userId,
        //         profiles: profiles,
        //         trustResults: trustResults
        //     } as IGraphData;

        //     return dialogData;
        // });
    }
    
    loadCurrentUserProfile(context: any): JQueryPromise<void> {
        if(!context) return null;
        if(!context.accounts) return null;
        const account = context.accounts[Object.keys(context.accounts)[0]]; // Can there be more accounts!?

        const user = new Profile(<IProfile>{
            userId: account.url,
            screen_name: account.username,
            alias: account.display_name,
            avatarImage: account.avatar
        });

        return this.profileRepository.ensureProfile(user.userId).then(profile => {
            Profile.CurrentUser = profile;
            Profile.CurrentUser.update(user);

            if (Profile.CurrentUser.owner == null)
                this.updateProfiles([Profile.CurrentUser]);

            Profile.CurrentUser.owner = new DTPIdentity({ ID: this.settings.address, Proof: Crypto.Sign(this.settings.keyPair, user.userId).toString('base64') });
            
            this.profileRepository.setProfile(Profile.CurrentUser); // Save the profile, locally and in DB
        });
    }

    getContext(doc: Document): JQueryPromise<any> {
        let deferred = $.Deferred<any>();
        if (this.mastodonContext)
            deferred.resolve(this.mastodonContext);

        this.mastodonContext = JSON.parse(doc.getElementById('initial-state').innerHTML);
        if (this.mastodonContext) {
            //const user = JSON.parse(initData[0]['value']);

            // const source = {
            //     userId: user.userId,
            //     screen_name: user.screenName,
            //     alias: user.fullName,
            //     formAuthenticityToken: user.formAuthenticityToken,
            //     host: window.location.hostname
            // }
            browser.storage.local.set({ context: this.mastodonContext });
            //this.mastodonContext = initData;
            deferred.resolve(this.mastodonContext);
        } else {
            browser.storage.local.get("context").then((result) => {
                // let context = result.context ||
                //     {
                //         userId: '',
                //         screen_name: '',
                //         alias: '',
                //         formAuthenticityToken: '',
                //         host: ''
                //     }
                this.mastodonContext = result;
                deferred.resolve(this.mastodonContext);
            });
        }
        return deferred.promise();
    }

    loadPage(doc: Document) : JQueryPromise<ProfileController[]> {
        let deferred = $.Deferred<ProfileController[]>();
        this.attachNodeInserted(doc);

        this.getContext(doc).then((context) => {
            this.loadCurrentUserProfile(context).then(() => {

                this.wait = false;
                //let tweets = this.getTweets();
                //console.log("Loaded controllers: "+Object.keys(this.controllers).length);
                //console.log("Page load tweets: "+tweets.length)

                //this.loadControllers(tweets).then(deferred.resolve);
                deferred.resolve(null);
            });
        });

        return deferred.promise();
    }

    ready(doc: Document): void {

         this.loadPage(doc).then((controllers) => {
        //     this.queryDTP(controllers).done((queryContext) => {
        //         console.log("Page load completed");
        //     });
        //     this.attachNodeInserted(doc);

        //     // Bind events
        //     this.trustGraphPopupClient.updateContentHandler = (params, sender) => { this.updateContentHandler(params, sender); };
        //     this.trustGraphPopupClient.requestSubjectHandler = (params, sender) => { return this.requestSubjectHandler(params, sender); };
        });
    }
    
}

$(document).ready( () =>{ 
    // Start application
    let messageHandler = new MessageHandler();
    let storageClient = new StorageClient(messageHandler);
    let trustGraphPopupClient = new TrustGraphPopupClient(messageHandler);

    SiteManager.GetUserContext().then((userContext) => {
        
        const settingsClient = new SettingsClient(messageHandler, userContext);
        settingsClient.loadSettings( (settings: ISettings) => {
            let profileRepository = new ProfileRepository(storageClient);
            let packageBuilder = new PackageBuilder(settings);
            let subjectService = new SubjectService(settings, packageBuilder);
            let dtpService = new DTPService(settings);
            let trustStrategy = new TrustStrategy(settings, profileRepository);

            let mastodon = new Mastodon(settings, packageBuilder, subjectService, dtpService, profileRepository, trustGraphPopupClient, messageHandler, trustStrategy);
            mastodon.ready(document);

        });
    });
});
