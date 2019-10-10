import $ = require('jquery');
import * as angular from 'angular';
import 'select2';

import tabs from 'ui-bootstrap4/src/tabs';
import tooltip from 'ui-bootstrap4/src/tooltip';
import 'bootstrap'
import 'angular-inview'

import 'notifyjs-browser';
import 'angular1-star-rating';
import PackageBuilder from "../PackageBuilder";
import DTPService from "../DTPService";
import TrustStrategy from "../TrustStrategy";
import SubjectService from "../SubjectService";
import Crypto from "../Crypto";
import IProfile from '../IProfile';
import ProfileRepository from '../ProfileRepository';
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
import { ClaimValue } from './components/claimValue';


class ExtensionpopupController {

    public static SCOPE: string = "url";

    messageHandler: MessageHandler;
    settingsClient: SettingsClient;
    settings: ISettings;
    tempSettings: ISettings;
    showIcon: boolean = true;
    contentTabId: any;
    dtpIdentity: string;
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

    pageSize: number = 10;
    latestRowIndex: number = 0;
    historyRowIndex: number = 0;

    STATE_START:number =1;
    STATE_ACQUIRING_AUTHTOKEN:number =2;
    STATE_AUTHTOKEN_ACQUIRED:number =3;
  
    state : number = 1;
    
    signin_button: boolean =true;
    xhr_button: boolean = true;
    revoke_button: boolean =true;

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
            this.trustGraphPopupClient.selectProfileHandler = (params, sender) => {  this.selectProfile(params.profile); };
            this.trustGraphPopupClient.requestGraphDataHandler = (params, sender) => { return this.requestGraphDataHandler(params, sender); };

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
            let tab = tabs[0];
            this.contentTabId = tab.id;
            if(tab.url.match(/(http(s)?:\/\/)?(chrome)(:|\.google\.com)/gi))
                return;

            this.getPageProfiles(this.contentTabId).then(async (data: any) => {
                if(!data || data.length == 0 || !data.profiles)
                    return;

                data.profiles.forEach((item:IProfile) => {
                    //  if(item.data && item.data.data)
                    //     item.data = item.data.data;
                     this.pageProfiles.push(new ProfileModal(item, this.settingsProfile));
                    }); // Recreate the ProfileView object!
                this.pageProfilesView = await this.queryProfiles(this.pageProfiles);
            })
        });
    }

    initSubjectSelect() : void {
        let self = this;

        let profileSelect = $('#profileSelect').select2({
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

                    let $request = $.ajax(params);
                    $request.then((data: any, status:string, jqXHR: JQueryXHR) => {
                        if(params.data.term && data.length == 0) {
                            let regex = /^[13nmD][a-km-zA-HJ-NP-Z0-9]{26,33}$/;
                            if(regex.test(params.data.term))
                                data.push(params.data.term);
                        }
                        success(data);
                    });
                    $request.fail(failure);
                    $request.then(success);
                
                    return $request;
                  }
            },
            placeholder: 'Search for a subject by ID',
            minimumInputLength: 0,
            templateResult: this.formatSubjectSelect,
            templateSelection: this.formatSubjectSelection
        });


        profileSelect.on('select2:select', e => {
            this.selectProfileID(e.params.data.id);
            $(e.target).empty(); // Clear the selection of the select box
        });
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
            this.$scope.$apply();
            return;
        }

        let pView = this.pageProfiles.filter(x => x.profile.id === id).pop();
        if(pView) {
            this.selectProfileView(pView);
            return;
        }

        // Try getting the profile from storage
        this.profileRepository.getProfile(id, { id: id }).then(p => {
            this.selectProfile(p);
        });
    }

    selectProfile(profile?: IProfile) : void {
        if(!profile) 
            return;

        let pView = this.pageProfiles.filter(x => x.profile.id === profile.id).pop();
        if(pView) {
            this.selectProfileView(pView);
            return;
        }

        let pm = new ProfileModal(profile, this.settingsProfile, undefined, undefined);
        this.selectProfileView(pm);
    }


    async selectProfileView(profileView: ProfileModal) : Promise<void> {
        if(!profileView) 
            return;

        this.selectedProfile = profileView.profile;
        //this.selectedProfileView = profileView;
        
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


    trustClick($event: JQueryEventObject, profileView: ProfileModal, val: boolean): boolean {
        this.showCommentForm(null, profileView, async () => {
            let modelPackage = await this.submitBinaryTrust(profileView, val.toString(), 0);
            profileView.processPackage(modelPackage, this.trustStrategy);
            this.setInputForm(profileView);
        });

        return false;
    };

    async untrustClick($event: JQueryEventObject, profileView: ProfileModal): Promise<boolean> {
        
        if(profileView.inputForm == "thing") {
            profileView.score = undefined; // Set score to undefined as indication of cancel
            // Set the expire to 1, so claim will never get returned but will replace all previous claims.
            await this.submitRatingTrust(profileView, 1);
        } else {
            await this.submitBinaryTrust(profileView, null, 1);
        }
        profileView.trustResult = null; // Force a requery of the trust
        await this.queryProfiles([profileView]); // Re-query the profile as we no longer trusting the subject diretly

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
        copy(ctrl.innerText);
        $["notify"]("Copied to clipboard", {
            autoHideDelay: 1000,
            className: 'info'
        });
    }

    public async requestGraphDataHandler(params: any, sender: Runtime.MessageSender) : Promise<IGraphData> {
        // Get the profile from the list of visible profiles
        let profileView = this.pageProfilesView.filter(pv=>pv.profile.id === params.profileId).pop();


        let dialogData = {
            scope: "url",
            currentUserId: this.settings.address,
            subjectProfileId: params.profileId,
            //profiles: this.pageProfilesView.map(pv => pv.profile),
            queryResult: profileView.queryResult,
        } as IGraphData;

        return dialogData;
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
        this.showCommentForm($event, pv, async () => {
            let modelPackage = await this.submitRatingTrust(pv, 0);
            pv.processPackage(modelPackage, this.trustStrategy);
            this.setInputForm(pv);
            //this.$scope.$apply(() => );
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

    async submitBinaryTrust (profileView: ProfileModal, value: string, expire: number): Promise<ModelPackage> {
        profileView.processing = true;
        let trustPackage: ModelPackage = null;

        try {

            trustPackage = this.subjectService.CreatePackage(this.subjectService.CreateBinaryClaim(profileView, value, ExtensionpopupController.SCOPE, expire));
            this.subjectService.addAliasClaim(profileView, ExtensionpopupController.SCOPE, 0, trustPackage);

            this.packageBuilder.SignPackage(trustPackage);
            let response = await this.dtpService.PostPackage(trustPackage);
            console.log("Posting package is a "+response.status);
            
        } catch(xhr) {
            this.showFatalError(AjaxErrorParser.formatErrorMessage(xhr, ""));
        }
        return trustPackage;
    }

    async submitRatingTrust (profileView: ProfileModal, expire: number): Promise<ModelPackage> {
        profileView.processing = true;
        let trustPackage: ModelPackage = null;
        try {
            trustPackage = this.subjectService.CreatePackage(this.subjectService.CreateRatingClaim(profileView, ExtensionpopupController.SCOPE, expire));
            this.subjectService.addAliasClaim(profileView, ExtensionpopupController.SCOPE, 0, trustPackage);

            this.packageBuilder.SignPackage(trustPackage);
            let response = await this.dtpService.PostPackage(trustPackage);
            console.log("Posting package is a "+response.status);

        } catch(xhr) {
            this.showFatalError(AjaxErrorParser.formatErrorMessage(xhr, ""));
        }
        return trustPackage;

    }

    

    setInputForm(pv : ProfileModal) : void {
        pv.commentContainerVisible = false; // Default hide the comment container
        pv.inputFormContainerVisible = true;
    }

    getStringFromBuffer(data: any) : string {
        if(!data)
            return "";
        return data;
        // let source = (data.data) ? data.data : data;

        // if(typeof source === 'string')
        //     return Buffer.from(data, 'base64').toString("utf-8");
        // else
        //     return Buffer.from(data).toString("utf-8");

        //return typeof data;
    }

    async commentsModalOpen(pv : ProfileModal) : Promise<void> {
        //this.selectedProfileView = pv;
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




    
    openUrl() : void {
        chrome.tabs.update({
            url: this.getStringFromBuffer(this.selectedProfile.data)
       });
       window.close();
    }

    getProfileTitle(profile: IProfile, defaultTitle: string = '(Unknown)') : string {
        if(!profile)
            return defaultTitle;

        if(profile.title)
            return profile.title;
            
        if(profile.data) 
            return this.getStringFromBuffer(profile.data);
        
        return defaultTitle;
    }

    showPageTab(id: string, profile?: IProfile) : void {
        if(profile && id == profile.id) {
            this.profileRepository.setProfile(profile);
            this.selectProfile(profile);
        }
        if(id) {
            this.selectProfileID(id);
        }
        this.tabIndex = 0;
    }
    



    latestInView(index: number, inview: boolean, inviewpart) {
        if(inview && index == this.latestRowIndex-1)
            this.lastestLoadBatch();
    }

    lastestClick() : boolean {
        if(this.latestClaims.length == 0) 
            this.lastestLoadBatch();

        return false;
    }

    async lastestLoadBatch() : Promise<void> {
        let arr = await this.dtpService.getLastest(this.latestRowIndex, this.pageSize);
        arr.forEach(p => {
           if(!p.issuer.meta) p.issuer.meta = {};
           if(!p.subject.meta) p.subject.meta = {};
           this.latestClaims.push(p);
        });
        this.latestRowIndex += this.pageSize;
   }


   historyInView(index: number, inview: boolean, inviewpart) {
    if(inview && index == this.historyRowIndex-1)
        this.historyLoadBatch();
    }

    historyClick() : boolean {
        if(this.historyClaims.length == 0)
            this.historyLoadBatch();

        return false;
    }

    async historyLoadBatch() : Promise<void> {
       let arr = await this.dtpService.getHistory(this.settings.address, this.historyRowIndex, this.pageSize);
       arr.forEach(p => {
          if(!p.issuer.meta) p.issuer.meta = {};
          if(!p.subject.meta) p.subject.meta = {};
          this.historyClaims.push(p);
       });
       
       this.historyRowIndex += this.pageSize;
  }
}


const app = angular.module("myApp", ['angular-inview','star-rating', tabs, tooltip]);

app.component("claimValue", ClaimValue)

// Use Angular's Q object as Promise. This is needed to make async/await work properly with the UI.
// See http://stackoverflow.com/a/41825004/536
app.run($q => { window.Promise = $q; });

app.controller('ExtensionpopupController', ["$scope", "$window", "$document", ExtensionpopupController]);


app.config( [
    '$compileProvider',
    function( $compileProvider )
    {   
        //$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|local|data|chrome-extension):/);
    }
]);

