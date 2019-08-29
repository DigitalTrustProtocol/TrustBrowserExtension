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
import { TrustGraphPopupClient } from '../Shared/TrustGraphPopupClient';
import IGraphData from './IGraphData';
import IOpenDialogResult from '../Model/OpenDialogResult.interface';
import { TrustGraphPopupServer } from '../background/TrustGraphPopupServer';
import DTPIdentity = require('../Model/DTPIdentity');
import 'bootstrap';
import { QueryContext } from '../../lib/dtpapi/model/models.js';
import IProfileView from './IProfileView';
import { DtpGraphCoreModelQueryContext } from '../../lib/typescript-jquery-client/model/models.js';


class ExtensionpopupController {

    messageHandler: MessageHandler;
    settingsClient: SettingsClient;
    settings: ISettings;
    tempSettings: ISettings;
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



    sessionProfiles: Array<ProfileModal> = [];

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
                this.settings = settings || new Settings();
                this.tempSettings = $.extend({},this.settings);

                Profile.CurrentUser = new Profile({ userId: this.settings.address, alias: "You" });

                this.packageBuilder = new PackageBuilder(this.settings);
                this.subjectService = new SubjectService(this.settings, this.packageBuilder);
                this.dtpService = new DTPService(this.settings);
                this.trustStrategy = new TrustStrategy(this.settings, this.profileRepository);
                this.showIcon = (this.settings.identicon || this.settings.identicon.length > 0) ? true : false;
                this.trustGraphPopupClient = new TrustGraphPopupClient(this.messageHandler);
                // Bind events
                this.trustGraphPopupClient.updateContentHandler = (params, sender) => { this.updateContentHandler(params, sender); };
                this.trustGraphPopupClient.requestSubjectHandler = (params, sender) => { return this.requestSubjectHandler(params, sender); };

                this.initSubjectSelect();

                chrome.tabs.query({active: true, currentWindow: true}, tabs => {
                    this.contentTabId = tabs[0].id;
                    this.getProfiles(this.contentTabId).then((data: any) => {
                        if(!data || data.length == 0 || !data.profileViews)
                            return;

                        data.profileViews.forEach(item=> this.sessionProfiles.push(new ProfileModal().setup(item)));

                        let profileView = this.sessionProfiles.filter(p=>p.profile.userId === data.selectedUserId).pop();
                        
                        // Set select2 default value
                        var newOption = new Option(profileView.profile.alias, profileView.profile.userId, true, true);
                        $('.userSelectContainer').append(newOption).trigger('change.select2');

                        this.selectProfile(profileView);
                        
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
                        let arr = $.map(self.sessionProfiles, (pv,i) => { return {id:pv.profile.userId, alias: pv.profile.alias || pv.profile.screen_name}; });

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

    selectProfile(profileView: ProfileModal) : void {
        if(!profileView.queryResult) {
            this.queryProfiles([profileView.profile]).then(({queryResult, trustResults}) => {
                profileView.trustResult = trustResults[profileView.profile.userId] || new BinaryTrustResult();
                profileView.queryResult = queryResult;
                profileView.setup();
                this.sessionProfiles.forEach((pm)=> pm.visible = (pm.profile.userId == profileView.profile.userId));
                this.updateIcon(profileView.trustResult);
                this.$scope.$apply();
                this.updateContentTabProfile(profileView);
            })
        } else {
            this.updateIcon(profileView.trustResult);
            this.sessionProfiles.forEach((pm)=> pm.visible = (pm.profile.userId == profileView.profile.userId));
            this.updateContentTabProfile(profileView);
            this.$scope.$apply();
        }
    }

    selectProfileID(id: string) : void {
        let f =  this.sessionProfiles.filter(x => x.profile.userId === id);
        if(f.length > 0) {
            this.selectProfile(f[0]);
        }
        else
            // Try getting the profile from storage
            this.profileRepository.ensureProfile(id, { userId: id, scope: "url"}).then(p => {
                let pm = new ProfileModal(p, undefined, undefined);
                this.sessionProfiles.push(pm);
                this.selectProfile(pm);
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


    saveClick() : boolean {
        let profileChanged = this.settings.address != this.tempSettings.address;
        this.settingsClient.buildKey(this.tempSettings);

        this.settings = $.extend(this.settings, this.tempSettings);

        if (this.settings.rememberme)
            this.settingsClient.saveSettings(this.settings);
        
        
        let profile = new Profile();
        profile.userId = this.settings.address;
        profile.alias = this.settings.alias;
        profile.aliasProof = this.settings.aliasProof;
        this.profileRepository.setProfile(profile);
        return false;
    }

    cancelClick() : boolean {
        this.tempSettings = $.extend(this.tempSettings, this.settings);
        return false;
    }

    trustClick(profileView: ProfileModal): boolean {
        this.buildAndSubmitBinaryTrust(profileView, "true", 0, profileView.profile.alias + " trusted");
        return false;
    };

    distrustClick(profileView: ProfileModal): boolean {
        this.buildAndSubmitBinaryTrust(profileView, "false", 0, profileView.profile.alias + " distrusted");
        return false;
    }

    untrustClick(profileView: ProfileModal): boolean {
        this.buildAndSubmitBinaryTrust(profileView, null, 1, profileView.profile.alias + " untrusted");
        return false;
    }
    
    queryProfiles(profiles: Array<IProfile>) : JQueryPromise<{queryResult: DtpGraphCoreModelQueryContext, trustResults: object}> {
        let scope = "url";
        return this.dtpService.Query(profiles, scope).then((response, queryResult) => {
            return { queryResult: queryResult, trustResults : this.trustStrategy.createTrustResults(queryResult)};
        });
    }


    buildAndSubmitBinaryTrust (profileView: ProfileModal, value: string, expire: number, message: string): JQueryPromise<any> {
        //this.modalData.disableButtons();
        profileView.processing = true;
        var trustPackage = this.subjectService.BuildBinaryClaim(profileView.profile, value, undefined, "url", expire);
        this.packageBuilder.SignPackage(trustPackage);
        return this.dtpService.PostPackage(trustPackage).done((trustResult)=> {
            console.log("Posting package is a "+trustResult.status);
           
            profileView.queryResult = <QueryContext>{
                issuerCount: 1,
                subjectCount: 1,
                results: trustPackage,
                errors: []
            } 

            let results = this.trustStrategy.createTrustResults(profileView.queryResult);
            profileView.trustResult = results[profileView.profile.userId];
            profileView.setup();
            this.updateIcon(profileView.trustResult);
            this.updateContentTabProfile(profileView);
            this.$scope.$apply();
        }).fail((trustResult) => { 
        });
    }

   
    modelChange(state?: string) {
        if (state === 'identicon') {
            this.settingsClient.buildKey(this.tempSettings);

            var identicon = new Identicon(this.tempSettings.address, { margin: 0.1, size: 64, format: 'svg' }).toString();
            if (identicon.length > 0) {
                this.tempSettings.identicon = "data:image/svg+xml;base64," + identicon.toString();
                this.showIcon = true;
            }
        }
    }




    public async requestSubjectHandler(params: any, sender: Runtime.MessageSender) : Promise<IGraphData> {
        let profile = this.sessionProfiles.filter(pv=>pv.profile.userId === params.profileId).pop();


        let dialogData = {
            scope: "url",
            currentUserId: Profile.CurrentUser.userId,
            subjectProfileId: params.profileId,
            profiles: this.sessionProfiles.map(pv => pv.profile),
            queryResult: profile.queryResult,
        } as IGraphData;

        return dialogData;
    }

    updateContentHandler(params, sender) : void {
        let pv = this.sessionProfiles.filter((p) =>  p.profile.userId == params.profileView.profile.userId).pop();
        if(pv) {
            pv.setup(params.profileView);
            this.selectProfile(pv);
        }
    }

    updateContentTabProfile(profileView: ProfileModal, callback?: (err: any, value: any) => void) : Promise<any>
    {
        let message = { 
                action: "updateProfile",
                data: profileView
        };
        return this.messageHandler.sendTab(this.contentTabId, "profileHandler", message, result => {
            if(callback)
                callback(null, result);
        });     
    }

    getProfiles(tabId: any) : Promise<Array<ProfileModal>> {
        let command = {
            handler: "profileHandler",
            action: "getProfiles"
        }

        const promise = browser.tabs.sendMessage(tabId, command);
        promise.catch(this.noop);
        return promise;
    }


    openGraphClick(eventObject: JQueryEventObject, pv: ProfileModal) : boolean {
        this.trustGraphPopupClient.openPopup({profileId: pv.profile.userId});

        eventObject.stopPropagation();
        return false;
    }
}


const app = angular.module("myApp", []);
app.controller('ExtensionpopupController', ["$scope", ExtensionpopupController]) // bootstrap angular app here 
// app.controller('TabController', ['$scope', function($scope) {
//     $scope.tab = 1;

//     $scope.setTab = function(newTab){
//       $scope.tab = newTab;
//     };

//     $scope.isSet = function(tabNum){
//       return $scope.tab === tabNum;
//     };
// }]);
app.config( [
    '$compileProvider',
    function( $compileProvider )
    {   
        //$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|local|data|chrome-extension):/);
    }
]);




