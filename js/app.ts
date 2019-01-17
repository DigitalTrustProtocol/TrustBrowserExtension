import * as angular from 'angular';
 declare var Identicon: any;
 import './common.js';
 import SettingsController = require('./SettingsController');
 import  PackageBuilder = require('./PackageBuilder');
 import DTPService = require('./DTPService');
 import  TrustHandler = require('./TrustHandler');
 import SubjectService = require('./SubjectService');
 import ISettings from './Settings.interface';

 class ExtensionpopupController {

    settingsController: any = new SettingsController();
    settings: ISettings;
    showIcon: boolean  = true;

    constructor(private $scope: ng.IScope){
    }

    init(){
        this.settingsController.loadSettings((items : ISettings) => {
            this.settings = items;
                         
            this.showIcon = (this.settings.identicon || this.settings.identicon.length > 0) ? true:false;

            this.$scope.$apply();
        });
    }

    modelChange(state?: string) {
        if(state === 'identicon') {
            var identicon = new Identicon(this.settings.address, {margin:0.1, size:64, format: 'svg'}).toString();
            if(identicon.length > 0) {
                this.settings.identicon = "data:image/svg+xml;base64,"+identicon.toString();
                this.showIcon = true;
            }
        }

        if(this.settings.rememberme || state === 'rememberme') {
            this.settingsController.saveSettings(this.settings);
        }

        this.settingsController.buildKey(this.settings);
    }

}

 class Controller {
    showContainer: boolean;
    history: any[];
    settingsController : any;
    settings: any;
    packageBuilder: any;
    subjectService: any;
    dtpService: any;
    contentTabId: number;
    trustHandler:any;
    subject:any;
    binarytrusts:any;
    trusted = [];
    distrusted = [];
    jsonVisible = false;
    defaultScope;
    json;
    trustData: string;
    //static $inject = [];
    //static $inject = ['$scope'];
     //$apply: any;
    constructor(private $scope: ng.IScope){

    }
    
    init(){
       this.showContainer = false
       this.history = []
       this.settingsController = new SettingsController();
       this.settingsController.loadSettings((settings) => {
        this.settings = settings;
        this.packageBuilder = new PackageBuilder(settings);
        this.subjectService = new SubjectService(settings, this.packageBuilder);
        this.dtpService = new DTPService(settings);

        this.addListeners();
        this.requestProfile(null); // Default 
       })
      
    }
    requestProfile (profile_name) {
        console.log("RequestData send to background page");
        chrome.runtime.sendMessage({ command: 'requestData', profile_name: null }, (response) => {
            console.log("RequestData response from background page");
            console.log(response);
            console.log('tabid', response.contentTabId)
            this.contentTabId = response.contentTabId;

            this.loadOnData(response.data);
        });
    
    }

    addListeners() {
        console.log("Adding Listener for calls from the background page.");
        chrome.runtime.onMessage.addListener(
            (request, sender, sendResponse) => {
                console.log("Listener request from background page");
                console.log(request);

                if (request.command == "showTarget") {
                    this.contentTabId = request.contentTabId;
                   
                    this.loadOnData(request.data);

                    if(sendResponse)
                        sendResponse({result: "ok"});
                }
            });
    }

    loadOnData (profile) {
        this.trustHandler = new TrustHandler(profile.controller.queryContext, this.settings);
        this.trustHandler.BuildSubjects();

        this.load(profile);
    }

    reset(){
        this.subject = null;
        this.binarytrusts = [];
        this.trusted = [];
        this.distrusted = [];
        this.jsonVisible = false;
    }

    load (subject) {
        this.reset();
        this.subject = subject;
        this.defaultScope = this.subject.scope;

        if(!this.subject.identiconData64)
            Object.defineProperty(this.subject, 'identiconData64', { value: this.getIdenticoinData(this.subject.address, null), writable: false });

        if(!this.subject.owner)
            this.subject.owner = {}

        // The subject has an owner
        if(this.subject.owner.address) {
            if(!this.subject.owner.identiconData16)
                Object.defineProperty(this.subject.owner, 'identiconData16', { value: this.getIdenticoinData(this.subject.owner.address, 16), writable: false });
        }

        this.subject.trusts = this.trustHandler.subjects[this.subject.address];
        this.subject.binaryTrust = this.trustHandler.CalculateBinaryTrust(this.subject.address);

        for(let index in this.subject.trusts) {
            let t = this.subject.trusts[index];


            let trust = this.packageBuilder.CreateTrust(t.issuer.address, t.issuer.script, t.subject.address, t.type, t.scope, t.claim, t.activate, t.expire, t.note);

            if(!trust.owner) {
                let owner = {  
                    address: trust.issuer.address
                }
                Object.defineProperty(trust, 'owner', { value: owner, writable: false });
            }

            // If trust is a BinaryTrust, decorate the trust object with data
            if(trust.type == this.packageBuilder.BINARY_TRUST_DTP1) {
                this.binarytrusts[trust.subject.address] = trust;

                if(!trust.identiconData64)
                    Object.defineProperty(trust, 'identiconData64', { value: this.getIdenticoinData(trust.issuer.address, null), writable: false });

                // Add trust to the right list
                if(trust.claim)
                    this.trusted.push(trust);
                else
                    this.distrusted.push(trust);
                
                Object.defineProperty(trust, 'showTrustButton', { value: !(this.subject.binaryTrust.direct && this.subject.binaryTrust.directValue), writable: false });
                Object.defineProperty(trust, 'showDistrustButton', { value: !(this.subject.binaryTrust.direct && !this.subject.binaryTrust.directValue), writable: false });
                Object.defineProperty(trust, 'showUntrustButton', { value: this.subject.binaryTrust.direct, writable: false });
                
                let alias = this.trustHandler.alias[trust.issuer.address];
                if(alias && alias.length > 0) {
                    let item = alias[0];
                    let screen_name = item.claim;
                    trust.address = screen_name.hash160().toDTPAddress();
                    trust.alias = screen_name + (trust.showUntrustButton ? " (You)": "");
                } else {
                  if(this.subject.binaryTrust.direct) 
                    trust.alias = "(You)";
                }

                if(Object.keys(trust.scope).length == 0 ) {
                    trust.scope = {
                        "value" : this.subject.scope
                    }
                }

                // if(!trust.alias || trust.alias == "") {
                //     trust.alias = trust.address;
                // }

            }
        }

        
        this.json = JSON.stringify(subject, undefined, 2);
        this.showContainer = true;
        this.$scope.$apply();
    }

    analyseClick (trust) {
        this.history.push(this.subject);

        let profile: any = {};
        profile.address = trust.issuer.address;
        profile.alias = trust.alias;
        profile.screen_name = trust.alias;
        profile.controller.queryContext = this.subject.controller.queryContext;
        profile.scope = this.subject.scope;

        this.load(profile);
    }


    historyBack () {
        this.load(this.history.pop());
    }

    showHideJson()  {
        this.jsonVisible = (this.jsonVisible) ? false: true;
    }


    getIdenticoinData (address, size) {
        if(!size) size = 64;
        return new Identicon(address, {margin:0.1, size:size, format: 'svg'}).toString();
    };

    trustDataClick  (trust) {
        this.dtpService.GetSimilarTrust(trust).done((result) => {
            console.log('trust data from xhr', result)
            this.trustData =  JSON.stringify(result.data, undefined, 2);
            this.jsonVisible = true;
        });
    }

    verifyTrustLink (trust) {
        let url = this.settings.infoserver+
            "/trusts?issuerAddress="+encodeURIComponent(trust.issuer.address)+
            "&subjectAddress="+encodeURIComponent(trust.subject.address)+
            "&type="+encodeURIComponent(trust.type)+
            "&scopetype="+encodeURIComponent((trust.scope) ? trust.scope.type : "")+
            "&scopevalue="+encodeURIComponent((trust.scope) ? trust.scope.value : "");
        return url;
    }


    trustClick(profile) {
        this.buildAndSubmitBinaryTrust(profile, true, 0, profile.alias + " trusted");
        return false;
    };

    distrustClick (profile) {
        this.buildAndSubmitBinaryTrust(profile, false, 0, profile.alias + " distrusted");
        return false;
    }

    untrustClick(profile) {
        this.buildAndSubmitBinaryTrust(profile, undefined, 1, profile.alias + " untrusted");
        return false;
    }

    buildAndSubmitBinaryTrust (profile, value, expire, message){
        
        var package_ = this.subjectService.BuildBinaryClaim(profile, value, null, expire);
        this.packageBuilder.SignPackage(package_);
        this.dtpService.PostTrust(package_).done((trustResult)=> {
            //$.notify("Updating view",trustResult.status.toLowerCase());
            console.log("Posting package is a "+trustResult.status.toLowerCase());

            $["notify"](message, 'success');

            var opt = {
                command: 'updateContent',
                contentTabId: this.contentTabId
            }
            chrome.runtime.sendMessage(opt);

        }).fail((trustResult) => { 
            $["notify"]("Adding trust failed: " +trustResult.message,"fail");
        });
    }
  }

  const app = angular.module("myApp", []);
  app.controller('Controller',["$scope", Controller]) // bootstrap angular app here 
  app.controller('ExtensionpopupController',["$scope", ExtensionpopupController]) // bootstrap angular app here 
