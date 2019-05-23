import * as angular from 'angular';
import '../common.js';
import PackageBuilder = require('../PackageBuilder');
import DTPService = require('../DTPService');
import TrustStrategy = require('../TrustStrategy');
import SubjectService = require('../SubjectService');
import Crypto = require('../Crypto');
import IProfile from '../IProfile';
import ProfileRepository = require('../ProfileRepository');
import BinaryTrustResult = require('../Model/BinaryTrustResult');
import vis2 = require('vis');
import Profile = require('../Profile');
import Identicon = require('identicon.js');
import { Buffer } from 'buffer';
import ISiteInformation from '../Model/SiteInformation.interface';
import SiteManager = require('../SiteManager');
import ISettings from '../Interfaces/Settings.interface';
import SettingsClient = require('../Shared/SettingsClient');
import { MessageHandler } from '../Shared/MessageHandler';
import Settings = require('../Shared/Settings');
import * as $ from 'jquery';
import DTPIdentity = require('../Model/DTPIdentity.js');


class ExtensionpopupController {

    messageHandler: MessageHandler;
    settingsClient: SettingsClient;
    settings: ISettings;
    showIcon: boolean = true;
    contentTabId: any;
    dtpIdentity: string;

    constructor(private $scope: ng.IScope) {
        //this.onStorageChanged();
    }

    init() {
        this.messageHandler = new MessageHandler();
        
        SiteManager.GetUserContext().then((userContext) => {
            this.settingsClient = new SettingsClient(this.messageHandler, userContext);
            this.settingsClient.loadSettings().then((items: ISettings) => {
                items = items || new Settings();
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
            this.settingsClient.buildKey(this.settings);

            var identicon = new Identicon(this.settings.address, { margin: 0.1, size: 64, format: 'svg' }).toString();
            if (identicon.length > 0) {
                this.settings.identicon = "data:image/svg+xml;base64," + identicon.toString();
                this.showIcon = true;
            }

            
            //let identity = new DTPIdentity({id: this.settings.address, proof: this.settings.})
        }
        

        if (this.settings.rememberme || state === 'rememberme') {
            this.settingsClient.saveSettings(this.settings);
        }
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
app.controller('TabController', ['$scope', function($scope) {
    $scope.tab = 1;

    $scope.setTab = function(newTab){
      $scope.tab = newTab;
    };

    $scope.isSet = function(tabNum){
      return $scope.tab === tabNum;
    };
}]);