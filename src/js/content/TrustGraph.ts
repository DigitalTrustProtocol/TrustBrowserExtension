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
import { ModelPackage, QueryContext, Claim } from '../../lib/dtpapi/model/models.js';
import ProfileModal = require('../Model/ProfileModal');
import TrustGraphDataAdapter = require('./TrustGraphDataAdapter');
import * as localforage from 'localforage';
import { MessageHandler } from '../Shared/MessageHandler';
import { TrustGraphPopupClient } from '../Shared/TrustGraphPopupClient';
import { StorageClient } from '../Shared/StorageClient';
import SettingsClient = require('../Shared/SettingsClient');
import ISettings from "../Interfaces/Settings.interface";
import notify = require("notifyjs");
import IGraphData from './IGraphData';
import * as $ from 'jquery';
import Url = require('url-parse');
import IOpenDialogParameters from '../Model/OpenDialogParameters.interface.js';
import { Runtime } from "webextension-polyfill-ts";


declare var window: any;
window.jQuery = $;

class TrustGraphController {
    settingsClient: SettingsClient;
    settings: any;
    packageBuilder: any;
    subjectService: SubjectService;
    dtpService: DTPService;
    contentTabId: number;
    network: any;
    profileRepository: ProfileRepository;
    currentUser: IProfile;
    selectedProfile: IProfile;
    trustStrategy: TrustStrategy;

    modalData: ProfileModal;
    source: IGraphData;
    profileIndex: object;
    trustResults: object;


    dataAdapter: TrustGraphDataAdapter;
    messageHandler: MessageHandler;
    storageClient: StorageClient; 
    trustGraphPopupClient: TrustGraphPopupClient;

    constructor(private $scope: ng.IScope) {
    }

    init() {
        this.messageHandler = new MessageHandler();
        this.storageClient = new StorageClient(this.messageHandler);
        this.trustGraphPopupClient = new TrustGraphPopupClient(this.messageHandler);

   
        SiteManager.GetUserContext().then((userContext) => {
            this.settingsClient = new SettingsClient(this.messageHandler, userContext);
            this.settingsClient.loadSettings((settings) => {
                this.settings = settings;
                this.profileRepository = new ProfileRepository(this.storageClient);
                this.packageBuilder = new PackageBuilder(settings);
                this.subjectService = new SubjectService(settings, this.packageBuilder);
                this.dtpService = new DTPService(settings);
                this.trustStrategy = new TrustStrategy(this.settings, this.profileRepository);

                this.trustGraphPopupClient.showSubjectHandler = (params: any, sender: Runtime.MessageSender) => { 
                    this.loadOnData(params.data);
                };

                let url = new Url(location.href, true);
                this.trustGraphPopupClient.requestSubject(url.query.profileId).then(data => {
                    this.loadOnData(data);
                });
            });
        });
    }

    private loadOnData(source: IGraphData) : void {
        this.network = this.buildNetwork(source);
    }

    private buildNetwork(source: IGraphData) : any {

        this.source = source;

        this.buildProfiles(source).then(() => {

            this.dataAdapter = new TrustGraphDataAdapter(source, this.profileIndex);
            this.dataAdapter.load();

            let options = this.networkOptions();
            let container = document.getElementById('networkContainer');

            let nw = new vis2.Network(container, this.dataAdapter.getGraph(), options);

            nw.on("select", (params) => {
                if(params.nodes.length == 0)
                    this.hideModal();
                else 
                    this.showModal(params.nodes[0]);
            });

            return nw;
        });

    }

    private async buildProfiles(source: IGraphData) : Promise<void> {

        this.trustResults = this.trustStrategy.ProcessClaims(source.queryResult.results.claims);

        this.profileIndex = {};
        this.currentUser = await this.profileRepository.getProfile(source.currentUserId); // source.profiles.filter(p=>p.userId === source.currentUserId).pop();
        if(!this.currentUser) {
            this.currentUser = new Profile({userId: source.currentUserId, alias: "(You)" });
        }
        this.profileIndex[source.currentUserId] = this.currentUser;

        this.selectedProfile = source.profiles.filter(p=>p.userId == source.subjectProfileId).pop();
        this.profileIndex[source.subjectProfileId] = this.selectedProfile;


        for(let key in this.trustResults) {
            let profile = source.profiles.filter(p=>p.userId === key).pop();
            if(!profile) {
                profile = await this.profileRepository.getProfile(key);
                this.profileIndex[key] = profile;
            }

            profile.trustResult = this.trustResults[key];
        }
    }

    private networkOptions() : any {
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

    showModal(profileId: any) : void {

        let profile = this.profileIndex[profileId];
        if(!profile.trustResult) {
            profile.trustResult = this.trustResults[profileId] || new BinaryTrustResult();
            // let arr = {};
            // for(let key in profile.trustResult.claims) {
            //     let claim = profile.trustResult.claims[key] as Claim;
            //     arr[claim.issuer.id] = claim;
            // }
            // profile.trustResult.claims = arr;
        }

        this.modalData = new ProfileModal(profile, profile["trustResult"], profile["queryResult"]);
    
        this.$scope.$apply();
        // Show dtpbar
        this.setToCenterOfParent( $('#networkModal'), document.body, false, false);
        //$("#networkModal").finish().show();
        $('#networkModal').modal('show');
    }
    

    hideModal(): void {
        if($('#networkModal').is(':visible'))
            $("#networkModal").modal('hide');
            //$("#networkModal").hide();
    }



    trustClick() {
        this.buildAndSubmitBinaryTrust(this.modalData.profile, "true", 0, this.modalData.profile.alias + " trusted");
        return false;
    };

    distrustClick () {
        this.buildAndSubmitBinaryTrust(this.modalData.profile, "false", 0, this.modalData.profile.alias + " distrusted");
        return false;
    }

    untrustClick() {
        this.buildAndSubmitBinaryTrust(this.modalData.profile, null, 1, this.modalData.profile.alias + " untrusted");

        return false;
    }

    buildAndSubmitBinaryTrust (profile: IProfile, value: string, expire: number, message: string): JQueryPromise<any> {
        //this.modalData.disableButtons();
        this.modalData.processing = true;
        profile.scope = this.source.scope;
        var trustPackage = this.subjectService.BuildBinaryClaim(profile, value, undefined, this.source.scope, expire);
        this.packageBuilder.SignPackage(trustPackage);
        return this.dtpService.PostPackage(trustPackage).done((trustResult)=> {
            console.log("Posting package is a "+trustResult.status);
           
            $["notify"](message, 'success');

            this.updateNetwork(trustPackage);
            profile.queryResult.results = trustPackage;
            profile.trustResult = new BinaryTrustResult();
            profile.trustResult.claims.push(trustPackage.claims[0]);
            profile.trustResult.processClaim(profile.trustResult.claims[0], this.source.currentUserId);

            this.trustGraphPopupClient.updateContent(profile);
           
            this.hideModal(); 
        }).fail((trustResult) => { 
            $["notify"]("Adding trust failed: " +trustResult.message,"fail");
            this.hideModal(); 
        });
    }

    updateNetwork(trustPackage: ModelPackage) : void {

        for(let key in trustPackage.claims) {
            let claim = trustPackage.claims[key];
            this.dataAdapter.updateWithClaim(claim);
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
}



const app = angular.module("myApp", []);
app.controller('TrustGraphController', ["$scope", TrustGraphController]) // bootstrap angular app here 
app.config( [
    '$compileProvider',
    function( $compileProvider )
    {   
        //$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|local|data|chrome-extension):/);
    }
]);
