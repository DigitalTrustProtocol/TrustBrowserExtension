import $ = require('jquery');
import * as angular from 'angular';
import 'bootstrap'
import 'notifyjs-browser';

import DTPService from "../DTPService";
import TrustStrategy from "../TrustStrategy";
import IProfile from '../IProfile';
import ProfileRepository from "../ProfileRepository";
import PathGraphController from "./PathGraphController";
import { MessageHandler } from '../Shared/MessageHandler';
import { TrustGraphPopupClient } from '../Shared/TrustGraphPopupClient';
import { StorageClient } from '../Shared/StorageClient';
import SettingsClient from "../Shared/SettingsClient";
import Url from "url-parse";
import SubjectGraphController from './SubjectGraphController';
import IGraphController from './IGraphController';
import ITrustStrategy from '../Interfaces/ITrustStrategy';


class TrustGraphController {
    settingsClient: SettingsClient;
    settings: any;
    dtpService: DTPService;
    profileRepository: ProfileRepository;
    trustStrategy: ITrustStrategy;
    controller: IGraphController;
    messageHandler: MessageHandler;
    storageClient: StorageClient; 
    trustGraphPopupClient: TrustGraphPopupClient;
    container: HTMLElement;

    static $inject: string[] = ["$scope"];

    constructor(private $scope: ng.IScope) {
        $(() => this.init());
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

            let url = new Url(location.href, true);
            this.container = document.getElementById('networkContainer');

            if(url.query.mode == "path") {
                this.pathNetwork(url);
            } else {
                this.controller = new SubjectGraphController(url.query.profileId, this.container, this.dtpService, this.profileRepository);
                this.controller.init().then(()=> {
                    this.addGraphEvents();
                });
            }
        });
    }


    private pathNetwork(url: Url) : void {
        this.trustGraphPopupClient.requestGraphData(url.query.profileId).then(source => {
            this.trustStrategy = new TrustStrategy(this.settings, this.profileRepository);

            this.controller = new PathGraphController(source, this.container, this.trustStrategy, this.profileRepository);
            this.controller.init().then(()=> {
                this.addGraphEvents();
            });
        });
    }

    private addGraphEvents() {
        this.controller.onSelect = (pv) => {
            this.trustGraphPopupClient.selectProfile(pv.profile);
        };
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
