import * as angular from 'angular';
import './common.js';
import SettingsController = require('./SettingsController');
import PackageBuilder = require('./PackageBuilder');
import DTPService = require('./DTPService');
import TrustStrategy = require('./TrustStrategy');
import SubjectService = require('./SubjectService');
import ISettings from './Settings.interface';
import Crypto = require('./Crypto');
import IProfile from './IProfile';
import ProfileRepository = require('./ProfileRepository');
import BinaryTrustResult = require('./Model/BinaryTrustResult');
import vis2 = require('vis');
import Profile = require('./Profile');
import Identicon = require('identicon.js');
import { Buffer } from 'buffer';
import ISiteInformation from './Model/SiteInformation.interface';
import SiteManager = require('./SiteManager');


class ExtensionpopupController {

    settingsController: SettingsController;
    settings: ISettings;
    showIcon: boolean = true;
    contentTabId: any;

    constructor(private $scope: ng.IScope) {
        //this.onStorageChanged();
    }

    init() {
        SiteManager.GetUserContext().then((userContext) => {
            this.settingsController = new SettingsController(userContext);
            this.settingsController.loadSettings((items: ISettings) => {
                this.settings = items;

                this.showIcon = (this.settings.identicon || this.settings.identicon.length > 0) ? true : false;

                this.$scope.$apply();

            });
        });
    }
    
    // onStorageChanged(): void {
    //     chrome.storage.onChanged.addListener(function(changes, namespace) {
    //         for (var key in changes) {
    //           var storageChange = changes[key];
    //           console.log('Storage key "%s" in namespace "%s" changed. ' +
    //                       'Old value was "%s", new value is "%s".',
    //                       key,
    //                       namespace,
    //                       storageChange.oldValue,
    //                       storageChange.newValue);
    //         }
    //       });
    // }
   
    modelChange(state?: string) {
        if (state === 'identicon') {
            var identicon = new Identicon(this.settings.address, { margin: 0.1, size: 64, format: 'svg' }).toString();
            if (identicon.length > 0) {
                this.settings.identicon = "data:image/svg+xml;base64," + identicon.toString();
                this.showIcon = true;
            }
        }

        if (this.settings.rememberme || state === 'rememberme') {
            this.settingsController.saveSettings(this.settings);
        }

        this.settingsController.buildKey(this.settings);
    }

    getSiteInfo() : JQueryPromise<ISiteInformation> {
        let deferred = $.Deferred<ISiteInformation>();

        console.log("RequestData send to background page");
        // chrome.runtime.sendMessage({ command: 'getSiteInformation', tabId: this.contentTabId, profileIDs: ids }, (response) => {
        //     console.log("RequestData response from background page");
        //     console.log(response);
        //     console.log('tabid', response.contentTabId)
        //     deferred.resolve(response.data.profiles);
        // });

        return deferred.promise();
    }
}

const app = angular.module("myApp", []);
app.controller('ExtensionpopupController', ["$scope", ExtensionpopupController]) // bootstrap angular app here 
