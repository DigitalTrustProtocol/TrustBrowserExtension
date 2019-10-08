import $ = require('jquery');
import * as angular from 'angular';
import 'bootstrap'
import 'notifyjs-browser';

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
import Url from "url-parse";
import IOpenDialogParameters from '../Model/OpenDialogParameters.interface.js';
import { Runtime } from "webextension-polyfill-ts";


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
    currentProfile: IProfile;
    trustStrategy: TrustStrategy;

    modalData: ProfileModal;
    //source: IGraphData;
    profileViews: object;
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

            let url = new Url(location.href, true);
            this.trustGraphPopupClient.requestGraphData(url.query.profileId).then(data => {
                this.loadOnData(data);
            });
        });
    }

    private async loadOnData(source: IGraphData) : Promise<void> {
        this.network = await this.buildNetwork(source);
    }

    private async buildNetwork(source: IGraphData) : Promise<any> {

        //this.source = source;
        await this.buildProfiles(source);

        this.dataAdapter = new TrustGraphDataAdapter(source, this.profileViews);
        this.dataAdapter.load();

        let options = this.networkOptions();
        let container = document.getElementById('networkContainer');

        let nw = new vis2.Network(container, this.dataAdapter.getGraph(), options);

        nw.on("select", (params) => {
            if(params.nodes.length > 0) {
                let profileId = params.nodes[0];
                let pv = this.profileViews[profileId];
                this.trustGraphPopupClient.selectProfile(pv.profile);
            }
        });

        return nw;

    }

    private async buildProfiles(source: IGraphData) : Promise<void> {

        this.trustResults = this.trustStrategy.ProcessClaims(source.queryResult.results.claims);

        this.profileViews = {};
        this.selectedProfile = await this.profileRepository.getProfile(source.subjectProfileId); // source.profiles.filter(p=>p.id == source.subjectProfileId).pop();
        this.currentUser = await this.profileRepository.getProfile(source.currentUserId,{id: source.currentUserId, title: "(You)" });
        
        this.profileViews[source.currentUserId] = new ProfileModal(this.currentUser, this.currentUser);
        //this.profileIndex[source.subjectProfileId] = new ProfileModal(this.selectedProfile, this.currentUser); // Is handle by the for loop

        for(let key in this.trustResults) {
             let profile = await this.profileRepository.getProfile(key);

            this.profileViews[key] = new ProfileModal(profile, this.currentUser, this.trustResults[key]);
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
