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
    profileListView: Array<ProfileModal> = [];
    tempProfileView: object = {};
    settingsProfile : IProfile = null;
    selectedProfileView: ProfileModal = null;

    constructor(private $scope: ng.IScope, private $window: ng.IWindowService) {
    }

    init() {
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

            chrome.tabs.query({active: true, currentWindow: true}, tabs => {
                this.contentTabId = tabs[0].id;
                this.getPageProfiles(this.contentTabId).then((data: any) => {
                    if(!data || data.length == 0 || !data.profiles)
                        return;

                    data.profiles.forEach(item=> this.pageProfiles.push(new ProfileModal(item))); // Recreate the ProfileView object!
                    this.profileListView = this.pageProfiles;

                    this.queryProfileListView();
                })
            });

            let key = this.settings.password + this.settings.seed;

            if(!key || key == "" || key.length == 0) {
                $('#userModal').modal('show');
            }
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
            this.profileListView = this.pageProfiles;
            this.$scope.$apply();
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

    selectProfile(profileView: ProfileModal) : void {
        if(profileView) 
            this.profileListView = [profileView];

        this.queryProfileListView();
    }

    queryProfileListView() : void {
        this.queryProfiles(this.profileListView).then((success)=> { if(success) this.$scope.$apply() });
    }


    async loadCommentsClaims(): Promise<Array<Claim>> {
        if(!$('#profileCommentsModal').hasClass('show'))
            return null;

        await this.selectedProfileView.trustResult.ensureProfileMeta(this.profileRepository);
        
        return this.selectedProfileView.trustResult.claims;
    }

    saveClick(formId: string) : boolean {
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

        if(addressChanged) {
            // Make sure to remove all trust data from profiles as it needs to reload
            this.pageProfiles.forEach(item => item.resetValues());
            this.profileListView.forEach(item => item.resetValues());
            this.queryProfileListView(); // Reload the trust values
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
                this.$scope.$apply();
            });
        });

        return false;
    };

    distrustClick($event: JQueryEventObject, profileView: ProfileModal): boolean {
        this.showCommentForm(null, profileView, () => {
            this.submitBinaryTrust(profileView, "false", 0).then(() => {
                this.setInputForm(profileView);
                this.$scope.$apply();
            });
        });

        return false;
    }

    untrustClick($event: JQueryEventObject, profileView: ProfileModal): boolean {
        this.submitBinaryTrust(profileView, null, 1);
        return false;
    }
    

    queryProfiles(profileViews: Array<ProfileModal>) : Promise<boolean> {
        let scope = "url";
        let profiles = profileViews.filter(p=>!p.trustResult).map(p=>p.profile);

        return this.dtpService.Query(profiles, scope).then((response,body:any) => {
            if(body == null)
                return false;

            let trustResults = this.trustStrategy.createTrustResults(body) || {};
            profileViews.forEach((pv) => {
                 pv.queryResult = body;
                 pv.trustResult = trustResults[pv.profile.id] || new BinaryTrustResult();
                 pv.setup();
            });
            return true;
        }).fail((xhr, exception) => {
            this.showFatalError(AjaxErrorParser.formatErrorMessage(xhr, exception));
        });
    }

    showFatalError(msg : any ): void {
        this.showError = true;
        if(typeof msg === "string")
            this.errorMessage = msg;
        else
            this.errorMessage = msg.message;

        this.$scope.$apply();
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
        let profile = this.profileListView.filter(pv=>pv.profile.id === params.profileId).pop();


        let dialogData = {
            scope: "url",
            currentUserId: this.settings.address,
            subjectProfileId: params.profileId,
            profiles: this.profileListView.map(pv => pv.profile),
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
        pv.ratingStarsContainerVisible = false;
        pv.trustButtonContainerVisible = false;
        pv.commentContainerVisible = true;
        pv.commentSubmitCallback = callback;
    }


    onRatingChange($event: JQueryEventObject, pv: ProfileModal) : void {

        this.tempProfileView[pv.profile.id] = $.extend({}, pv);
        pv.score = +((<any>$event).rating); // Convert to number no matter what format
        this.showCommentForm($event, pv, () => {
            this.submitRatingTrust(pv, 0).then(() => {
                this.setInputForm(pv);
                this.$scope.$apply();
            })
        });
    }


    commentSubmit($event: JQueryEventObject, pv: ProfileModal) : void {

        if(pv.commentSubmitCallback) {
            pv.commentSubmitCallback();
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

        let trustPackage = this.subjectService.CreatePackage(this.subjectService.CreateBinaryClaim(profileView.profile, value, undefined, ExtensionpopupController.SCOPE, expire));
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
        pv.ratingStarsContainerVisible = false;
        pv.trustButtonContainerVisible = false;
        switch(pv.inputForm) {
            case "identity" : pv.trustButtonContainerVisible = true; break;
            case "thing" : pv.ratingStarsContainerVisible = true; break;
        }
    }

    getStringFromBuffer(data: any) : string {
        if(typeof data === 'string')
            return Buffer.from(data, 'base64').toString("utf-8");

        return typeof data;
    }

}


const app = angular.module("myApp", ['star-rating', tabs, tooltip]);
//     .filter('to_html', ['$sce', function($sce){
//     return function(text) {
//         return $sce.trustAsHtml(text);
//     };
// }]);
//app.run($q => { window.Promise = $q; });
// app.run(["$q",
//     function ($q: ng.IQService) {
//         // Use Angular's Q object as Promise. This is needed to make async/await work properly with the UI.
//         // See http://stackoverflow.com/a/41825004/536
//         window["Promise"] = $q;
//     }]);

app.controller('ExtensionpopupController', ["$scope", "$window", ExtensionpopupController]);


app.config( [
    '$compileProvider',
    function( $compileProvider )
    {   
        //$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|local|data|chrome-extension):/);
    }
]);

