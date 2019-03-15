declare var Identicon: any;
declare var tce: any;
declare var DTP: any;

import Profile = require('./Profile');
import ProfileController= require('./ProfileController');
import ProfileView = require('./ProfileView');
import ProfileRepository= require('./ProfileRepository');
import dtpService = require('./DTPService');
import ISettings from './Settings.interface';
import SettingsController = require('./SettingsController');
import SubjectService = require('./SubjectService')
import  PackageBuilder = require('./PackageBuilder');
import  TwitterService = require('./TwitterService');
import  TrustStrategy = require('./TrustStrategy')
import DTPService = require('./DTPService');
import { QueryRequest, QueryContext } from '../lib/dtpapi/model/models';
import BinaryTrustResult = require('./Model/BinaryTrustResult');
   
class  Twitter {
       OwnerPrefix: string;
       settings: ISettings;
       subjectService: any;
       targets: any[];
       packageBuilder: any;
       dtpService: DTPService;
       twitterService: any;
       profileRepository: ProfileRepository;
       waiting: boolean;
       profilesToQuery: Array<Profile> = [];

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
            if(!(profile instanceof Profile)) {
                profile = new Profile(userID);
                this.profileRepository.setProfile(profile);
                DTP['trace']('Profile ' + profile.userId + ' created');
            }

            profile.screen_name = element.attributes["data-screen-name"].value;
            profile.alias = element.attributes["data-name"].value;
            profile.biggerImage = $(element).find('img.avatar').attr('src');

            var youFollow =  (element.attributes["data-you-follow"].value == "true");
            Object.defineProperty(profile, 'youFollow', { enumerable: false, value: youFollow,  }); // No serialize to json!

            var followsYou = (element.attributes["data-follows-you"].value == "true");
            Object.defineProperty(profile, 'followsYou', { enumerable: false, value: youFollow,  }); // No serialize to json!
            
            console.log('screen_name: '+ profile.screen_name + ' - ' + profile.alias);

            ProfileController.addTo(profile, this, element);
            
            // Add profile to query on server
            this.profilesToQuery[profile.userId] = profile;
    
            //if(profile.getController().queryContext) // Only render if there is a result!
            //    profile.getController().render(element);
        }

        getTweets() : JQLite {
            let tweets = $('.tweet.js-stream-tweet');
            return tweets;
        }

        queryDTP(profiles: Array<Profile>): void {
            this.dtpService.Query(profiles, window.location.hostname).then((result : QueryContext) => {
                DTP['trace'](JSON.stringify(result, null, 2));

                // Process the result
                let th = new TrustStrategy(this.settings, this.profileRepository);
                th.ProcessResult(result);

                for(let key in profiles) {
                    if (!profiles.hasOwnProperty(key))
                        continue;                               

                    let profile = profiles[key];
                    profile.getController().twitterUserAction();
                    profile.getController().render();
                    //profile.getController().save(); // Why?
                }
            }).fail(() => {
                // TODO: Write a error handler
            });
        }

       tweetDTP (): void {
            let status = 'Digital Trust Protocol #DTP \ID:' +  Profile.Current.owner.ID
                         + ' \rProof:' + Profile.Current.owner.Proof.toBase64();
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

        ready (doc: Document): void {
            $(doc).ready( () =>{

                Profile.LoadCurrent(this.settings, this.profileRepository);

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

    // Update the content when trust changes on the Trustlist.html popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.command === 'updateContent') {
            twitter.updateContent();
        }
    });
    
    twitter.ready(document);
});
