import IProfile from "../IProfile";
import Identicon from "../Shared/Identicon";
import { DtpGraphCoreModelQueryContext } from "../../lib/typescript-jquery-client/model/models";
import BinaryTrustResult from "./BinaryTrustResult";
import * as $ from 'jquery';


export class TrustGraphStatusModel {
    public cssClass: string;
    public text: string;
    public show: boolean;
    public iconClass: string;
}

export class TrustGraphButtonModel {
    public disabled: boolean = false;
    public title: string;
    public cssClass: string;
}

export class ProfileModal
{
    public profile: IProfile;
    public subjectProfile: IProfile;
    public currentUser: IProfile;
    
    public queryResult: DtpGraphCoreModelQueryContext;
    public trustResult?: BinaryTrustResult;

    public processing: boolean = false;

    public show_score: boolean = false;
    public score: number = 0;
    public isCurrentUser: boolean = false;
    public status: TrustGraphStatusModel = new TrustGraphStatusModel();
    public visible: boolean = true;

    public inputForm: string = "thing";
    public trustButtonContainerVisible: boolean = false;
    public ratingStarsContainerVisible : boolean = false;
    public commentContainerVisible: boolean = false;
    public commentSubmitCallback: any;
    public note: string = "";

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
        this.queryResult = queryResult;
        this.trustResult = trustResult;

        Object.defineProperty(this, 'commentSubmitCallback', { enumerable: false, writable: true, value: null }); // No serialize to json!
    }    

    public setup(profileView? : ProfileModal) : ProfileModal {
        if(profileView)
            $.extend(this, profileView);

        this.inputForm = (this.profile.id.indexOf("1") == 0) ? "identity" : "thing";
        this.setInputForm();

        this.EnsureAvatarImage();
        
        if(this.currentUser && this.profile.id == this.currentUser.id) {
            this.setupCurrentUser();
            return this;
        }
        else {
            this.setupSubjectProfile();
            return this;
        }

        //this.isSomeoneElse();
        return this;
    }

    public resetValues() : void {
        this.queryResult = null;
        this.trustResult = null;
        this.score = 0;
        this.show_score = false;
    }

    public EnsureAvatarImage() : void {
        if(!this.profile.icon) {
            let icon = Identicon.createIcon(this.profile.id); // Need min 15 chars
            this.profile.icon =icon; // 'data:image/svg+xml;base64,'+ icon.toString();
        }
    }

    public setInputForm(): void {
        switch(this.inputForm) {
            case "identity" : this.trustButtonContainerVisible = true; break;
            case "thing" : this.ratingStarsContainerVisible = true; break;
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
        let postText = "";
        if(this.trustResult) {
            postText = this.trustResult.direct ? " directly" : " by the network";
        }

        if(this.trustResult.ratings > 0) {
            this.score = this.trustResult.value;
            this.status = { cssClass: "", text: "Rated" + postText, show: true, iconClass:""};
            return;
        }

        if(this.trustResult) {

            let postText = this.trustResult.direct ? " directly" : " by the network";

            trustGiven = this.trustResult.trust > 0 || this.trustResult.distrust > 0;
            this.score = this.trustResult.trust - this.trustResult.distrust;
            if(this.score < 0)
                this.status = { cssClass: "distrusted", text: "Distrusted" + postText, show: true, iconClass:"fas fa-stop-circle trustIcon distrust"};

            if(this.score > 0)
                this.status = { cssClass: "trusted", text: "Trusted" + postText, show: true, iconClass:"fas fa-check-circle trustIcon trust"};
        }

        if(this.score == 0 && trustGiven)
            this.status = { cssClass: "", text: "Evenly trusted", show: true, iconClass:"fas fa-exclamation-circle trustIcon neutral"};
        else
            if(this.score == 0 && !trustGiven)
            this.status = { cssClass: "", text: "Not trusted yet", show: true, iconClass:"fas fa-question-circle trustIcon none"};

    }
    
    private setupScore() : void {
        this.show_score = (this.trustResult && this.trustResult.direct) ? false : true;
        //    this.score.show = true; // Only show score if not trust directly.
    }

    private setupButtons() : void {
        if(this.trustResult.ratings > 0)
            return;

        this.button.show = true;
        if(this.trustResult && this.trustResult.direct) 
            this.directButtons();
        else
            this.undirectButtons();
    }

    private directButtons(): void {
        let claimValue = this.trustResult.value;
        this.button.trust.disabled = false;
        this.button.distrust.disabled = false;
        this.button.untrust.disabled = false;


        if(claimValue > 0) {
            this.button.trust.title = `${this.profile.title} is trusted`;
            this.button.trust.disabled = true;
            this.button.trust.cssClass = "btn btn-success btn-sm active";
        }
        else {
            this.button.trust.title = `Trust ${this.profile.title}`;
            this.button.trust.cssClass = "btn btn-outline-success btn-sm";
        }
        
        if(claimValue < 0) {
            this.button.distrust.title = `${this.profile.title} is distrusted`;
            this.button.distrust.disabled = true;
            this.button.distrust.cssClass = "btn btn-danger btn-sm active";
        } else {
            this.button.distrust.title = `Distrust ${this.profile.title}`;
            this.button.distrust.cssClass = "btn btn-outline-danger btn-sm";
        }

        if(claimValue == 0) {
            this.button.untrust.title = `No trust given to ${this.profile.title}`;
            this.button.untrust.disabled = true;
            this.button.untrust.cssClass = "btn btn-secondary btn-sm active";
        } else {
            this.button.untrust.title = `Cancel your previous trust`;
            this.button.untrust.cssClass = "btn btn-outline-secondary btn-sm";
        }
    }

    private undirectButtons(): void {
        // Do nothing! Show everything!
        this.button.trust.title = `Trust ${this.profile.title}`;
        this.button.trust.disabled = false;
        this.button.trust.cssClass = "btn btn-outline-success btn-sm";

        this.button.distrust.title = `Distrust ${this.profile.title}`;
        this.button.distrust.disabled = false;
        this.button.distrust.cssClass = "btn btn-outline-danger btn-sm";

        this.button.untrust.title = `No trust to cancel`;
        this.button.untrust.disabled = true;
        this.button.untrust.cssClass = "btn btn-outline-secondary btn-sm";
    }
}
