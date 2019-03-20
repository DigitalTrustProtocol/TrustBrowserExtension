import * as angular from 'angular';
import './common.js';
import SettingsController = require('./SettingsController');
import PackageBuilder = require('./PackageBuilder');
import DTPService = require('./DTPService');
import TrustStrategy = require('./TrustStrategy');
import SubjectService = require('./SubjectService');
import ISettings from './Settings.interface';
import Crypto = require('./Crypto');
import IProfile from './IProfile.js';
import ProfileRepository = require('./ProfileRepository');
import BinaryTrustResult = require('./Model/BinaryTrustResult');
import vis2 = require('vis');
import Profile = require('./Profile.js');
import Identicon = require('identicon.js');


//declare var Identicon: any;
declare var vis: any;

class ExtensionpopupController {

    settingsController: any = new SettingsController();
    settings: ISettings;
    showIcon: boolean = true;

    constructor(private $scope: ng.IScope) {
    }

    init() {
        this.settingsController.loadSettings((items: ISettings) => {
            this.settings = items;

            this.showIcon = (this.settings.identicon || this.settings.identicon.length > 0) ? true : false;

            this.$scope.$apply();

        });
    }
    
    modelChange(state?: string) {
        if (state === 'identicon') {
            var identicon = new Identicon(this.settings.address, { margin: 0.1, size: 64, format: 'svg' }).toString();
            if (identicon.length > 0) {
                this.settings.identicon = "data:image/svg+xml;base64," + identicon.toString();
                this.showIcon = true;
            }
        }

        if (this.settings.rememberme || state === 'rememberme') {
            this.settingsController.saveSettings(this.settings);
        }

        this.settingsController.buildKey(this.settings);
    }

}

class memoryStorage {

    private cache : Array<any> = [];

    setItem(key: string, data: any) {
        this.cache[key] = data;
    }

    getItem(key: string) : any {
        return this.cache[key];
    }
}

class TrustListController {
    showContainer: boolean;
    history: any[];
    settingsController: any;
    settings: any;
    packageBuilder: any;
    subjectService: any;
    dtpService: any;
    contentTabId: number;
    trustHandler: any;
    subject: any;
    binarytrusts: any;
    trusted = [];
    distrusted = [];
    jsonVisible = false;
    defaultScope;
    json;
    trustData: string;
    network: any;
    profileRepository: ProfileRepository;

    //static $inject = [];
    //static $inject = ['$scope'];
    //$apply: any;
    constructor(private $scope: ng.IScope) {

    }

    init() {
        this.showContainer = false
        this.history = []
        this.settingsController = new SettingsController();
        this.settingsController.loadSettings((settings) => {
            this.settings = settings;
            this.profileRepository = new ProfileRepository(this.settings, new memoryStorage());
            this.packageBuilder = new PackageBuilder(settings);
            this.subjectService = new SubjectService(settings, this.packageBuilder);
            this.dtpService = new DTPService(settings);

            this.addListeners();
            this.requestData(null); // Default 
        })

    }

    addListeners() {
        console.log("Adding Listener for calls from the background page.");
        chrome.runtime.onMessage.addListener(
            (request, sender, sendResponse) => {
                console.log("Listener request from background page");
                console.log(request);

                if (request.command == "showTarget") {
                    this.contentTabId = request.contentTabId;

                    this.loadOnData(request.data);

                    if (sendResponse)
                        sendResponse({ result: "ok" });
                }
            });
    }

    requestData(profile: string) {
        console.log("RequestData send to background page");
        chrome.runtime.sendMessage({ command: 'requestData', tabId: this.contentTabId, profile_name: profile }, (response) => {
            console.log("RequestData response from background page");
            console.log(response);
            console.log('tabid', response.contentTabId)
            this.contentTabId = response.contentTabId;
            this.loadOnData(response.data);
        });
    }

    loadProfiles(ids: Array<string>) : JQueryPromise<IProfile> {
        let deferred = $.Deferred<IProfile>();

        console.log("RequestData send to background page");
        chrome.runtime.sendMessage({ command: 'loadProfiles', tabId: this.contentTabId, profileIDs: ids }, (response) => {
            console.log("RequestData response from background page");
            console.log(response);
            console.log('tabid', response.contentTabId)
            deferred.resolve(response.data.profiles);
        });

        return deferred.promise();
    }


    

    loadOnData(source: any) {
        this.network = this.buildNetwork(source);
    }

    buildNetwork(source: any) : any {

        // First load all the profiles in locally
        let trustResult = <BinaryTrustResult>source.binaryTrustResult;
        trustResult.profiles.forEach((profile) => {
            this.profileRepository.setProfile(profile);
        });
        this.profileRepository.setProfile(source.selectedProfile);
        this.profileRepository.setProfile(source.currentUser);

        // Then process the claims agaist the profiles
        let trustStrategy = new TrustStrategy(this.settings, this.profileRepository);
        trustStrategy.ProcessResult(trustResult.queryContext);

        var graph = {
            nodes: [],
            edges: []
        };
        
        this.buildNodes(source.selectedProfile, source.currentUser, null, graph);
        let options = this.buildOptions();
        let container = document.getElementById('networkContainer');

        let nn = new vis2.Network(container, graph, options);
        return nn;
    }


    buildNodes(profile: IProfile, currentUser: IProfile, claim: any, graph: any) : void {

        if(!profile.biggerImage) {
            let hash = Crypto.Hash160(profile.userId).toDTPAddress();
            let icon = new Identicon(hash, {margin:0.1, size:64, format: 'svg'}); // Need min 15 chars
            profile.biggerImage = icon.toString();
        }

        let node = {
            id: profile.userId,
            image: profile.biggerImage,
            label: '*'+profile.alias+'*\n_@'+profile.screen_name+'_',
        }
        
        if(claim != null) {
            let claimValue = (claim.value === "true" || claim.value === "1");
            node["color"] = { 
                border: (claimValue) ? 'green' : 'red'
            };
        }
        
        graph.nodes.push(node)

        if(profile.userId == currentUser.userId)
            return; // Stop with oneself

        if(!profile.binaryTrustResult)
            return;

        for(let key in profile.binaryTrustResult.claims) {
            let claim = profile.binaryTrustResult.claims[key];
            // if(claim.type != PackageBuilder.BINARY_TRUST_DTP1)
            //     return;

            // if(claim.subject.id != profile.userId) 
            //     return;

            // There should always be a profile, even if it just been created by the TrustStrategy class
            let parentProfile = this.profileRepository.getProfileByIndex(claim.issuer.id); // issuer is always a DTP ID

            graph.edges.push({ from: parentProfile.userId, to: profile.userId });

            this.buildNodes(parentProfile, currentUser, claim, graph);
        }
    }

    buildOptions() : any {
        var options = {
            layout: {
                hierarchical: {
                    direction: "LR",
                    sortMethod: "directed"
                }
            },
            interaction:
             { 
                 dragNodes: false,
                 hover: false
            },
            physics: {
                enabled: false
            },
            nodes: {
                shape: 'circularImage',
                borderWidth: 4,
                size: 20,
                color: {
                    border: '#222222',
                    background: '#ffffff'
                },
                shadow: true,
                font: {
                    color: '#000000',
                    multi: 'md'
                }
            },
            edges: {
                arrows: { to: true },
                shadow: true

            }        
        };
        return options;
    }


    update() : JQueryPromise<IProfile> {
        let deferred = $.Deferred<IProfile>();

        // if(this.profile.owner) {
        //     deferred.resolve(this.profile);
        // } else {
        //     this.host.twitterService.getProfileDTP(this.profile.userId).then((owner: DTPIdentity) => {
        //         if(owner != null) {
        //             try {
        //                 if(Crypto.Verify(owner, this.profile.userId)) {
        //                     this.profile.owner = owner;
        //                     this.save();
        //                     this.host.profileRepository.setIndexKey(owner.ID, this.profile); // Save an index to the profile
        //                 }
        //             } catch(error) {
        //                 DTP['trace'](error); // Catch it if Crypto.Verify fails!
        //             }
        //         }
        //         deferred.resolve(this.profile);
        //     });
        // }

        return deferred.promise();
    }


    // reset() {
    //     this.subject = null;
    //     this.binarytrusts = [];
    //     this.trusted = [];
    //     this.distrusted = [];
    //     this.jsonVisible = false;
    // }

    //load (subject) {
    //     this.reset();
    //     this.subject = subject;
    //     this.defaultScope = this.subject.scope;

    //     if(!this.subject.identiconData64)
    //         Object.defineProperty(this.subject, 'identiconData64', { value: this.getIdenticoinData(this.subject.address, null), writable: false });

    //     if(!this.subject.owner)
    //         this.subject.owner = {}

    //     // The subject has an owner
    //     if(this.subject.owner.address) {
    //         if(!this.subject.owner.identiconData16)
    //             Object.defineProperty(this.subject.owner, 'identiconData16', { value: this.getIdenticoinData(this.subject.owner.address, 16), writable: false });
    //     }

    //     this.subject.trusts = this.trustHandler.subjects[this.subject.address];
    //     this.subject.binaryTrust = this.trustHandler.CalculateBinaryTrust(this.subject.address);

    //     for(let index in this.subject.trusts) {
    //         let t = this.subject.trusts[index];


    //         let trust = this.packageBuilder.CreateTrust(t.issuer.address, t.issuer.script, t.subject.address, t.type, t.scope, t.claim, t.activate, t.expire, t.note);

    //         if(!trust.owner) {
    //             let owner = {  
    //                 address: trust.issuer.address
    //             }
    //             Object.defineProperty(trust, 'owner', { value: owner, writable: false });
    //         }

    //         // If trust is a BinaryTrust, decorate the trust object with data
    //         if(trust.type == PackageBuilder.BINARY_TRUST_DTP1) {
    //             this.binarytrusts[trust.subject.address] = trust;

    //             if(!trust.identiconData64)
    //                 Object.defineProperty(trust, 'identiconData64', { value: this.getIdenticoinData(trust.issuer.address, null), writable: false });

    //             // Add trust to the right list
    //             if(trust.claim)
    //                 this.trusted.push(trust);
    //             else
    //                 this.distrusted.push(trust);

    //             Object.defineProperty(trust, 'showTrustButton', { value: !(this.subject.binaryTrust.direct && this.subject.binaryTrust.directValue), writable: false });
    //             Object.defineProperty(trust, 'showDistrustButton', { value: !(this.subject.binaryTrust.direct && !this.subject.binaryTrust.directValue), writable: false });
    //             Object.defineProperty(trust, 'showUntrustButton', { value: this.subject.binaryTrust.direct, writable: false });

    //             let alias = this.trustHandler.alias[trust.issuer.address];
    //             if(alias && alias.length > 0) {
    //                 let item = alias[0];
    //                 let screen_name = item.claim;
    //                 trust.address = Crypto.Hash160(screen_name).toDTPAddress();
    //                 trust.alias = screen_name + (trust.showUntrustButton ? " (You)": "");
    //             } else {
    //               if(this.subject.binaryTrust.direct) 
    //                 trust.alias = "(You)";
    //             }

    //             if(Object.keys(trust.scope).length == 0 ) {
    //                 trust.scope = {
    //                     "value" : this.subject.scope
    //                 }
    //             }

    //             // if(!trust.alias || trust.alias == "") {
    //             //     trust.alias = trust.address;
    //             // }

    //         }
    //     }


    //     this.json = JSON.stringify(subject, undefined, 2);
    //     this.showContainer = true;
    //     this.$scope.$apply();
    // }

    // analyseClick (trust) {
    //     this.history.push(this.subject);

    //     let profile: any = {};
    //     profile.address = trust.issuer.address;
    //     profile.alias = trust.alias;
    //     profile.screen_name = trust.alias;
    //     profile.controller.queryContext = this.subject.controller.queryContext;
    //     profile.scope = this.subject.scope;

    //     this.load(profile);
    // }


    // historyBack () {
    //     this.load(this.history.pop());
    // }

    // showHideJson()  {
    //     this.jsonVisible = (this.jsonVisible) ? false: true;
    // }


    // getIdenticoinData (address, size) {
    //     if(!size) size = 64;
    //     return new Identicon(address, {margin:0.1, size:size, format: 'svg'}).toString();
    // };

    // // trustDataClick  (trust) {
    // //     this.dtpService.GetSimilarTrust(trust).done((result) => {
    // //         console.log('trust data from xhr', result)
    // //         this.trustData =  JSON.stringify(result.data, undefined, 2);
    // //         this.jsonVisible = true;
    // //     });
    // // }

    // verifyTrustLink (trust) {
    //     let url = this.settings.infoserver+
    //         "/trusts?issuerAddress="+encodeURIComponent(trust.issuer.address)+
    //         "&subjectAddress="+encodeURIComponent(trust.subject.address)+
    //         "&type="+encodeURIComponent(trust.type)+
    //         "&scopetype="+encodeURIComponent((trust.scope) ? trust.scope.type : "")+
    //         "&scopevalue="+encodeURIComponent((trust.scope) ? trust.scope.value : "");
    //     return url;
    // }


    // trustClick(profile) {
    //     this.buildAndSubmitBinaryTrust(profile, true, 0, profile.alias + " trusted");
    //     return false;
    // };

    // distrustClick (profile) {
    //     this.buildAndSubmitBinaryTrust(profile, false, 0, profile.alias + " distrusted");
    //     return false;
    // }

    // untrustClick(profile) {
    //     this.buildAndSubmitBinaryTrust(profile, undefined, 1, profile.alias + " untrusted");
    //     return false;
    // }

    // buildAndSubmitBinaryTrust (profile, value, expire, message){

    //     var package_ = this.subjectService.BuildBinaryClaim(profile, value, null, expire);
    //     this.packageBuilder.SignPackage(package_);
    //     this.dtpService.PostTrust(package_).done((trustResult)=> {
    //         //$.notify("Updating view",trustResult.status.toLowerCase());
    //         console.log("Posting package is a "+trustResult.status.toLowerCase());

    //         $["notify"](message, 'success');

    //         var opt = {
    //             command: 'updateContent',
    //             contentTabId: this.contentTabId
    //         }
    //         chrome.runtime.sendMessage(opt);

    //     }).fail((trustResult) => { 
    //         $["notify"]("Adding trust failed: " +trustResult.message,"fail");
    //     });
    // }
}



const app = angular.module("myApp", []);
app.controller('TrustListController', ["$scope", TrustListController]) // bootstrap angular app here 
app.controller('ExtensionpopupController', ["$scope", ExtensionpopupController]) // bootstrap angular app here 
