import SiteManager = require("./SiteManager");
import SettingsController = require("./SettingsController");
import PackageBuilder = require("./PackageBuilder");
import SubjectService = require("./SubjectService");
import DTPService = require("./DTPService");
import TwitterService = require("./TwitterService");
import ProfileRepository = require("./ProfileRepository");
import Twitter = require("./Twitter");
import ISettings from "./Settings.interface";
import * as localforage from 'localforage';
import { MessageHandler } from "./Shared/MessageHandler";
import { StorageClient } from "./Shared/StorageClient";
import { TrustGraphPopupClient } from "./Shared/TrustGraphPopupClient";


$(document).ready( () =>{ 
    // Start application
    let messageHandler = new MessageHandler();
    let storageClient = new StorageClient(messageHandler);
    let trustGraphPopupClient = new TrustGraphPopupClient(messageHandler);

    SiteManager.GetUserContext().then((userContext) => {
        
        const settingsController = new SettingsController(userContext);
        settingsController.loadSettings( (settings: ISettings) => {
            let packageBuilder = new PackageBuilder(settings);
            let subjectService = new SubjectService(settings, packageBuilder);
            let dtpService = new DTPService(settings);
            let twitterService = new TwitterService();
            let profileRepository = new ProfileRepository(storageClient);

            let twitter = new Twitter(settings, packageBuilder, subjectService, dtpService, twitterService, profileRepository, trustGraphPopupClient);
            twitter.ready(document).then(() => {
                trustGraphPopupClient.updateContent = (params, sender) => { twitter.queryDTP(twitter.controllers); };
            });

        });
    });
});
