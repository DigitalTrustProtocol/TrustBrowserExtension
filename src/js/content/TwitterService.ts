// import TwitterProfileView = require('./TwitterProfileView');
// import DTPIdentity = require('../Model/DTPIdentity');
// import IProfile from '../IProfile';
// import Crypto = require('../Crypto');
// import Profile = require('../Profile');
// import { MessageHandler, CallbacksMap } from '../Shared/MessageHandler';
// import { Runtime } from 'webextension-polyfill-ts';
// import ProfileRepository = require('../ProfileRepository');
// import * as $ from 'jquery';

// class TwitterService {
//     public static handlerName: string = "TwitterService";

//     public BaseUrl = 'https://twitter.com';

//     private messageHandler: MessageHandler;
//     private methods: CallbacksMap = {};
//     private profileRepository: ProfileRepository;


//     constructor(messageHandler : MessageHandler, profileRepository: ProfileRepository) {
//         this.messageHandler = messageHandler;
//         this.profileRepository = profileRepository;

//         this.methods["getGraphData"] = (params, sender) => { return this.getGraphData(params, sender); }
//         this.methods["getProfile"] = (params, sender) => { return this.getProfile(params, sender); }
//         this.methods["getProfileDTP"] = (params, sender) => { return this.getProfileDTP(params, sender); }
//         this.messageHandler.receive(TwitterService.handlerName, (params: any, sender: Runtime.MessageSender) => {
//             let method = this.methods[params.action];
//             if(method)
//                 return method(params, sender);
//         });

//     }

//     public getGraphData(params: any, sender: Runtime.MessageSender) : JQueryPromise<any> {

//         return this.profileRepository.getProfile(params.userId).then(profile => {
//             let dialogData = {
//                 scope: "twitter.com",
//                 currentUser: Profile.CurrentUser,
//                 subjectProfile: profile,
//                 trustResult: profile.trustResult
//             };
//             return dialogData;
//         });
//     }

//     public getProfile(profile: IProfile, sender: Runtime.MessageSender): JQueryPromise<DTPIdentity> {
//         let deferred = $.Deferred<DTPIdentity>();
//         let url = '/search?f=tweets&q=UserID:' + profile.userId;
        
//         if (profile.screen_name) {
//             url += '%20from%3A' + profile.screen_name;
//         }
//         url += '&src=typd';

//         this.getData(url, 'html').then((html: string) => {

//             let result = this.extractDTP(html);

//             deferred.resolve(result);
//         }).fail((error) => deferred.fail(error));

//         return deferred.promise();
//     }


//     getProfileDTP(profile: IProfile, sender: Runtime.MessageSender): JQueryPromise<DTPIdentity> {
//         let deferred = $.Deferred<DTPIdentity>();
//         let url = '/search?f=tweets&q=%23DTP%20ID%20Proof%20UserID:' + profile.userId
//         // /search?l=&q=%23DTP%20ID%20Proof%20UserID%3A22551796%20OR%20UserID%3A1002660175277363200&src=typd
//         if (profile.screen_name) {
//             url += '%20from%3A' + profile.screen_name;
//         }
//         url += '&src=typd';

//         this.getData(url, 'html').then((html: string) => {

//             //let $body = $(html);
//             //let tweets = $body.find(null)
//             let result = this.extractDTP(html);

//             deferred.resolve(result);
//         }).fail((error) => deferred.fail(error));

//         return deferred.promise();
//     }

//     getProfilesDTP(profiles : Array<IProfile>) : JQueryPromise<string>
//     {
//         let deferred = $.Deferred<string>();

//         let userIds = profiles.map((profile)=>{ return 'UserID%3A'+profile.userId;});
//         let froms = profiles.map((profile)=>{ return profile.screen_name;});
//         let path = '/search?f=tweets&q=ID%20Proof%20'+ userIds.join('%20OR%20') +'%20%23DTP%20' + froms.join('%20OR%20') +'&src=typd';

//         this.getData(path, 'html').then((html: string) => {
//             deferred.resolve(html);
//         }).fail((error) => deferred.fail(error));

//         return deferred.promise();
//     }

//     updateProfiles(html: string, profiles : Array<IProfile>) : number {
//         let $document = $(html);
//         let count = 0;

//         profiles.forEach((profile) => {
//             let $tweets = $document.find('div.tweet[data-user-id="'+ profile.userId +'"]')
//             let done = false;

//             $tweets.each((index, element) => {
//                 if(done)
//                     return;

//                 let $tweet = $(element);

//                 let owner = this.extractDTP($tweet.html());
//                 if(owner.PlatformID != profile.userId) {
//                     console.log("Invalid userID in tweet!");
//                     return;
//                 }

//                 try {
//                     if(Crypto.Verify(owner, profile.userId)) {
//                         if(profile.owner && profile.owner.ID != owner.ID)  
//                         {
//                             console.log("DTP Owner is not the same as tweeted")
//                             return;
//                         }
//                         profile.owner = owner;
//                         profile.avatarImage = $tweet.find('img.avatar').attr('src');
//                         count ++;
//                         done= true;
//                     }
//                 } catch(error) {
//                     DTP['trace'](error); // Catch it if Crypto.Verify fails!
//                 }
//             });
//         });

//         return count;
//     }
    


//     extractDTP(html: any): DTPIdentity {
//         let content = html.findSubstring('<div class="js-tweet-text-container">', '</div>');
//         if (content == null) {
//             return null;
//         }

//         let text = $(content).text();
//         text = text.replace(/(?:\r\n|\r|\n)/g, ' ').trim();

//         if (text.length === 0) {
//             return null;
//         }

//         let id = text['findSubstring']('ID:', ' ', true, true);
//         let proof = text['findSubstring']('Proof:', ' ', true, true);
//         let userId = text['findSubstring']('UserID:', ' ', true, true);

//         return new DTPIdentity({ ID: id, Proof: proof, PlatformID: userId });
//     }

//     getData(path: string, dataType: any): JQueryPromise<any> {
//         let deferred = $.Deferred<any>();

//         let url = this.BaseUrl + path;
//         dataType = dataType || "json";

//         $.ajax({
//             type: "GET",
//             url: url,
//             headers: {
//                 'accept': 'application/json, text/javascript, */*; q=0.01',
//                 'X-Requested-With': 'XMLHttpRequest',
//                 'x-twitter-active-user': 'yes'
//             },
//             dataType: dataType,
//         }).done((data, textStatus, jqXHR) => {
//             deferred.resolve(data);
//         }).fail((jqXHR, textStatus, errorThrown) => {
//             this.errorHandler(jqXHR, textStatus, errorThrown);
//             deferred.reject();
//         });
//         return deferred.promise();
//     }


//     sendTweet(data: any): JQueryPromise<any> {
//         return this.postData('/i/tweet/create', data);
//     }

//     postData(path: string, data: any): JQueryPromise<any> {
//         var deferred = $.Deferred<any>();

//         let url = this.BaseUrl + path;
//         //let postData = 'authenticity_token=' + DTP.Profile.CurrentUser.formAuthenticityToken + '&' + data;
//         data.authenticity_token = Profile.CurrentUser.formAuthenticityToken;

//         $.ajax({
//             type: "POST",
//             url: url,
//             data: data,
//             contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
//             headers: {
//                 'accept': 'application/json, text/javascript, */*; q=0.01',
//                 'X-Requested-With': 'XMLHttpRequest',
//                 'x-twitter-active-user': 'yes'
//             },
//             dataType: 'json',
//         }).done((msg, textStatus, jqXHR) => {
//             deferred.resolve(msg);
//         }).fail((jqXHR, textStatus, errorThrown) => {
//             this.errorHandler(jqXHR, textStatus, errorThrown);
//             deferred.reject();
//         });
//         return deferred.promise();
//     }

//     errorHandler(jqXHR, textStatus, errorThrown) {
//         if (jqXHR.status == 404 || errorThrown == 'Not Found') {
//             let msg = 'Error 404: Server was not found.';
//             TwitterProfileView.showMessage(msg);
//         }
//         else {
//             let msg: string = textStatus + " : " + errorThrown;
//             if (jqXHR.responseJSON.ExceptionMessage) {
//                 msg = JSON.stringify(jqXHR.responseJSON.ExceptionMessage, null, 2);
//             } else if (jqXHR.responseJSON.message) {
//                 msg = JSON.stringify(jqXHR.responseJSON.message, null, 2);
//             }
//             TwitterProfileView.showMessage(msg);
//         }
//     }


// }
// export = TwitterService