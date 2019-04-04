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

$(document).ready( () =>{ 
    let messageHandler = new MessageHandler();
    let storageClient = new StorageClient(messageHandler);
    console.log("Sending value");
    storageClient.setItem("test", "MyValue").then(() => {
        storageClient.getItem("test").then(result => {
            console.log("Value result:" +result);
        })
    });
    // localforage.config({
    //     name        : 'DTP-Client',
    //     version     : 1.0,
    //     storeName   : 'DTP1', // Should be alphanumeric, with underscores.
    //     description : 'DTP Client browser extension'
    // });

    // localforage.ready().then(function() {
    //     // This code runs once localforage
    //     // has fully initialized the selected driver.
    //     console.log(localforage.driver()); 

    //     SiteManager.GetUserContext().then((userContext) => {
    //         // Start application
            
    //         const settingsController = new SettingsController(userContext);
    //         settingsController.loadSettings( (settings: ISettings) => {
    //             let packageBuilder = new PackageBuilder(settings);
    //             let subjectService = new SubjectService(settings, packageBuilder);
    //             let dtpService = new DTPService(settings);
    //             let twitterService = new TwitterService();
    
    //             let profileRepository = new ProfileRepository(localforage);
    
    //             let twitter = new Twitter(settings, packageBuilder, subjectService, dtpService, twitterService, profileRepository);
    
    //             twitter.addListener();
                
    //             twitter.ready(document);
    //         });
    //     });
    
    // }).catch(function (e) {
    //     console.log(e); // `No available storage method found.`
    //     // One of the cases that `ready()` rejects,
    //     // is when no usable storage driver is found
    // });

});
