import * as angular from 'angular';
import '../common.js';
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
import { QueryContext, Claim } from '../../lib/dtpapi/model/models.js';
import { ModelPackage } from '../../lib/dtpapi/model/ModelPackage';
import { ProfileModal } from "../Model/ProfileModal";
import TrustGraphDataAdapter from "./TrustGraphDataAdapter";
import * as localforage from 'localforage';
import { MessageHandler } from '../Shared/MessageHandler';
import { TrustGraphPopupClient } from '../Shared/TrustGraphPopupClient';
import { StorageClient } from '../Shared/StorageClient';
import SettingsClient from "../Shared/SettingsClient";
import ISettings from "../Interfaces/Settings.interface";
import IGraphData from './IGraphData';
import * as $ from 'jquery';
import Url from "url-parse";
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
   
        this.settingsClient = new SettingsClient(this.messageHandler);
        this.settingsClient.loadSettings((settings) => {
            this.settings = settings;
            this.dtpService = new DTPService(settings);
            this.profileRepository = new ProfileRepository(this.storageClient, this.dtpService);
            this.packageBuilder = new PackageBuilder(settings);
            this.subjectService = new SubjectService(settings, this.packageBuilder);
            this.trustStrategy = new TrustStrategy(this.settings, this.profileRepository);

            this.trustGraphPopupClient.showSubjectHandler = (params: any, sender: Runtime.MessageSender) => { 
                this.loadOnData(params.data);
            };

            let url = new Url(location.href, true);
            this.trustGraphPopupClient.requestSubject(url.query.profileId).then(data => {
                this.loadOnData(data);
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
                if(params.nodes.length > 0) {
                    let profileId = params.nodes[0];
                    let pv = this.profileIndex[profileId];
                    this.trustGraphPopupClient.updateContent(pv);
                }
            });

            return nw;
        });

    }

    private async buildProfiles(source: IGraphData) : Promise<void> {

        this.trustResults = this.trustStrategy.ProcessClaims(source.queryResult.results.claims);

        this.profileIndex = {};
        this.selectedProfile = source.profiles.filter(p=>p.id == source.subjectProfileId).pop();
        let subjectView = this.profileIndex[source.subjectProfileId] = new ProfileModal(this.selectedProfile);

        let currentUserProfile = await this.profileRepository.getProfile(source.currentUserId,{id: source.currentUserId, title: "(You)" }); // source.profiles.filter(p=>p.userId === source.currentUserId).pop();

        let cu = this.profileIndex[source.currentUserId] = new ProfileModal(currentUserProfile);
        cu.currentUser = currentUserProfile;
        cu.subjectProfile = subjectView.profile;

        for(let key in this.trustResults) {
            let profile = source.profiles.filter(p=>p.id === key).pop();
            if(!profile) {
                profile = await this.profileRepository.getProfile(key);
            }

            let pv = this.profileIndex[key] = new ProfileModal(profile);
            pv.trustResult = this.trustResults[key];
            pv.subjectProfile = subjectView.profile;
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
                borderWidth: 3,
                size: 20,
                color: {
                    border: '#222222',
                    background: '#ffffff'
                },
                shadow: true,
                font: {
                    color: '#000000',
                    multi: 'md',
                    face:'arial',
                    size:9
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

    // showModal(profileId: any) : void {

    //     let pv = this.profileIndex[profileId];
    //     if(!pv.trustResult) 
    //         pv.trustResult = this.trustResults[profileId] || new BinaryTrustResult();

    //     this.modalData = pv.setup();
    
    //     this.$scope.$apply();
    //     // Show dtpbar
    //     this.setToCenterOfParent( $('#networkModal'), document.body, false, false);
    //     //$("#networkModal").finish().show();
    //     $('#networkModal').modal('show');
    // }
    

    // hideModal(): void {
    //     if($('#networkModal').is(':visible'))
    //         $("#networkModal").modal('hide');
    //         //$("#networkModal").hide();
    // }

    
    // updateNetwork(trustPackage: ModelPackage) : void {

    //     for(let key in trustPackage.claims) {
    //         let claim = trustPackage.claims[key];
    //         this.dataAdapter.updateWithClaim(claim);
    //     }
    // }

    // setToCenterOfParent(element, parent, ignoreWidth, ignoreHeight): void {
    //     let parentWidth = $(parent).width();
    //     let parentHeight = $(parent).height();  
    //     let elementWidth = $(element).width();
    //     let elementHeight = $(element).height();
    //     if(!ignoreWidth)
    //         $(element).css('left', parentWidth/2 - elementWidth/2);
    //     if(!ignoreHeight)
    //         $(element).css('top', parentHeight/2 - elementHeight/2);
    // }
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
