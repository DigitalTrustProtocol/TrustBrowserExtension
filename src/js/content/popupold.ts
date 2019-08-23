import * as angular from 'angular';
import '../common.js';
import PackageBuilder = require('../PackageBuilder');
import DTPService = require('../DTPService');
import TrustStrategy = require('../TrustStrategy');
import SubjectService = require('../SubjectService');
import Crypto = require('../Crypto');
import IProfile from '../IProfile';
import ProfileRepository = require('../ProfileRepository');
import BinaryTrustResult = require('../Model/BinaryTrustResult');
import vis2 = require('vis');
import Profile = require('../Profile');
import Identicon = require('identicon.js');
import { Buffer } from 'buffer';
import ISiteInformation from '../Model/SiteInformation.interface';
import SiteManager = require('../SiteManager');
import ISettings from '../Interfaces/Settings.interface';
import SettingsClient = require('../Shared/SettingsClient');
import { MessageHandler } from '../Shared/MessageHandler';
import Settings = require('../Shared/Settings');
import * as $ from 'jquery';
import ProfileModal = require('../Model/ProfileModal');
import { browser, Windows, Runtime, Tabs } from "webextension-polyfill-ts";
import 'select2';
import { StorageClient } from "../Shared/StorageClient";
import { QueryContext } from '../../../dist/lib/dtpapi/model/QueryContext';
import { TrustGraphPopupClient } from '../Shared/TrustGraphPopupClient';
import { Claim } from '../../../dist/lib/dtpapi/model/Claim';
import IGraphData from './IGraphData';
import IOpenDialogResult from '../Model/OpenDialogResult.interface';
import { TrustGraphPopupServer } from '../background/TrustGraphPopupServer';
import DTPIdentity = require('../Model/DTPIdentity');


class ExtensionpopupController {

    messageHandler: MessageHandler;
    settingsClient: SettingsClient;
    settings: ISettings;
    showIcon: boolean = true;
    contentTabId: any;
    dtpIdentity: string;
    modalData: ProfileModal;
    packageBuilder: PackageBuilder;
    subjectService: SubjectService;
    dtpService: DTPService;
    profileRepository: ProfileRepository;
    storageClient: StorageClient;
    trustStrategy: TrustStrategy;
    trustGraphPopupClient: TrustGraphPopupClient;



    profiles: Array<IProfile> = [];

    private noop = (reason) => { alert(reason); };

    constructor(private $scope: ng.IScope) {
        //this.onStorageChanged();
    }

    init() {
        this.messageHandler = new MessageHandler();
        this.storageClient = new StorageClient(this.messageHandler);
        this.profileRepository = new ProfileRepository(this.storageClient);

        SiteManager.GetUserContext().then((userContext) => {
            this.settingsClient = new SettingsClient(this.messageHandler, userContext);
            this.settingsClient.loadSettings().then((settings: ISettings) => {
                settings = settings || new Settings();
                this.settings = settings;
                Profile.CurrentUser = new Profile({ userId: this.settings.address, alias: "You" });

                this.packageBuilder = new PackageBuilder(settings);
                this.subjectService = new SubjectService(settings, this.packageBuilder);
                this.dtpService = new DTPService(settings);
                this.trustStrategy = new TrustStrategy(settings, this.profileRepository);
                this.showIcon = (this.settings.identicon || this.settings.identicon.length > 0) ? true : false;
                this.trustGraphPopupClient = new TrustGraphPopupClient(this.messageHandler);
                // Bind events
                this.trustGraphPopupClient.updateContentHandler = (params, sender) => { this.updateContentHandler(params, sender); };
                this.trustGraphPopupClient.requestSubjectHandler = (params, sender) => { return this.requestSubjectHandler(params, sender); };

                this.initSubjectSelect();

                chrome.tabs.query({active: true, currentWindow: true}, tabs => {
                    
                    this.getProfiles(tabs[0].id).then((data: IGraphData) => {

                        this.profiles = data.profiles;
                        this.profiles.forEach(p=>p.queryResult = data.queryResult);
                        let profile = this.profiles[0];

                        // Set select2 default value
                        var newOption = new Option(profile.alias, profile.userId, true, true);
                        $('.userSelectContainer').append(newOption).trigger('change.select2');

                        this.selectProfile(profile);
                    })
                });
  
            });
        });
    }

    initSubjectSelect() : void {
        let self = this;

        $('.userSelectContainer').select2({
            ajax: {
                url: this.settings.infoserver+'/api/Identity',
                dataType: 'json',
                delay: 0,
                processResults: function (data) {
                    return { results: $.map(data, function(el) { 
                        if(typeof el === 'string')
                            return { id: el, text: el, alias: '' };
                        else
                            return el;
                    })};
                },
                cache: true,
                transport: function (params, success, failure) {
                    if(!params.data.term || params.data.term.length == 0) {
                        let arr = $.map(self.profiles, (p,i) => { return {id:p.userId, alias: p.alias || p.screen_name}; });

                        var deferred = $.Deferred().resolve(arr);
                        deferred.then(success);
                        deferred.fail(failure);
    
                        return deferred.promise();
                    }

                    var $request = $.ajax(params);
                    $request.then(success);
                    $request.fail(failure);
                
                    return $request;
                  }
            },
            placeholder: 'Search for a subject',
            minimumInputLength: 0,
            templateResult: this.formatSubjectSelect,
            templateSelection: this.formatSubjectSelection
        });

        $('.userSelectContainer').on('select2:select', e => this.selectProfileID(e.params.data.id));
    }

    formatSubjectSelect(item) {
        return item.alias || item.text;
    }
      
    formatSubjectSelection(item) : string {
        return item.alias || item.text;
    }

    selectProfile(profile: IProfile) : void {
        if(!profile.trustResult) {
            this.queryProfiles([profile]).then(() => {
                this.updateModalData(profile);
                this.updateIcon(profile.trustResult);
            })
        } else {
            this.updateModalData(profile);
            this.updateIcon(profile.trustResult);
        }
    }

    selectProfileID(id: string) : void {
        let f =  this.profiles.filter(x => x.userId === id);
        if(f.length > 0) {
            this.selectProfile(f[0]);
        }
        else
            // Try getting the profile from storage
            this.profileRepository.ensureProfile(id, { userId: id, scope: "url"}).then(p => {

                // Query the profile then 
                this.selectProfile(p);

                this.profiles.push(p); 
            });
    }

    updateIcon(result: BinaryTrustResult) : void {
        let state = (result) ? result.state : undefined;

        chrome.runtime.sendMessage({
            handler: 'extensionHandler',
            action: 'updateIcon',
            value: state
        });
    }


    getProfiles(tabId: any) : Promise<IGraphData> {
        let command = {
            handler: "profileHandler",
            action: "getProfiles"
        }

        const promise = browser.tabs.sendMessage(tabId, command);
        promise.catch(this.noop);
        return promise;
    }

    updateModalData(profile: IProfile) : void {
        this.modalData = new ProfileModal(profile, profile, null);
        this.$scope.$apply();
    }

    trustClick(): boolean {
        this.buildAndSubmitBinaryTrust(this.modalData.profile, "true", 0, this.modalData.profile.alias + " trusted");
        return false;
    };

    distrustClick(): boolean {
        this.buildAndSubmitBinaryTrust(this.modalData.profile, "false", 0, this.modalData.profile.alias + " distrusted");
        return false;
    }

    untrustClick(): boolean {
        this.buildAndSubmitBinaryTrust(this.modalData.profile, null, 1, this.modalData.profile.alias + " untrusted");

        return false;
    }
    
    queryProfiles(profiles: Array<IProfile>) : JQueryPromise<void> {
        let scope = "url";
        return this.dtpService.Query(profiles, scope).then((response, queryResult) => {
            this.trustStrategy.UpdateProfiles(queryResult, profiles);
        });
    }


    buildAndSubmitBinaryTrust (profile: IProfile, value: string, expire: number, message: string): JQueryPromise<any> {
        //this.modalData.disableButtons();
        this.modalData.processing = true;
        var trustPackage = this.subjectService.BuildBinaryClaim(profile, value, undefined, "url", expire);
        this.packageBuilder.SignPackage(trustPackage);
        return this.dtpService.PostPackage(trustPackage).done((trustResult)=> {
            console.log("Posting package is a "+trustResult.status);
           
            let q = <QueryContext>{
                issuerCount: 1,
                subjectCount: 1,
                results: trustPackage,
                errors: []
            } 

            this.trustStrategy.UpdateProfiles(q, [profile]);
            this.selectProfile(profile); // Update the screen

        }).fail((trustResult) => { 
        });
    }

    // onStorageChanged(): void {
    //     chrome.storage.onChanged.addListener(function(changes, namespace) {
    //         for (var key in changes) {
    //           var storageChange = changes[key];
    //           console.log('Storage key "%s" in namespace "%s" changed. ' +
    //                       'Old value was "%s", new value is "%s".',
    //                       key,
    //                       namespace,
    //                       storageChange.oldValue,
    //                       storageChange.newValue);
    //         }
    //       });
    // }
   
    modelChange(state?: string) {
        if (state === 'identicon') {
            this.settingsClient.buildKey(this.settings);

            var identicon = new Identicon(this.settings.address, { margin: 0.1, size: 64, format: 'svg' }).toString();
            if (identicon.length > 0) {
                this.settings.identicon = "data:image/svg+xml;base64," + identicon.toString();
                this.showIcon = true;
            }

            
            //let identity = new DTPIdentity({id: this.settings.address, proof: this.settings.})
        }
        

        if (this.settings.rememberme || state === 'rememberme') {
            this.settingsClient.saveSettings(this.settings);
        }
    }

    getSiteInfo() : JQueryPromise<ISiteInformation> {
        let deferred = $.Deferred<ISiteInformation>();

        console.log("RequestData send to background page");
        // chrome.runtime.sendMessage({ command: 'getSiteInformation', tabId: this.contentTabId, profileIDs: ids }, (response) => {
        //     console.log("RequestData response from background page");
        //     console.log(response);
        //     console.log('tabid', response.contentTabId)
        //     deferred.resolve(response.data.profiles);
        // });

        return deferred.promise();
    }


    // private async buildGraph(profile: IProfile, id: string, trustResult: BinaryTrustResult, profiles: any, trustResults: any, claimCollections: any) : Promise<Object> {
    //     if(profiles[id])
    //         return; // Exist, then it has been processed.

    //     profiles[id] = profile;

    //     if(!trustResult)
    //         return trustResults;
            
    //     trustResults[id] = trustResult;
        
    //     for(let key in trustResult.claims) {
    //         let claim = trustResult.claims[key] as Claim;

    //         // Get a profile from the Issuer ID, as only profiles with a DTP id can be retrived.
    //         // The profile may not be in index, but in DB, but it will be up to the popup window to handle this.
    //         //let parentProfile = this.profileRepository.index[claim.issuer.id] as IProfile;
    //         let parentProfile = await this.profileRepository.getProfileByIndex(claim.issuer.id);
    //         if(!parentProfile) { // Do profile exist?
    //             parentProfile = new Profile({userId: claim.issuer.id, screen_name: "Unknown", alias: "Unknown"}) as IProfile;
    //         }
    //         let parentTrustResult = claimCollections[parentProfile.owner.ID] as BinaryTrustResult; 
            
    //         await this.buildGraph(parentProfile, parentProfile.owner.ID, parentTrustResult, profiles, trustResults, claimCollections);
    //     }
    //     return trustResults;
    // }


    public async requestSubjectHandler(params: any, sender: Runtime.MessageSender) : Promise<IGraphData> {
        //let profile = await this.profileRepository.getProfile(params.profileId);

        // let profiles = {};
        // this.profiles.forEach(p=> profiles[p.userId] = p);
        let profile = this.profiles.filter(p=>p.userId === params.profileId).pop();


        // If profile is null?

        //let controller = this.controllers[profile.userId] as ProfileController;

        //let claims = (controller.trustResult && controller.trustResult.queryContext && controller.trustResult.queryContext.results) ? controller.trustResult.queryContext.results.claims : [];
        //let claimCollections = this.trustStrategy.ProcessClaims(claims);

        //let profiles: object = {};
        //let trustResults = null; //await this.buildGraph(profile, profile.userId, controller.trustResult, profiles, {}, claimCollections);

        //let adapter = new TrustGraphDataAdapter(this.trustStrategy, this.controllers);
        //adapter.build(trustResult.claims, profile, Profile.CurrentUser);
        //let trustResults = this.trustStrategy.ProcessClaims(profile.trustResult.queryContext.results.claims);

        let dialogData = {
            scope: "url",
            currentUserId: Profile.CurrentUser.userId,
            subjectProfileId: params.profileId,
            profiles: this.profiles,
            queryResult: profile.queryResult,
        } as IGraphData;

        return dialogData;
    }

    updateContentHandler(params, sender) : void {
        this.selectProfile(params.profile);
    }

    openGraphClick(eventObject: JQueryEventObject) : boolean {
        this.trustGraphPopupClient.openPopup({profileId: this.modalData.profile.userId});

        eventObject.stopPropagation();
        return false;
    }
}


const app = angular.module("myApp", []);
app.controller('ExtensionpopupController', ["$scope", ExtensionpopupController]) // bootstrap angular app here 
app.controller('TabController', ['$scope', function($scope) {
    $scope.tab = 1;

    $scope.setTab = function(newTab){
      $scope.tab = newTab;
    };

    $scope.isSet = function(tabNum){
      return $scope.tab === tabNum;
    };
}]);
app.config( [
    '$compileProvider',
    function( $compileProvider )
    {   
        //$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|local|data|chrome-extension):/);
    }
]);




