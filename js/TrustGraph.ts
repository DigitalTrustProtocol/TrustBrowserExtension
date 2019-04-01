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
import { ModelPackage, QueryContext } from '../lib/dtpapi/model/models.js';
import TrustGraphModal = require('./Model/TrustGraphModal');


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
    dtpService: DTPService;
    contentTabId: number;
    network: any;
    profileRepository: ProfileRepository;
    currentUser: IProfile;
    selectedProfile: IProfile;
    modalData: TrustGraphModal;
    graph: any = {};
    source: any;

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
                    return true;
                }

                return false;
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

        this.source = source;
        // First load all the profiles in locally
        let trustResult = <BinaryTrustResult>source.binaryTrustResult;
        trustResult.profiles.forEach((profile) => {
            this.profileRepository.setProfile(profile);
        });
        this.currentUser = source.currentUser || this.currentUser;
        this.selectedProfile = source.selectedProfile || this.selectedProfile;
        this.profileRepository.setProfile(source.selectedProfile);
        this.profileRepository.setProfile(source.currentUser);

        // Then process the claims agaist the profiles
        let trustStrategy = new TrustStrategy(this.settings, this.profileRepository);
        trustStrategy.ProcessResult(trustResult.queryContext);

        let check = this.profileRepository.getProfile(this.selectedProfile.userId);

        this.graph = {
            nodes: [],
            edges: new vis2.DataSet()
        };
        
        this.buildNodes(this.selectedProfile, this.currentUser);
        let options = this.buildOptions();
        let container = document.getElementById('networkContainer');

        let nw = new vis2.Network(container, this.graph, options);

        nw.on("select", (params) => {
            if(params.nodes.length == 0)
                this.hideModal();
            else 
                this.showModal(params.nodes[0]);
        });

        return nw;
    }


    buildNodes(profile: IProfile, currentUser: IProfile) : void {

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
        
        this.graph.nodes.push(node)
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

            this.addEdge(parentProfile, profile, claim);

            this.buildNodes(parentProfile, currentUser);
        }
    }

    addEdge(from: IProfile, to:IProfile, claim: any) : void {
        let color = (claim.value === "true" || claim.value === "1") ? 'green' :'red';
        this.graph.edges.add({ 
            id: from.userId+to.userId,
            from: from.userId, 
            to: to.userId, 
            color:{
                color:color, 
                highlight: color 
            } 
        });
    }

    removeEdge(from: IProfile, to:IProfile) : void {
        this.graph.edges.remove({ 
            id: from.userId+to.userId
        });
    }

    updateEdge(from: IProfile, to:IProfile, claim: any) : void {

            let color = (claim.value === "true" || claim.value === "1") ? 'green' : (claim.value == undefined || claim.value == "") ? 'gray': 'red';
            this.graph.edges.update({ 
                id: from.userId+to.userId,
                from: from.userId, 
                to: to.userId, 
                color:{
                    color:color, 
                    highlight: color 
                } 
            });

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

    showModal(profileId: any) : void {
        let profile = this.profileRepository.getProfile(profileId);
        this.modalData = new TrustGraphModal(profile, this.selectedProfile, this.currentUser);
        
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
    }



    trustClick() {
        this.buildAndSubmitBinaryTrust(this.modalData.profile, true, 0, this.modalData.profile.alias + " trusted");
        return false;
    };

    distrustClick () {
        this.buildAndSubmitBinaryTrust(this.modalData.profile, false, 0, this.modalData.profile.alias + " distrusted");
        return false;
    }

    untrustClick() {
        this.buildAndSubmitBinaryTrust(this.modalData.profile, undefined, 1, this.modalData.profile.alias + " untrusted");

        return false;
    }

    buildAndSubmitBinaryTrust (profile: IProfile, value: boolean, expire: number, message: string): JQueryPromise<any> {
        //this.modalData.disableButtons();
        this.modalData.processing = true;
        profile.scope = this.source.scope;
        var trustPackage = this.subjectService.BuildBinaryClaim(profile, value, null, expire);
        this.packageBuilder.SignPackage(trustPackage);
        return this.dtpService.PostPackage(trustPackage).done((trustResult)=> {
            //$.notify("Updating view",trustResult.status.toLowerCase());
            console.log("Posting package is a "+trustResult.status);

            $["notify"](message, 'success');


            this.updateNetwork(trustPackage);

           
            this.hideModal(); 
        }).fail((trustResult) => { 
            $["notify"]("Adding trust failed: " +trustResult.message,"fail");
            this.hideModal(); 
        });
    }

    updateNetwork(trustPackage: ModelPackage) : void {
        // let profiles = [];
        // profiles.push(this.currentUser);
        // profiles.push(this.selectedProfile);
        // let scope = "twitter.com";
        // this.dtpService.Query(profiles, scope).done((result: QueryContext) => {
        //     let source = {
        //         currentUser: this.currentUser,
        //         selectedProfile: this.selectedProfile,
        //         binaryTrustResult: new BinaryTrustResult()
        //     };
        //     source.binaryTrustResult.queryContext = result;

        //     this.loadOnData(source);
        // });


        for(let key in trustPackage.claims) {
            let claim = trustPackage.claims[key];
            let from = this.profileRepository.getProfile(claim.issuer.id);
            let to = this.profileRepository.getProfile(claim.subject.id);

            this.updateEdge(from, to, claim);
            
            to.binaryTrustResult.claims[claim.issuer.id] = claim;

            let th = new TrustStrategy(this.settings, this.profileRepository);
            th.calculateBinaryTrustResult(to.binaryTrustResult);


            var opt = {
                command: 'updateContent',
                tabId: this.contentTabId
            }
            chrome.runtime.sendMessage(opt, (response) => {
                console.log('tabid', response.tabId)
                this.contentTabId = response.tabId;
                console.log(response.data);
                //this.loadOnData(response.data);
            });
    
            // if(claim.expire == 1 || claim.value == undefined) {
            //     this.removeEdge(from, to);
            //     to.binaryTrustResult.claims[claim.issuer.id] = claim;
            // }
            // else {
            // }    

        }
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

    // getIdenticoinData (address, size) {
    //     if(!size) size = 64;
    //     return new Identicon(address, {margin:0.1, size:size, format: 'svg'}).toString();
    // };
}



const app = angular.module("myApp", []);
app.controller('TrustGraphController', ["$scope", TrustGraphController]) // bootstrap angular app here 
app.config( [
    '$compileProvider',
    function( $compileProvider )
    {   
        //$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|local|data|chrome-extension):/);
        // Angular before v1.2 uses $compileProvider.urlSanitizationWhitelist(...)
    }
]);
