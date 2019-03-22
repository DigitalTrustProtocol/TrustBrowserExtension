import SiteManager = require("./SiteManager");
import SettingsController = require("./SettingsController");
import PackageBuilder = require("./PackageBuilder");
import SubjectService = require("./SubjectService");
import DTPService = require("./DTPService");
import TwitterService = require("./TwitterService");
import ProfileRepository = require("./ProfileRepository");
import Twitter = require("./Twitter");
import ISettings from "./Settings.interface";

$(document).ready( () =>{ 
    SiteManager.GetUserContext().then((userContext) => {
        // Start application
        const settingsController = new SettingsController(userContext);
        settingsController.loadSettings( (settings: ISettings) => {
            let packageBuilder = new PackageBuilder(settings);
            let subjectService = new SubjectService(settings, packageBuilder);
            let dtpService = new DTPService(settings);
            let twitterService = new TwitterService();
            let profileRepository = new ProfileRepository(localStorage);

            let twitter = new Twitter(settings, packageBuilder, subjectService, dtpService, twitterService, profileRepository);

            twitter.addListener();
            
            twitter.ready(document);
        });
    });
});
