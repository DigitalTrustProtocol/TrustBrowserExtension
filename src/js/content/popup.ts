import $ = require('jquery');
import * as angular from 'angular';
import 'select2';

import tabs from 'ui-bootstrap4/src/tabs';
import tooltip from 'ui-bootstrap4/src/tooltip';
import 'bootstrap'
import 'angular-inview'
// import 'bootstrap/js/dist/button'
// import 'bootstrap/js/dist/modal'


import '../common.js';
import 'notifyjs-browser';
import 'angular1-star-rating';

import PackageBuilder from "../PackageBuilder";
import DTPService from "../DTPService";
import TrustStrategy from "../TrustStrategy";
import SubjectService from "../SubjectService";
import Crypto from "../Crypto";
import IProfile from '../IProfile';
import ProfileRepository from "../ProfileRepository";
import BinaryTrustResult from "../Model/BinaryTrustResult";
import * as vis2 from "vis";
import { Buffer } from 'buffer';
import ISiteInformation from '../Model/SiteInformation.interface';
import ISettings from '../Interfaces/Settings.interface';
import SettingsClient from "../Shared/SettingsClient";
import { MessageHandler, Callback } from '../Shared/MessageHandler';
import Settings from "../Shared/Settings";
import { ProfileModal } from "../Model/ProfileModal";
import { browser, Windows, Runtime, Tabs } from "webextension-polyfill-ts";
import { StorageClient } from "../Shared/StorageClient";
import { TrustGraphPopupClient } from '../Shared/TrustGraphPopupClient';
import IGraphData from './IGraphData';
import IOpenDialogResult from '../Model/OpenDialogResult.interface';
import { TrustGraphPopupServer } from '../background/TrustGraphPopupServer';
import { QueryContext, ModelPackage } from '../../lib/dtpapi/model/models.js';
import { DtpGraphCoreModelQueryContext } from '../../lib/typescript-jquery-client/model/models.js';
import { KeywordsProvider } from '../Shared/Keywords';
import { Claim } from '../../lib/dtpapi/model/Claim';
import AjaxErrorParser from "../Shared/AjaxErrorParser";
import Identicon from "../Shared/Identicon";
import copy from "copy-to-clipboard";
import { LatestClaims } from './components/latest';


class ExtensionpopupController {

    public static SCOPE: string = "url";

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
    showError: boolean;
    errorMessage: string;
    pageProfiles: Array<ProfileModal> = [];
    pageProfilesView: Array<ProfileModal> = [];
    tempProfileView: object = {};
    settingsProfile : IProfile = null;
    selectedProfileView: ProfileModal = null;
    commentClaims: Array<Claim> = [];
    latestClaims: Array<Claim> = [];
    historyClaims: Array<Claim> = [];
    selectedProfile: IProfile;
    tabIndex: number = 0;

    constructor(private $scope: ng.IScope, private $window: ng.IWindowService, private $document: ng.IDocumentService) {
        $document.ready(() => angular.bind(this, this.init)());
    }

    init(jqueryAlias: any) : void {
        this.messageHandler = new MessageHandler();
        this.storageClient = new StorageClient(this.messageHandler);

        this.settingsClient = new SettingsClient(this.messageHandler);
        this.settingsClient.loadSettings().then((settings: ISettings) => {
            this.settings = settings || new Settings();
            this.tempSettings = $.extend({},this.settings);

            this.settingsProfile = <IProfile>{ id: this.settings.address, title: "You" };

            this.dtpService = new DTPService(this.settings);
            this.profileRepository = new ProfileRepository(this.storageClient, this.dtpService);
            this.packageBuilder = new PackageBuilder(this.settings);
            this.subjectService = new SubjectService(this.settings, this.packageBuilder);
            this.trustStrategy = new TrustStrategy(this.settings, this.profileRepository);
            this.showIcon = (this.settings.identicon || this.settings.identicon.length > 0) ? true : false;
            this.trustGraphPopupClient = new TrustGraphPopupClient(this.messageHandler);
            // Bind events
            this.trustGraphPopupClient.updateContentHandler = (params, sender) => { this.updateContentHandler(params, sender); };
            this.trustGraphPopupClient.requestSubjectHandler = (params, sender) => { return this.requestSubjectHandler(params, sender); };

            this.initSubjectSelect();

            let key = this.settings.password + this.settings.seed;

            if(!key || key == "" || key.length == 0) {
                $('#userModal').modal('show');
            } else {
                this.loadProfilesFromContentPage();
            }
        });
    }

    loadProfilesFromContentPage() : void {
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
            this.contentTabId = tabs[0].id;
            this.getPageProfiles(this.contentTabId).then(async (data: any) => {
                if(!data || data.length == 0 || !data.profiles)
                    return;

                data.profiles.forEach((item:IProfile) => {
                     if(item.data && item.data.data)
                        item.data = item.data.data;
                     this.pageProfiles.push(new ProfileModal(item));
                    }); // Recreate the ProfileView object!
                this.pageProfilesView = await this.queryProfiles(this.pageProfiles);
            })
        });
    }

    initSubjectSelect() : void {
        let self = this;

        $('.userSelectContainer').select2({
            ajax: {
                url: this.settings.infoserver+'/api/Identity/search/id',
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
                transport: function (params: any, success, failure) {
                    if(!params.data.term || params.data.term.length == 0) {
                        let arr = [{ text: "Page content", id:"-1"}];

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



    selectProfileID(id: string) : void {
        if(id === "-1") {
            this.pageProfilesView = this.pageProfiles;
            return;
        }

        let f = this.pageProfiles.filter(x => x.profile.id === id);
        if(f.length > 0) {
            this.selectProfile(f[0]);
        }
        else
            // Try getting the profile from storage
            this.profileRepository.getProfile(id, { id: id }).then(p => {
                let pm = new ProfileModal(p, undefined, undefined);
                this.selectProfile(pm);
            });
    }

    async selectProfile(profileView: ProfileModal) : Promise<void> {
        if(!profileView) 
            return;
        
        this.pageProfilesView = await this.queryProfiles([profileView]);
    }

    async saveClick(formId: string) : Promise<boolean> {
        if(!this.validateForm(formId, true))
            return false;

       
        this.tempSettings.aliasChanged = this.settings.alias != this.tempSettings.alias;

        if(!this.tempSettings.password) this.tempSettings.password = "";
        if(!this.tempSettings.seed) this.tempSettings.seed = "";
        if(!this.tempSettings.alias) this.tempSettings.alias = "";

        this.settingsClient.buildKey(this.tempSettings);
        let addressChanged = this.settings.address != this.tempSettings.address;
        this.settings = $.extend(this.settings, this.tempSettings);

        if (this.settings.rememberme)
            this.settingsClient.saveSettings(this.settings);
        
        this.settingsProfile.id = this.settings.address;
        this.settingsProfile.title = this.settings.alias;

        this.profileRepository.setProfile(this.settingsProfile);

        if(this.pageProfiles.length == 0) {
            await this.loadProfilesFromContentPage();
        } else {
            if(addressChanged) {
                // Make sure to remove all trust data from profiles as it needs to reload
                this.pageProfiles.forEach(item => item.resetValues());
                this.pageProfilesView.forEach(item => item.resetValues());
                await this.queryProfiles(this.pageProfilesView);
            }
        }


        return true;
    }

    cancelClick(formId: string) : boolean {
        this.tempSettings = $.extend(this.tempSettings, this.settings);
        this.validateForm(formId, false);
        return false;
    }


    validateForm(id: string, active: boolean) : boolean {
        if(!id) return true;
        
        var form = $(id);
        if(!active) {
            form.removeClass('was-validated');
            return true;  
        }

        if ((<any>form[0]).checkValidity() === false) {
            event.preventDefault()
            event.stopPropagation()
            form.addClass('was-validated');
            return false;
          }
          
          form.removeClass('was-validated');
          return true;
    }


    trustClick($event: JQueryEventObject, profileView: ProfileModal): boolean {
        this.showCommentForm(null, profileView, () => {
            this.submitBinaryTrust(profileView, "true", 0).then(() => {
                this.setInputForm(profileView);
            });
        });

        return false;
    };

    distrustClick($event: JQueryEventObject, profileView: ProfileModal): boolean {
        this.showCommentForm(null, profileView, () => {
            this.submitBinaryTrust(profileView, "false", 0).then(() => {
                this.setInputForm(profileView);
            });
        });

        return false;
    }

    untrustClick($event: JQueryEventObject, profileView: ProfileModal): boolean {
        this.submitBinaryTrust(profileView, null, 1);
        return false;
    }
    

    async queryProfiles(profileViews: Array<ProfileModal>) : Promise<Array<ProfileModal>> {
        let scope = "url";
        let profiles = profileViews.filter(p=>!p.trustResult).map(p=>p.profile);

        try {
            let body = <any>await this.dtpService.Query(profiles, scope);

            if(body == null)
                return profileViews;

            let trustResults = this.trustStrategy.createTrustResults(body) || {};
            profileViews.forEach((pv) => {
                 pv.queryResult = body;
                 pv.trustResult = trustResults[pv.profile.id] || new BinaryTrustResult();
                 pv.setup();
            });

        } catch(xhr) {
            this.showFatalError(AjaxErrorParser.formatErrorMessage(xhr, ""));
        }

        return profileViews;
    }

    showFatalError(msg : any ): void {
        this.showError = true;
        if(typeof msg === "string")
            this.errorMessage = msg;
        else
            this.errorMessage = msg.message;
    }
   
    modelChange(state?: string) {
        if (state === 'identicon') {
            this.settingsClient.buildKey(this.tempSettings);

              this.tempSettings.identicon = Identicon.createIcon(this.tempSettings.address);
              this.showIcon = true
        }
    }

    copyToClipboard(controlId: string) : void {

        let ctrl = document.getElementById(controlId);
        copy(ctrl.innerHTML);
        $["notify"]("Copied to clipboard", {
            autoHideDelay: 1000,
            className: 'info'
        });
    }

    public async requestSubjectHandler(params: any, sender: Runtime.MessageSender) : Promise<IGraphData> {
        // Get the profile from the list of visible profiles
        let profile = this.pageProfilesView.filter(pv=>pv.profile.id === params.profileId).pop();


        let dialogData = {
            scope: "url",
            currentUserId: this.settings.address,
            subjectProfileId: params.profileId,
            profiles: this.pageProfilesView.map(pv => pv.profile),
            queryResult: profile.queryResult,
        } as IGraphData;

        return dialogData;
    }

    updateContentHandler(params, sender) : void {
        let pv = new ProfileModal().setup(params.profileView);
        this.selectProfile(pv);
    }

    
    getPageProfiles(tabId: any) : Promise<Array<IProfile>> {
        let command = {
            handler: "profileHandler",
            action: "getProfiles"
        }
        const promise = browser.tabs.sendMessage(tabId, command);
        promise.catch((msg) => this.showFatalError(msg));
        return promise;
    }


    openGraphClick(eventObject: JQueryEventObject, pv: ProfileModal) : boolean {
        this.trustGraphPopupClient.openPopup({profileId: pv.profile.id});

        eventObject.stopPropagation();
        return false;
    }
    
    showCommentForm(eventObject: JQueryEventObject, pv: ProfileModal, callback?: any) : void {
        pv.inputFormContainerVisible = false;
        pv.commentContainerVisible = true;
        pv.commentSubmitCallback = callback;
    }


    onRatingChange($event: JQueryEventObject, pv: ProfileModal) : void {

        this.tempProfileView[pv.profile.id] = $.extend({}, pv);
        pv.score = +((<any>$event).rating); // Convert to number no matter what format
        this.showCommentForm($event, pv, () => {
            this.submitRatingTrust(pv, 0).then(() => {
                
                this.$scope.$apply(() => this.setInputForm(pv));
            })
        });
    }


    commentSubmit($event: JQueryEventObject, pv: ProfileModal) : void {

        if(pv.commentSubmitCallback) {
            angular.bind(this, pv.commentSubmitCallback)();
        } else {
            this.setInputForm(pv);
        }
    }

    commentCancel($event: JQueryEventObject, pv: ProfileModal) : void {
        $.extend(pv, <ProfileModal>this.tempProfileView[pv.profile.id]);
        
        // Reset values first
        // Update profile view
        this.setInputForm(pv);
    }

    submitBinaryTrust (profileView: ProfileModal, value: string, expire: number): JQueryPromise<ProfileModal> {
        profileView.processing = true;

        let trustPackage = this.subjectService.CreatePackage(this.subjectService.CreateBinaryClaim(profileView, value, undefined, ExtensionpopupController.SCOPE, expire));
        this.subjectService.addAliasClaim(profileView, ExtensionpopupController.SCOPE, 0, trustPackage);

        this.packageBuilder.SignPackage(trustPackage);
        return this.dtpService.PostPackage(trustPackage).then((response)=> {
            console.log("Posting package is a "+response.status);
           
            profileView.queryResult = <QueryContext>{
                issuerCount: 1,
                subjectCount: 1,
                results: trustPackage,
                errors: []
            } 

            let results = this.trustStrategy.createTrustResults(profileView.queryResult);
            profileView.trustResult = results[profileView.profile.id];
            profileView.setup();
            profileView.processing = false;
            return profileView;
        }).fail((xhr, exception) => { 
            this.showFatalError(exception);
        });
    }

    submitRatingTrust (profileView: ProfileModal, expire: number): JQueryPromise<ProfileModal> {
        profileView.processing = true;
        let trustPackage = this.subjectService.CreatePackage(this.subjectService.CreateRatingClaim(profileView, ExtensionpopupController.SCOPE, expire));
        this.subjectService.addAliasClaim(profileView, ExtensionpopupController.SCOPE, 0, trustPackage);


        this.packageBuilder.SignPackage(trustPackage);
        return this.dtpService.PostPackage(trustPackage).then((response)=> {
            console.log("Posting package is a "+response.status);
           
            profileView.queryResult = <QueryContext>{
                issuerCount: 1,
                subjectCount: 1,
                results: trustPackage,
                errors: []
            } 

            let results = this.trustStrategy.createTrustResults(profileView.queryResult);
            profileView.trustResult = results[profileView.profile.id];
            profileView.setup();
            profileView.processing = false;
            return profileView;
        }).fail((xhr, exception) => { 
            this.showFatalError(exception);
        });
    }

    setInputForm(pv : ProfileModal) : void {
        pv.commentContainerVisible = false; // Default hide the comment container
        pv.inputFormContainerVisible = true;
    }

    getStringFromBuffer(data: any) : string {
        if(!data)
            return "";
            
        let source = (data.data) ? data.data : data;

        if(typeof source === 'string')
            return Buffer.from(data, 'base64').toString("utf-8");
        else
            return Buffer.from(data).toString("utf-8");

        //return typeof data;
    }

    async commentsModalOpen(pv : ProfileModal) : Promise<void> {
        this.selectedProfileView = pv;
        this.commentClaims = await this.loadCommentsClaims(pv);
    }
    
    async loadCommentsClaims(pv : ProfileModal): Promise<Array<Claim>> {
        let claims = await Promise.all(pv.trustResult.claims.map(async claim=> {
            if(claim.issuer.meta)
                return claim;
            
            let r = <Claim>await this.dtpService.getClaimInline(claim);
            if(!r)
                r = claim;
            if(!r.issuer.meta)
                r.issuer.meta = <IProfile>{};
            
            if(!r.issuer.meta.title)
                r.issuer.meta.title = "(No Title)";

            return r;
        }));
        pv.trustResult.claims = claims;
        return claims;
    }

    toDate(unixDate: number): string {
        return (new Date(unixDate*1000)).toLocaleDateString();
    }


    async lastestClick() : Promise<boolean> {
         let arr = await this.dtpService.getLastest(0, 10);
         arr.forEach(p => {
            if(!p.issuer.meta) p.issuer.meta = {};
            if(!p.subject.meta) p.subject.meta = {};
         });
            
         this.latestClaims = arr;
        return false;
    }

    async historyClick() : Promise<boolean> {
        let arr = await this.dtpService.getHistory(this.settings.address, 0, 10);
        arr.forEach(p => {
           if(!p.issuer.meta) p.issuer.meta = {};
           if(!p.subject.meta) p.subject.meta = {};
        });
           
        this.historyClaims = arr;
       return false;
   }

    
    openUrl() : void {
        chrome.tabs.update({
            url: this.getStringFromBuffer(this.selectedProfile.data)
       });
       window.close();
    }

    showPageTab(id?: string) : void {
        if(id)
            this.selectProfileID(id);
        this.tabIndex = 0;
    }
    

}


const app = angular.module("myApp", ['star-rating', tabs, tooltip]);

// app.component("latestClaims", LatestClaims)

//     .filter('to_html', ['$sce', function($sce){
//     return function(text) {
//         return $sce.trustAsHtml(text);
//     };
// }]);
//app.run($q => { window.Promise = $q; });
app.run(["$q",
    function ($q: ng.IQService) {
        // Use Angular's Q object as Promise. This is needed to make async/await work properly with the UI.
        // See http://stackoverflow.com/a/41825004/536
        window["Promise"] = $q;
    }]);

app.controller('ExtensionpopupController', ["$scope", "$window", "$document", ExtensionpopupController]);


app.config( [
    '$compileProvider',
    function( $compileProvider )
    {   
        //$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|local|data|chrome-extension):/);
    }
]);

