declare var DTP: any;

import ProfileController= require('./ProfileController');
import ProfileView = require('./ProfileView');
import ProfileRepository= require('./ProfileRepository');
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
   
class  Twitter {
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
    

        constructor(settings, packageBuilder, subjectService, dtpService: DTPService, twitterService, profileRepository: ProfileRepository) {
           
            this.OwnerPrefix = "[#owner_]";
            this.settings = settings;
            this.subjectService = subjectService;
            this.targets = [];
            this.packageBuilder = packageBuilder;
            this.dtpService = dtpService;
            this.twitterService = twitterService;
            this.profileRepository = profileRepository;
            this.waiting = false;

            console.log('twitter class init',  this.settings)
        }

        processElement(element : HTMLElement) : void { // Element = dom element
            var userID = element.attributes["data-user-id"].value;
        
            let profile = this.profileRepository.ensureProfile(userID);

            profile.screen_name = element.attributes["data-screen-name"].value;
            profile.alias = element.attributes["data-name"].value;
            profile.biggerImage = $(element).find('img.avatar').attr('src');

            var youFollow =  (element.attributes["data-you-follow"].value == "true");
            Object.defineProperty(profile, 'youFollow', { enumerable: false, value: youFollow,  }); // No serialize to json!

            var followsYou = (element.attributes["data-follows-you"].value == "true");
            Object.defineProperty(profile, 'followsYou', { enumerable: false, value: youFollow,  }); // No serialize to json!
            
            console.log('screen_name: '+ profile.screen_name + ' - ' + profile.alias);

            //ProfileController.addTo(profile, this, element);
            if (!profile.controller) {
                profile.controller = new ProfileController(profile, new ProfileView(), this);
            }
            profile.controller.domElements.push(element);

            $(element).data("dtp_profile", profile);
            
            // Add profile to query on server
            this.profilesToQuery[profile.userId] = profile;
    
            //if(profile.controller.queryContext) // Only render if there is a result!
            //    profile.controller.render(element);
        }

        getTweets() : JQLite {
            let tweets = $('.tweet.js-stream-tweet');
            return tweets;
        }

        updateProfiles(profiles: Array<IProfile>) : JQueryPromise<Array<IProfile>> {
            let deferred = $.Deferred<Array<IProfile>>();
    
            this.twitterService.getProfilesDTP(profiles).then((html: string) => {
                
                this.twitterService.updateProfiles(html, profiles);
                this.profileRepository.setProfiles(profiles);
                
                deferred.resolve(profiles);
            });
    
            return deferred.promise();
        }

        queryDTP(profiles: Array<IProfile>): void {
            this.dtpService.Query(profiles, window.location.hostname).then((result : QueryContext) => {
                DTP['trace'](JSON.stringify(result, null, 2));

                // Process the result
                let th = new TrustStrategy(this.settings, this.profileRepository);
                th.ProcessResult(result);

                for(let key in profiles) {
                    if (!profiles.hasOwnProperty(key))
                        continue;                               
                    try {
                        let profile = profiles[key] as IProfile;
                        if(!profile.controller)
                            continue;
                        profile.controller.twitterUserAction();
                        profile.controller.render();
                        
                    } catch (error) {
                        console.log(error);
                    }
                    //profile.controller.save(); // Why?
                }
            }).fail(() => {
                console.log("Error in queryDTP");
                // TODO: Write a error handler
            });
        }

       tweetDTP (): void {
            let status = 'Digital Trust Protocol #DTP ID:' +  Profile.CurrentUser.owner.ID
                         + ' \rProof:' + Profile.CurrentUser.owner.Proof
                         + ' \rUserID:'+ Profile.CurrentUser.userId;
            let data = {
                batch_mode:'off',
                is_permalink_page:false,
                place_id: !0,
                status: status 
            };

            this.twitterService.sendTweet(data).then((result) => {
                ProfileView.showMessage("DTP tweet created");
            });
        }

        loadCurrentUserProfile() : void {
            const initData = $("#init-data")[0];
            const user = JSON.parse(initData['value']);
    
            const source = { 
                userId: user.userId, 
                screen_name: user.screenName,
                alias: user.fullName,
                formAuthenticityToken: user.formAuthenticityToken
            }
    
            Profile.CurrentUser = this.profileRepository.ensureProfile(user.userId) as Profile;
            Profile.CurrentUser.update(source);
            if(Profile.CurrentUser.owner == null) 
               this.updateProfiles([Profile.CurrentUser]);


             Profile.CurrentUser.owner = new DTPIdentity( { ID: this.settings.address, Proof: Crypto.Sign(this.settings.keyPair, user.userId).toString('base64') });
             console.log(Crypto.Verify(Profile.CurrentUser.owner, user.userId));
        }

        ready (doc: Document): void {
            $(doc).ready( () =>{

                this.loadCurrentUserProfile();

                var tweets = this.getTweets();

                tweets.each((i: number, element: HTMLElement) => {
                    this.processElement(element);
                });
                                
                ProfileController.bindEvents(doc, this.profileRepository);
                ProfileView.createTweetDTPButton();

            });

            $(doc).on('DOMNodeInserted',  (e) => {
                let classObj = e.target["attributes"]['class'];
                if (!classObj) 
                    return;

                let permaTweets = $(e.target).find('.tweet.permalink-tweet');
                permaTweets.each((i: number, element: HTMLElement) => {
                    this.processElement(element);
                });
                
                let tweets = $(e.target).find('.tweet.js-stream-tweet');
                tweets.each((i: number, element : HTMLElement) => {
                    this.processElement(element);
                });

                if(!this.waiting) {
                    this.waiting = true;
                    setTimeout(() => {
                        DTP['trace']("DOMNodeInserted done!");
                        ProfileView.createTweetDTPButton();

                        this.queryDTP(this.profilesToQuery);
                        this.profilesToQuery = [];
                        this.waiting = false;
                    }, 100);
                }
            });

            $(doc).on('click', '.tweet-dtp',  (event) => {
                this.tweetDTP();
            });
        }

        updateContent(): void {
            this.queryDTP(this.profileRepository.getSessionProfiles());
        }

        loadProfiles(ids : Array<string>): Array<IProfile> {
            let profiles = ids.map((id) => {  return this.profileRepository.ensureProfile(id); });
            
            this.updateProfiles(profiles);
            
            return profiles;
        }

        addListener() : void {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.command === 'updateContent') {
                    this.updateContent();
                    return;
                }

                if (request.command === 'loadProfiles') {
                    let profiles = this.loadProfiles(request.data.profileIDs);
                    sendResponse({ profiles: profiles });
                    return;
                }

            });
        }

}

// Start application
const settingsController = new SettingsController();
settingsController.loadSettings( (settings: ISettings) =>{
    let packageBuilder = new PackageBuilder(settings);
    let subjectService = new SubjectService(settings, packageBuilder);
    let dtpService = new DTPService(settings);
    let twitterService = new TwitterService(settings);
    let profileRepository = new ProfileRepository(settings, localStorage);

    let twitter = new Twitter(settings, packageBuilder, subjectService, dtpService, twitterService, profileRepository);

    twitter.addListener();
    
    twitter.ready(document);
});
