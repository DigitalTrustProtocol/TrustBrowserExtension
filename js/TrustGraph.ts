import * as angular from 'angular';
import './common.js';
import SettingsController = require('./SettingsController');
import PackageBuilder = require('./PackageBuilder');
import DTPService = require('./DTPService');
import TrustStrategy = require('./TrustStrategy');
import SubjectService = require('./SubjectService');
import ISettings from './Settings.interface';
import Crypto = require('./Crypto');
import IProfile from './IProfile';
import ProfileRepository = require('./ProfileRepository');
import BinaryTrustResult = require('./Model/BinaryTrustResult');
import vis2 = require('vis');
import Profile = require('./Profile');
import Identicon = require('identicon.js');
import { Buffer } from 'buffer';
import ISiteInformation from './Model/SiteInformation.interface';
import SiteManager = require('./SiteManager');


class memoryStorage {

    private cache : Array<any> = [];

    setItem(key: string, data: any) {
        this.cache[key] = data;
    }

    getItem(key: string) : any {
        return this.cache[key];
    }
}

class TrustGraphController {
    nodeProcessed: object = {};
    settingsController: any;
    settings: any;
    packageBuilder: any;
    subjectService: any;
    dtpService: any;
    contentTabId: number;
    //subject: any;
    //binarytrusts: any;
    //trusted = [];
    //distrusted = [];
    //jsonVisible = false;
    //defaultScope;
    //json;
    //trustData: string;
    network: any;
    profileRepository: ProfileRepository;
    currentUser: IProfile;
    selectedProfile: IProfile;
    modalData: any = {}


    //static $inject = [];
    //static $inject = ['$scope'];
    //$apply: any;
    constructor(private $scope: ng.IScope) {

    }

    init() {
        SiteManager.GetUserContext().then((userContext) => {
            this.settingsController = new SettingsController(userContext);
            this.settingsController.loadSettings((settings) => {
                this.settings = settings;
                this.profileRepository = new ProfileRepository(new memoryStorage());
                this.packageBuilder = new PackageBuilder(settings);
                this.subjectService = new SubjectService(settings, this.packageBuilder);
                this.dtpService = new DTPService(settings);

                this.addListeners();
                this.requestData(null); // Default 
            });
        });
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
        this.currentUser = source.currentUser;
        this.selectedProfile = source.selectedProfile;
        this.profileRepository.setProfile(source.selectedProfile);
        this.profileRepository.setProfile(source.currentUser);

        // Then process the claims agaist the profiles
        let trustStrategy = new TrustStrategy(this.settings, this.profileRepository);
        trustStrategy.ProcessResult(trustResult.queryContext);

        var graph = {
            nodes: [],
            edges: []
        };
        
        this.buildNodes(source.selectedProfile, source.currentUser, graph);
        let options = this.buildOptions();
        let container = document.getElementById('networkContainer');

        let nw = new vis2.Network(container, graph, options);

        nw.on("select", (params) => {
            if(params.nodes.length == 0)
                this.hideModal();
            else 
                this.showModal(params.nodes[0]);
        });

        return nw;
    }

    showModal(profileId: any) : void {
        //this.modalData.profile = this.profileRepository.getProfile(profileId);
        this.modalData.profile = this.nodeProcessed[profileId];

        // Default value!
        this.modalData.score = {};
        this.modalData.score.show = false;
        this.modalData.isCurrentUser = false;

        if(this.modalData.profile.userId == this.selectedProfile.userId) {
            let score = this.selectedProfile.binaryTrustResult.trust - this.selectedProfile.binaryTrustResult.distrust;
            if(score < 0)
                this.modalData.status = { cssClass: "distrusted", text: "Distrusted", show: true};

            if(score > 0)
                this.modalData.status = { cssClass: "trusted", text: "Trusted", show: true};

            this.modalData.score.show = true;
        } else {
            if(this.modalData.profile.userId == this.currentUser.userId)    {
                    this.modalData.status = { cssClass: "", text: "Current user", show: true };
                    this.modalData.isCurrentUser = true;
                }
            else        
                this.modalData.status = { cssClass: "trusted", text: "Trusted", show: true};
        }

        this.modalData.button = {};

        this.modalData.button.trust = {};
        this.modalData.button.distrust = {};
        this.modalData.button.untrust = {};
        
        if(!this.modalData.isCurrentUser) {
            this.modalData.button.untrust.disabled = !this.modalData.profile.binaryTrustResult.direct;

            if(this.modalData.profile.binaryTrustResult.direct) {
                this.modalData.button.trust.disabled = true;
                this.modalData.button.distrust.disabled = true;
            }
            else {
                this.modalData.button.trust.disabled = false;
                this.modalData.button.distrust.disabled = false;
            }
        }

       
        this.$scope.$apply();
        // Show dtpbar
        this.setToCenterOfParent( $('#networkModal'), document.body, false, false);
        //$("#networkModal").finish().show();
        $("#networkModal").modal('show');
    }

    hideModal(): void {
        if($('#networkModal').is(':visible'))
            $("#networkModal").modal('hide');
            //$("#networkModal").hide();

        this.modalData = {};
    }


    buildNodes(profile: IProfile, currentUser: IProfile, graph: any) : void {

        if(this.nodeProcessed[profile.userId])
            return; // Do not re-process the node

        if(!profile.avatarImage) {
            let hash = Crypto.toDTPAddress(Crypto.Hash160(profile.userId));
            let icon = new Identicon(hash, {margin:0.1, size:64, format: 'svg'}); // Need min 15 chars
            profile.avatarImage = icon.toString();
        }

        let node = {
            id: profile.userId,
            image: profile.avatarImage,
            label: '*'+profile.alias+'*\n_@'+profile.screen_name+'_',
        }
        
        // if(claim != null) {
        //     let claimValue = (claim.value === "true" || claim.value === "1");
        //     node["color"] = { 
        //         border: (claimValue) ? 'green' : 'red'
        //     };
        // }
        
        graph.nodes.push(node)
        this.nodeProcessed[profile.userId] = profile;

        if(profile.userId == currentUser.userId)
            return; // Stop with oneself

        if(!profile.binaryTrustResult)
            return;

        for(let key in profile.binaryTrustResult.claims) {
            let claim = profile.binaryTrustResult.claims[key];

            // if(claim.type != PackageBuilder.BINARY_TRUST_DTP1)
            //     return;

            // There should always be a profile, even if it just been created by the TrustStrategy class
            let parentProfile = this.profileRepository.getProfileByIndex(claim.issuer.id); // issuer is always a DTP ID

            let color = (claim.value === "true" || claim.value === "1") ? 'green' :'red';
            graph.edges.push({ 
                from: parentProfile.userId, 
                to: profile.userId, 
                color:{
                    color:color, 
                    highlight: color 
                } 
            });

            this.buildNodes(parentProfile, currentUser, graph);
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

            },
            autoResize: true
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

    trustClick() {
        this.buildAndSubmitBinaryTrust(this.selectedProfile, true, 0, this.selectedProfile.alias + " trusted");
        return false;
    };

    distrustClick () {
        this.buildAndSubmitBinaryTrust(this.selectedProfile, false, 0, this.selectedProfile.alias + " distrusted");
        return false;
    }

    untrustClick() {
        this.buildAndSubmitBinaryTrust(this.selectedProfile, undefined, 1, this.selectedProfile.alias + " untrusted");
        return false;
    }

    buildAndSubmitBinaryTrust (profile: IProfile, value: boolean, expire: number, message: string): void {
        var trustPackage = this.subjectService.BuildBinaryClaim(profile, value, null, expire);
        this.packageBuilder.SignPackage(trustPackage);
        this.dtpService.PostTrust(trustPackage).done((trustResult)=> {
            //$.notify("Updating view",trustResult.status.toLowerCase());
            console.log("Posting package is a "+trustResult.status.toLowerCase());

            $["notify"](message, 'success');

            var opt = {
                command: 'updateContent',
                contentTabId: this.contentTabId
            }
            chrome.runtime.sendMessage(opt);

        }).fail((trustResult) => { 
            $["notify"]("Adding trust failed: " +trustResult.message,"fail");
        });
    }


    setToCenterOfParent(element, parent, ignoreWidth, ignoreHeight): void {
        let parentWidth = $(parent).width();
        let parentHeight = $(parent).height();  
        let elementWidth = $(element).width();
        let elementHeight = $(element).height();
        if(!ignoreWidth)
            $(element).css('left', parentWidth/2 - elementWidth/2);
        if(!ignoreHeight)
            $(element).css('top', parentHeight/2 - elementHeight/2);
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


}



const app = angular.module("myApp", []);
app.controller('TrustGraphController', ["$scope", TrustGraphController]) // bootstrap angular app here 
