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
import  TrustHandler = require('./TrustHandler')
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
       profileRepository: any;
       waiting: boolean;
       profilesToQuery: {};
       sessionProfiles: {};
       Profile: any;
       DTPProfileController: {};

        constructor(settings, packageBuilder, subjectService, dtpService: DTPService, twitterService, profileRepository) {
           
            this.OwnerPrefix = "[#owner_]";
            this.settings = settings;
            this.subjectService = subjectService;
            this.targets = [];
            this.packageBuilder = packageBuilder;
            this.dtpService = dtpService;
            this.twitterService = twitterService;
            this.profileRepository = profileRepository;
  
            this.waiting = false;
            this.profilesToQuery= {};
            this.sessionProfiles = {};
            this.DTPProfileController = {};
            //let profileView = new ProfileView();
            //this.Profile = {}
            console.log('twitter class init',  this.settings)
           
        }
        processElement(element) { // Element = dom element
            let profileView = new ProfileView(null);
             var screen_name = element.attributes["data-screen-name"].value;
           
             let profile = this.profileRepository.ensureProfile( screen_name, profileView);
            profile.alias = element.attributes["data-name"].value;
            
            console.log('screen_name: '+ screen_name + ' - ' + profile.alias);
            //this.DTPProfileController = new ProfileController(profile, this, element)
            ProfileController.addTo(profile, this, element);
            
            this.sessionProfiles[profile.screen_name] = profile; // All the profiles in the current page session
            if(profile.controller.time == 0) { 
                this.profilesToQuery[profile.screen_name] = profile;
            }

            profile.controller.render(element);
        }
        getTweets() {
            let tweets = $('.tweet.js-stream-tweet');
            return tweets;
        }

        queryDTP(profiles): void {
            if(!profiles || Object.keys(profiles).length == 0) {
                return;
            }

            this.dtpService.Query(profiles, window.location.hostname).then((response,result : QueryContext) => {
                DTP['trace'](JSON.stringify(result, null, 2));
                let th = new TrustHandler(result, this.settings);
                th.BuildSubjects();
                
                for (let key in profiles) {
                    if (!profiles.hasOwnProperty(key))
                        continue;
    
                    let profile = profiles[key];
                    profile.controller.queryContext = result;
                    profile.controller.trustHandler = th;
                    profile.controller.time = Date.now();
                    profile.controller.calculateTrust();
                    profile.controller.twitterUserAction();
                    profile.controller.render();
                    profile.controller.save();
                }
            }).fail(() => {

            });
        }

       tweetDTP (): void {
            //const this = this;

            let status = 'Digital Trust Protocol #DTP \rAddress:' +  Profile.Current.owner.address
                         + ' \rSignature:' + Profile.Current.owner.signature.toBase64();
            let data = {
                batch_mode:'off',
                is_permalink_page:false,
                place_id: !0,
                status: status 
            };

            this.twitterService.sendTweet(data).then((result) => {
               // this.Profile.Current.DTP = Profile.Current.DTP || {};
                //this.Profile.Current.DTP.tweet_id = result.tweet_id;
                ProfileView.showMessage("DTP tweet created");
            });
        }

        ready (element): void {
            //const this = this;
            //this.Profile = new Profile( this.screen_name);
            $(element).ready( () =>{

                Profile.LoadCurrent(this.settings, this.profileRepository);

                var tweets = this.getTweets();

                tweets.each((i, element) => {
                    this.processElement(element);
                });

                                
                ProfileController.bindEvents(element, this.profileRepository);
                ProfileView.createTweetDTPButton();

            });

            $(element).on('DOMNodeInserted',  (e) => {
                let classObj = e.target["attributes"]['class'];
                if (!classObj) 
                    return;

                let permaTweets = $(e.target).find('.tweet.permalink-tweet');
                permaTweets.each((i, element) => {
                    this.processElement(element);
                });
                
                let tweets = $(e.target).find('.tweet.js-stream-tweet');
                tweets.each((i, element) => {
                    this.processElement(element);
                });

                if(!this.waiting) {
                    this.waiting = true;
                    setTimeout(() => {
                        DTP['trace']("DOMNodeInserted done!");
                        ProfileView.createTweetDTPButton();

                        this.queryDTP(this.profilesToQuery);
                        this.profilesToQuery = {};
                        this.waiting = false;
                    }, 100);
                }
            });

            $(element).on('click', '.tweet-dtp',  (event) => {
                this.tweetDTP();
            });
        }

        updateContent(): void {
            this.queryDTP(this.sessionProfiles);
        }
}


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
