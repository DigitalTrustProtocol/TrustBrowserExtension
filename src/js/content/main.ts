import SiteManager = require("../SiteManager");
import PackageBuilder = require("../PackageBuilder");
import SubjectService = require("../SubjectService");
import TwitterService = require("./TwitterService");
import ProfileRepository = require("../ProfileRepository");
import Twitter = require("./Twitter");
import * as localforage from 'localforage';
import { MessageHandler } from "../Shared/MessageHandler";
import { StorageClient } from "../Shared/StorageClient";
import { TrustGraphPopupClient } from "../Shared/TrustGraphPopupClient";
import SettingsClient = require("../Shared/SettingsClient");
import ISettings from "../Interfaces/Settings.interface";
import DTPService = require("../DTPService");


$(document).ready( () =>{ 
    // Start application
    let messageHandler = new MessageHandler();
    let storageClient = new StorageClient(messageHandler);
    let trustGraphPopupClient = new TrustGraphPopupClient(messageHandler);

    SiteManager.GetUserContext().then((userContext) => {
        
        const settingsClient = new SettingsClient(messageHandler, userContext);
        settingsClient.loadSettings( (settings: ISettings) => {
            let profileRepository = new ProfileRepository(storageClient);
            let packageBuilder = new PackageBuilder(settings);
            let subjectService = new SubjectService(settings, packageBuilder);
            let dtpService = new DTPService(settings);
            let twitterService = new TwitterService(messageHandler, this.profileRepository);

            let twitter = new Twitter(settings, packageBuilder, subjectService, dtpService, twitterService, profileRepository, trustGraphPopupClient);
            twitter.ready(document).then(() => {
                trustGraphPopupClient.updateContent = (params, sender) => { twitter.queryDTP(twitter.controllers); };
            });

        });
    });
});
