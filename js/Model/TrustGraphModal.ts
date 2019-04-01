import IProfile from "../IProfile";


class TrustGraphScoreModel {
    public show: boolean = false;
    public result: number = 0;
}

class TrustGraphStatusModel {
    public cssClass: string;
    public text: string;
    public show: boolean;
}

class TrustGraphButtonModel {
    public disabled: boolean = false;
    public title: string;
    public cssClass: string;
}

class TrustGraphModal
{
    

    public profile: IProfile;
    public subjectProfile: IProfile;
    public currentUser: IProfile;
    
    public spinner: string;
    public processing: boolean = false;
    public score: TrustGraphScoreModel = new TrustGraphScoreModel();
    public isCurrentUser: boolean = false;
    public status: TrustGraphStatusModel = new TrustGraphStatusModel();

    public button = {
        show: false,
        trust: new TrustGraphButtonModel(),
        untrust: new TrustGraphButtonModel(),
        distrust: new TrustGraphButtonModel()
    }
    /**
     *
     */
    constructor(selectedProfile: IProfile, subjectProfile: IProfile, currentUser: IProfile) {
        this.profile = selectedProfile;
        this.subjectProfile = subjectProfile;
        this.currentUser = currentUser;
        this.spinner = chrome.extension.getURL("../img/Spinner24px.gif");
        this.setup();
    }    

    public setup() : void {
        if(this.profile.userId == this.subjectProfile.userId) {
            this.setupSubjectProfile();
            return;
        }

        if(this.profile.userId == this.currentUser.userId) {
            this.setupCurrentUser();
            return;
        }

        this.isSomeoneElse();

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
        this.status = { cssClass: "", text: "Current user", show: true };
        this.isCurrentUser = true;
    }

    private isSomeoneElse() : void {
        this.setupStatus();
        this.setupButtons();
    }

    private setupStatus() : void {
        if(this.profile.binaryTrustResult) {
            let postText = this.profile.binaryTrustResult.direct ? " directly" : "";

            this.score.result = this.profile.binaryTrustResult.trust - this.profile.binaryTrustResult.distrust;
            if(this.score.result < 0)
                this.status = { cssClass: "distrusted", text: "Distrusted" + postText, show: true};

            if(this.score.result > 0)
                this.status = { cssClass: "trusted", text: "Trusted" + postText, show: true};
        }

        if(this.score.result == 0)
            this.status = { cssClass: "", text: "No trust given", show: true};
    }
    
    private setupScore() : void {
        this.score.show = (this.profile.binaryTrustResult && this.profile.binaryTrustResult.direct) ? false : true;
        //    this.score.show = true; // Only show score if not trust directly.
    }

    private setupButtons() : void {
        this.button.show = true;
        if(this.profile.binaryTrustResult && this.profile.binaryTrustResult.direct) 
            this.directButtons();
        else
            this.undirectButtons();
    }

    private directButtons(): void {
        let claimValue = this.profile.binaryTrustResult.directValue;
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
export = TrustGraphModal 