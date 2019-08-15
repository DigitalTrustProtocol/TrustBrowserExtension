import SiteManager = require("../SiteManager");
import PackageBuilder = require("../PackageBuilder");
import SubjectService = require("../SubjectService");
import ProfileRepository = require("../ProfileRepository");
import * as localforage from 'localforage';
import { MessageHandler } from "../Shared/MessageHandler";
import { StorageClient } from "../Shared/StorageClient";
import { TrustGraphPopupClient } from "../Shared/TrustGraphPopupClient";
import SettingsClient = require("../Shared/SettingsClient");
import ISettings from "../Interfaces/Settings.interface";
import IConfig from "../Interfaces/IConfig";
import DTPService = require("../DTPService");
import * as $ from 'jquery';
import TrustStrategy = require("../TrustStrategy");
import UrlApp = require("./UrlApp");

//$(document).ready( () =>{ 
    // Start application
    let messageHandler = new MessageHandler();
    let storageClient = new StorageClient(messageHandler);
    let trustGraphPopupClient = new TrustGraphPopupClient(messageHandler);

    SiteManager.GetUserContext().then((userContext) => {
        
        const settingsClient = new SettingsClient(messageHandler, userContext);
        settingsClient.loadSettings( (settings: ISettings) => {
            let profileRepository = new ProfileRepository(storageClient);
            let packageBuilder = new PackageBuilder(settings);

            let config = <IConfig>{
                settings: settings,
                profileRepository : profileRepository,
                packageBuilder: packageBuilder,
                subjectService: new SubjectService(settings, packageBuilder),
                dtpService: new DTPService(settings),
                trustStrategy: new TrustStrategy(settings, profileRepository),
                trustGraphPopupClient: trustGraphPopupClient,
                messageHandler: messageHandler
            };

            let urlapp = new UrlApp(config);
            urlapp.ready(document).then(() => {
                
            });

        });
    });
//});
