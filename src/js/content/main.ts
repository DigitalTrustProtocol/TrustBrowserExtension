import PackageBuilder from "../PackageBuilder";
import SubjectService from "../SubjectService";
import ProfileRepository from "../ProfileRepository";
import * as localforage from 'localforage';
import { MessageHandler } from "../Shared/MessageHandler";
import { StorageClient } from "../Shared/StorageClient";
import { TrustGraphPopupClient } from "../Shared/TrustGraphPopupClient";
import SettingsClient from "../Shared/SettingsClient";
import ISettings from "../Interfaces/Settings.interface";
import IConfig from "../Interfaces/IConfig";
import DTPService from "../DTPService";
import $ = require('jquery');
import TrustStrategy from "../TrustStrategy";
import UrlApp from "./UrlApp";


$(document).ready( () =>{ 
    //Start application
    let messageHandler = new MessageHandler();
    let storageClient = new StorageClient(messageHandler);
    let trustGraphPopupClient = new TrustGraphPopupClient(messageHandler);

       
    const settingsClient = new SettingsClient(messageHandler);
    settingsClient.loadSettings( (settings: ISettings) => {
        let dtpService = new DTPService(settings);
        let profileRepository = new ProfileRepository(storageClient, dtpService);
        let packageBuilder = new PackageBuilder(settings);

        let config = <IConfig>{
            settings: settings,
            profileRepository : profileRepository,
            packageBuilder: packageBuilder,
            subjectService: new SubjectService(settings, packageBuilder),
            dtpService: dtpService,
            trustStrategy: new TrustStrategy(settings, profileRepository),
            trustGraphPopupClient: trustGraphPopupClient,
            messageHandler: messageHandler
        };

        let urlapp = new UrlApp(config);
        urlapp.ready(document).then(() => {
            
        });

    });
});
