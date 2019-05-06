///<reference path="../typings/globals/jquery/index.d.ts" />

import TrustStrategy = require('./TrustStrategy');
import { QueryRequest, QueryContext } from '../lib/dtpapi/model/models';
import BinaryTrustResult = require('./Model/BinaryTrustResult');
import DTPIdentity = require('./Model/DTPIdentity');
import Crypto = require('./Crypto');
import ProfileRepository = require('./ProfileRepository');
import IProfile from './IProfile';
import Profile = require('./Profile');
import { ProfileStateEnum } from './Model/ProfileStateEnum';
import DTPService = require('./DTPService');
import SubjectService = require('./SubjectService');
import PackageBuilder = require('./PackageBuilder');
import ISettings from "./Interfaces/Settings.interface";
import IProfileView from './content/IProfileView';
import * as $ from 'jquery';
import { TrustGraphPopupClient } from './Shared/TrustGraphPopupClient';
import IOpenDialogResult from './Model/OpenDialogResult.interface';
import IGraphData from './content/IGraphData';
import { browser, Runtime } from "webextension-polyfill-ts";


class ProfileController {
    profile: IProfile;
    view: IProfileView;
    host: any;
    public domElements: Array<HTMLElement> = [];
    //blocked: boolean;
    following: boolean = false;
    profileRepository: ProfileRepository;
    queried: boolean;
    trustResult : BinaryTrustResult = new BinaryTrustResult();
    changed: boolean = true;
    dtpService: DTPService;
    subjectService: SubjectService;
    packageBuilder: PackageBuilder;
    trustSubmittedCallBack: any;
    scope: string;
    trustGraphPopupClient: TrustGraphPopupClient;

    public updateProfilesCallBack: any = (profiles) => { return $.Deferred<Array<IProfile>>().resolve(null).promise(); };
    public onTrustGraphClick: (eventObject: JQueryEventObject) => boolean;


    constructor(profile: IProfile, view: IProfileView, profileRepository: ProfileRepository, dtpService: DTPService, subjectService: SubjectService, packageBuilder: PackageBuilder, trustGraphPopupClient: TrustGraphPopupClient, scope: string) {
        this.profile = profile;
        this.view = view;
        this.profileRepository = profileRepository;
        this.dtpService = dtpService;
        this.subjectService = subjectService;
        this.packageBuilder = packageBuilder;
        this.trustGraphPopupClient = trustGraphPopupClient;
        this.scope = scope;
        this.onTrustGraphClick = (eventObject) => { return this.trustGraphClickHandler(eventObject) };
    }



    // Update data for the profile
    private loadProfileFromHost(): JQueryPromise<IProfile> {
        let deferred = $.Deferred<IProfile>();

        if (this.profile.owner) {
            deferred.resolve(this.profile);
        } else {
            if(!this.updateProfilesCallBack)
                deferred.resolve(this.profile);
            
            this.updateProfilesCallBack([this.profile]).then((profiles) => {
                deferred.resolve(this.profile);
            });
        }

        return deferred.promise();
    }

    public updateProfile(source: IProfile): JQueryPromise<IProfile> {
        this.profile.update(source);
        if (this.profile.state == ProfileStateEnum.Changed) {
            return this.profileRepository.setProfile(this.profile);
        }
        //return $.when(this.profile).promise();
        return $.Deferred<IProfile>().resolve(this.profile).promise();
    }

    public addElement(element: HTMLElement): void {
        this.domElements.push(element);
        this.bindEvents(element);
    }

    public save(): JQueryPromise<IProfile> {
        return this.profileRepository.setProfile(this.profile);
    }

    // Render all elements
    public render() : void {
        for (let key in this.domElements) {
            let element = this.domElements[key] as HTMLElement;
            this.view.render(this, element);
        }
    }

    trust() {
        console.log('Trust clicked');
        DTP['trace']("Trust " + this.profile.screen_name);
        return this.trustProfile("trust","true", 0);
    }

    distrust() {
        DTP['trace']("Distrust " + this.profile.screen_name);

        return this.trustProfile("distrust", "false", 0);
    }

    untrust() {
        DTP['trace']("Untrust " + this.profile.screen_name);
        return this.trustProfile("untrust","", 1);
    }




    trustProfile(name: string, value: any, expire: number): JQueryPromise<any> {
        return this.buildAndSubmitBinaryTrust(this.profile, value, this.scope, expire).then((result) => {
            DTP['trace']('TrustProfile done!');

            if(this.trustSubmittedCallBack)
                // this.trustSubmittedCallBack({
                //     name: name,
                //     value: value,
                //     expire: expire,
                //     controller: this
                // });
                this.trustSubmittedCallBack(result);

            return result;
        });
    }

    buildAndSubmitBinaryTrust(profile: IProfile, value: any, scope:string, expire: number): JQueryPromise<any> {
        const self = this;
        let deferred = $.Deferred<any>();

        this.loadProfileFromHost().then(() => {
            let trustPackage = this.subjectService.BuildBinaryClaim(profile, value, null, scope, expire);
            this.packageBuilder.SignPackage(trustPackage);
            DTP['trace']("Issuing trust");
            DTP['trace'](JSON.stringify(trustPackage, undefined, 2));
            this.dtpService.PostPackage(trustPackage).then((trustResult) => {
                DTP['trace']("Posting package code: " + trustResult.status + ' - Action: ' + trustResult.statusText);
              
                deferred.resolve(trustResult);
            }, (trustResult) => {
                DTP['trace']("Adding trust failed: " + trustResult.statusText);
                deferred.fail(null);
            });
        })
        return deferred.promise();
    }


    // profile will usually be a deserialized neutral object
    //    static addTo(profile: IProfile, twitterService : any, domElement) : void {
    //         if(!profile)
    //             return;
    //         try {

    //             if (!profile.controller) {
    //                 profile.controller = new ProfileController(profile, new ProfileView(), twitterService);
    //             }
    //         } catch (error) {
    //             console.log(error);
    //         }
    //         profile.controller.domElements.push(domElement);

    //         $(domElement).data("dtp_profile", profile);
    //     }

    private bindEvents(element: HTMLElement): void {
        $(element).on('click', this, (event) => {            
            let button = event.target;
            let controller = event.data;

            let classList = button['classList'];

            if (classList.contains('trust')) {
                $(button).addClass('trustSpinner24');
                this.trust().then(RemoveSpinner);
            }

            if (classList.contains('distrust')) {
                $(button).addClass('trustSpinner24');
                this.distrust().then(RemoveSpinner);
            }

            if (classList.contains('untrust')) {
                $(button).addClass('trustSpinner24');
                this.untrust().then(RemoveSpinner);
            }

            function RemoveSpinner() {
                $(button).removeClass('trustSpinner24');
            }
            //});
        });
    }

    private trustGraphClickHandler(eventObject: JQueryEventObject) : boolean {
        let dialogData = {
            profileId: this.profile.userId,
        };
        let tt = browser.tabs;

        this.trustGraphPopupClient.openPopup(dialogData).then((result: IOpenDialogResult) => {
            if(result.alreadyOpen) {
                this.trustGraphPopupClient.requestSubjectHandler(dialogData, null).then((data: IGraphData) => {
                    this.trustGraphPopupClient.showSubject(result.tabId, data);
                });
            }
            // If popup is not open, then the popup will call the content tab when ready.
        });
        eventObject.stopPropagation();
        return false;
    }

    static getTweetContainer(element): JQuery<any> {
        return $(element).closest('div.tweet'); //.attr("data-screen-name");
    }
}

export = ProfileController