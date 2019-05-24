import SiteManager = require("../SiteManager");
import PackageBuilder = require("../PackageBuilder");
import SubjectService = require("../SubjectService");
import ProfileRepository = require("../ProfileRepository");
import * as localforage from 'localforage';
import { StorageClient } from "../Shared/StorageClient";
import { TrustGraphPopupClient } from "../Shared/TrustGraphPopupClient";
import SettingsClient = require("../Shared/SettingsClient");
import ISettings from "../Interfaces/Settings.interface";
import DTPService = require("../DTPService");
import TrustStrategy = require("../TrustStrategy");
import IProfile from '../IProfile';
import ProfileController = require('../ProfileController');
import MastodonProfileView = require('./MastodonProfileView');
import dtpService = require('../DTPService');
import { QueryRequest, QueryContext, Claim } from '../../lib/dtpapi/model/models';
import BinaryTrustResult = require('../Model/BinaryTrustResult');
import Profile = require('../Profile');
import Crypto = require('../Crypto');
import DTPIdentity = require('../Model/DTPIdentity');
import bitcoin = require('bitcoinjs-lib');
import bitcoinMessage = require('bitcoinjs-message');
import { MessageHandler, CallbacksMap } from '../Shared/MessageHandler';
import ITrustStrategy from '../Interfaces/ITrustStrategy';
import TrustGraphDataAdapter = require('./TrustGraphDataAdapter');
import { DtpGraphCoreModelQueryContext } from '../../lib/typescript-jquery-client/model/models';
import { IdentityPopupClient } from '../Shared/IdentityPopupClient';
import IGraphData from './IGraphData';
import { browser, Runtime, Bookmarks } from "webextension-polyfill-ts";
import { ProfileStateEnum } from '../Model/ProfileStateEnum';
import * as $ from 'jquery';

class MastodonProfile {
    OwnerPrefix: string;
    settings: ISettings;
    subjectService: any;
    targets: any[];
    packageBuilder: any;
    dtpService: DTPService;
    profileRepository: ProfileRepository;
    waiting: boolean;
    profilesToQuery: Array<IProfile> = [];

    controllers = {};
    trustGraphPopupClient: TrustGraphPopupClient;

    wait: boolean = true;
    elementCache = {};
    mastodonContext: any;

    public static handlerName: string = "MastodonProfileService";

    public static scope = 'mastodon.social';

    private messageHandler: MessageHandler;
    private methods: CallbacksMap = {};
    private trustStrategy: ITrustStrategy;
    private identityPopup: IdentityPopupClient;



    constructor(settings: ISettings, packageBuilder: PackageBuilder, subjectService: SubjectService, dtpService: DTPService, profileRepository: ProfileRepository, trustGraphPopupClient: TrustGraphPopupClient, messageHandler : MessageHandler, trustStrategy: ITrustStrategy) {

        this.OwnerPrefix = "[#owner_]";
        this.settings = settings;
        this.subjectService = subjectService;
        this.targets = [];
        this.packageBuilder = packageBuilder;
        this.dtpService = dtpService;
        this.profileRepository = profileRepository;
        this.trustGraphPopupClient = trustGraphPopupClient;
        this.waiting = false;
        this.messageHandler = messageHandler;
        this.identityPopup = new IdentityPopupClient(messageHandler);
        this.trustStrategy = trustStrategy;

        //this.methods["getProfile"] = (params, sender) => { return this.getProfile(params, sender); }
        //this.methods["getProfileDTP"] = (params, sender) => { return this.getProfileDTP(params, sender); }
        this.messageHandler.receive(MastodonProfile.handlerName, (params: any, sender: Runtime.MessageSender) => {
            let method = this.methods[params.action];
            if(method)
                return method(params, sender);
        });

        console.log('Mastodon Profile class init')
    }


    getUserId(doc: Document): string {
        let anchor = (document.querySelector(".card.h-card a") as HTMLAnchorElement)
        if(!anchor)
            return null;
        return anchor.href;
    }

    loadCurrentUserProfile(userId: string): JQueryPromise<IProfile> {
        return this.profileRepository.ensureProfile(userId).then(profile => {
            Profile.CurrentUser = profile;

            //userId = userId.replace(/(^\w+:|^)\/\//, ''); // Remove https://, but only on this page

            Profile.CurrentUser.owner = new DTPIdentity({ ID: this.settings.address, PlatformID: userId  });
            Profile.CurrentUser.owner.sign(this.settings.keyPair);
            
            console.log(Profile.CurrentUser.owner.verify());
            return Profile.CurrentUser;
        }).promise();
    }

    renderButton() : string {
        let html = `<button type="button" title="Add DTP identity" class="add-dtp">Add DTP identity</button>
                    <p class="hint">Adding a DTP identity to one of the properties enables others to trust your DTP identity directly. Note that one of the profile metadata fields has to be empty.</p>`;

        return html;
    }




    addDTP($block: JQLite, profile: IProfile) : void {

        console.log("DTP Button pressed");
        let exist = false;
        let fieldNames = $block.find(".row .account_fields_name input").filter((index, input: HTMLInputElement) => {
            return (input.value == "DTP-Identity");
        });

        let done = false;
        if(fieldNames.length == 0) {
            $block.find(".row .account_fields_name input").filter((index, input: HTMLInputElement) => {
                return (!input.value || input.value == "");
            }).first().val("DTP-Identity");
        }

        $block.find(".row .account_fields_name input").filter((index, input: HTMLInputElement) => {
            return (input.value == "DTP-Identity");
        }).parent().parent().children().last().children().first().val(profile.owner.toString());
    }
    

    load(doc: Document): void {
       
        let $block = $('.input.with_block_label');

        $block.last().append(this.renderButton());

        let userId = this.getUserId(doc);
                
        this.loadCurrentUserProfile(userId).then((profile) => {
            console.log("Profile loaded");
            $(doc).on('click', '.add-dtp', (event) => {
                event.stopPropagation();
                this.addDTP($block, profile);
                return false;
            });
        });

        console.log("MastodonProfile loaded");

   }
}


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
            let trustStrategy = new TrustStrategy(settings, profileRepository);

            DTP["mastodonProfile"] = new MastodonProfile(settings, packageBuilder, subjectService, dtpService, profileRepository, trustGraphPopupClient, messageHandler, trustStrategy);
            DTP["mastodonProfile"].load(document);

        });
    });
});

