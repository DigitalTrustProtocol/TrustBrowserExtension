import IProfile from "../IProfile";
import Identicon = require('../Shared/Identicon');
import { DtpGraphCoreModelQueryContext } from "../../lib/typescript-jquery-client/model/models";
import BinaryTrustResult = require("./BinaryTrustResult");
import * as $ from 'jquery';


class TrustGraphScoreModel {
    public show: boolean = false;
    public result: number = 0;
}

class TrustGraphStatusModel {
    public cssClass: string;
    public text: string;
    public show: boolean;
    public iconClass: string;
}

class TrustGraphButtonModel {
    public disabled: boolean = false;
    public title: string;
    public cssClass: string;
}

class ProfileModal
{
    public profile: IProfile;
    public subjectProfile: IProfile;
    public currentUser: IProfile;
    
    public queryResult: DtpGraphCoreModelQueryContext;
    public trustResult?: BinaryTrustResult;

    public spinner: string;
    public processing: boolean = false;
    public score: TrustGraphScoreModel = new TrustGraphScoreModel();
    public isCurrentUser: boolean = false;
    public status: TrustGraphStatusModel = new TrustGraphStatusModel();
    public visible: boolean = false;

    public button = {
        show: false,
        trust: new TrustGraphButtonModel(),
        untrust: new TrustGraphButtonModel(),
        distrust: new TrustGraphButtonModel()
    }
    /**
     *
     */
    constructor(selectedProfile?: IProfile, trustResult?: BinaryTrustResult, queryResult?: DtpGraphCoreModelQueryContext) {
        this.profile = selectedProfile;
        this.spinner = chrome.extension.getURL("../img/Spinner24px.gif");
        this.queryResult = queryResult;
        this.trustResult = trustResult;
    }    

    public setup(profileView? : ProfileModal) : ProfileModal {
        if(profileView)
            $.extend(this, profileView);

        this.EnsureAvatarImage();
        
        // if(this.profile.userId == this.subjectProfile.userId) {
        // }

        if(this.currentUser && this.profile.userId == this.currentUser.userId) {
            this.setupCurrentUser();
            return this;
        }
        else {
            this.setupSubjectProfile();
            return this;
        }

        this.isSomeoneElse();
        return this;
    }

    public EnsureAvatarImage() : void {
        if(!this.profile.avatarImage) {
            let icon = Identicon.createIcon(this.profile.userId); // Need min 15 chars
            this.profile.avatarImage =icon; // 'data:image/svg+xml;base64,'+ icon.toString();
        }
    }

    public disableButtons() : void {
        this.button.trust.disabled = true;
        this.button.untrust.disabled = true;
        this.button.distrust.disabled = true;
    }

    private setupSubjectProfile(): void {
        this.setupStatus();
        this.setupScore();
        this.setupButtons();
    }

    private setupCurrentUser() : void {
        this.status = { cssClass: "", text: "Current user", show: true, iconClass:"fas fa-question-circle trustIcon none" };
        this.isCurrentUser = true;
    }

    private isSomeoneElse() : void {
        this.setupStatus();
        this.setupButtons();
    }

    private setupStatus() : void {
        let trustGiven = false;
        if(this.trustResult) {

            let postText = this.trustResult.direct ? " directly" : " by the network";

            trustGiven = this.trustResult.trust > 0 || this.trustResult.distrust > 0;
            this.score.result = this.trustResult.trust - this.trustResult.distrust;
            if(this.score.result < 0)
                this.status = { cssClass: "distrusted", text: "Distrusted" + postText, show: true, iconClass:"fas fa-stop-circle trustIcon distrust"};

            if(this.score.result > 0)
                this.status = { cssClass: "trusted", text: "Trusted" + postText, show: true, iconClass:"fas fa-check-circle trustIcon trust"};

        }

        if(this.score.result == 0 && trustGiven)
            this.status = { cssClass: "", text: "Evenly trusted", show: true, iconClass:"fas fa-exclamation-circle trustIcon neutral"};
        else
            if(this.score.result == 0 && !trustGiven)
            this.status = { cssClass: "", text: "Not trusted yet", show: true, iconClass:"fas fa-question-circle trustIcon none"};

    }
    
    private setupScore() : void {
        this.score.show = (this.trustResult && this.trustResult.direct) ? false : true;
        //    this.score.show = true; // Only show score if not trust directly.
    }

    private setupButtons() : void {
        this.button.show = true;
        if(this.trustResult && this.trustResult.direct) 
            this.directButtons();
        else
            this.undirectButtons();
    }

    private directButtons(): void {
        let claimValue = this.trustResult.directValue;
        this.button.trust.disabled = false;
        this.button.distrust.disabled = false;
        this.button.untrust.disabled = false;


        if(claimValue == "true" || claimValue == "1") {
            this.button.trust.title = `${this.profile.alias} is trusted`;
            this.button.trust.disabled = true;
            this.button.trust.cssClass = "btn btn-success btn-sm active";
        }
        else {
            this.button.trust.title = `Trust ${this.profile.alias}`;
            this.button.trust.cssClass = "btn btn-outline-success btn-sm";
        }
        
        if(claimValue == "false" || claimValue == "0") {
            this.button.distrust.title = `${this.profile.alias} is distrusted`;
            this.button.distrust.disabled = true;
            this.button.distrust.cssClass = "btn btn-danger btn-sm active";
        } else {
            this.button.distrust.title = `Distrust ${this.profile.alias}`;
            this.button.distrust.cssClass = "btn btn-outline-danger btn-sm";
        }

        if(!claimValue || claimValue == "") {
            this.button.untrust.title = `No trust given to ${this.profile.alias}`;
            this.button.untrust.disabled = true;
            this.button.untrust.cssClass = "btn btn-secondary btn-sm active";
        } else {
            this.button.untrust.title = `Cancel your previous trust`;
            this.button.untrust.cssClass = "btn btn-outline-secondary btn-sm";
        }
    }

    private undirectButtons(): void {
        // Do nothing! Show everything!
        this.button.trust.title = `Trust ${this.profile.alias}`;
        this.button.trust.disabled = false;
        this.button.trust.cssClass = "btn btn-outline-success btn-sm";

        this.button.distrust.title = `Distrust ${this.profile.alias}`;
        this.button.distrust.disabled = false;
        this.button.distrust.cssClass = "btn btn-outline-danger btn-sm";

        this.button.untrust.title = `No trust to cancel`;
        this.button.untrust.disabled = true;
        this.button.untrust.cssClass = "btn btn-outline-secondary btn-sm";
    }
}
export = ProfileModal