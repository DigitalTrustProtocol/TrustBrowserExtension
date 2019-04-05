import './common.js';
import ProfileController = require("./ProfileController");
import Profile = require("./Profile");
import IProfile from "./IProfile";
import Identicon = require('identicon.js');
import Crypto = require("./Crypto");
import BinaryTrustResult = require('./Model/BinaryTrustResult');
import { TrustGraphPopupClient } from './Shared/TrustGraphPopupClient';
import ISettings from './Settings.interface';

//declare var Identicon: any;
class ProfileViewButtonModel {
    public disabled: boolean = false;
    public text: string = ""; 
    public title: string= "";
    public iconClass: string = "";
    public typeClass: string = "";
    public countText: string = ""; 
    public countTitle: string = "";

    constructor(name: string, active: boolean = false, direct: boolean = false, count: number = 0) {
        let type = name.toLocaleLowerCase();
        this.text = name;
        this.title = name;
        this.typeClass = type;
        this.iconClass = active ? `${type}IconActive` : `${type}IconPassive`;
        this.countTitle = direct ? `${name}ed directly`: `${name}ed by ${count} others`;
        if(direct) 
            this.countText = active ? "!" : "";
        else
            this.countText = count > 0 ? `${count}` : "";
    }
}

class ProfileViewModel {
    public time: number = undefined;
    public settingsTime: number = undefined;
    public stateChanged: boolean = true;

    public buttons: Array<ProfileViewButtonModel>  = [];
    public trustResult: BinaryTrustResult;

}

class ProfileView {
    Anchor: string;
    fullNameGroup: string;
    trustGraphPopupClient: TrustGraphPopupClient;
    settings: ISettings;

    constructor(trustGraphPopupClient: TrustGraphPopupClient, settings: ISettings) {
        this.Anchor = 'div.ProfileTweet-action--favorite';
        this.fullNameGroup = '.FullNameGroup';
        this.trustGraphPopupClient = trustGraphPopupClient;
        this.settings = settings;
    }

    public render(controller: ProfileController, element: HTMLElement): void {
        const $element = $(element);

        //let controller = $element.data("dtp_controller") as ProfileController; // Is possible
        let model = $element.data('dtp_viewmodel') as ProfileViewModel || new ProfileViewModel();
        if(controller.trustResult && model.trustResult) {
            if(model.time == controller.trustResult.time) 
                return; // We know that the data have not changed for this element.

            model.stateChanged = (model.trustResult.state != controller.trustResult.state) || (model.settingsTime != this.settings.time);
        } else {
            if(!controller.trustResult)
                controller.trustResult = new BinaryTrustResult();
            
            model.stateChanged = true;
        }

        model.trustResult = controller.trustResult;
        model.time = controller.trustResult.time;
        model.settingsTime = this.settings.time;

        if(model.trustResult.claims.length > 0) 
            this.setupButtons(model);
        else 
            this.setupEmpty(model);

        this.renderBar(controller, $element, model);
        this.userAction(controller, $element, model);

        $element.data('dtp_viewmodel', model);
    }

    private renderBar(controller: ProfileController, $element: JQuery, model: ProfileViewModel) : void {
        let $bar = $element.data('dtp_bar') as JQuery;
        if (!$bar) {
            let $anchor = $element.find(this.Anchor);
            $bar = $('<span>') as JQuery;
            $anchor.after($bar);
            $bar.$fullNameGroup = $element.find(this.fullNameGroup);
            $bar.$fullNameGroup.prepend(this.createIdenticon(controller.profile));
            $element.data('dtp_bar', $bar);
        }

        let html = model.buttons.map(this.renderButton).join('');
        $bar.html(html); // Replace with new html
    }


    private setupButtons(model: ProfileViewModel) : void {
        let btr = model.trustResult;
        
        model.buttons = [];

        if(btr.state > 0) {
            model.buttons.push(new ProfileViewButtonModel("Trust", true, btr.direct, btr.trust));
            model.buttons.push(new ProfileViewButtonModel("Distrust", false, btr.direct, btr.distrust));
        }
        
        if(btr.state < 0) {
            model.buttons.push(new ProfileViewButtonModel("Trust", false, btr.direct, btr.trust));
            model.buttons.push(new ProfileViewButtonModel("Distrust", true, btr.direct, btr.distrust));
        }

        if(btr.state == 0) {
            model.buttons.push(new ProfileViewButtonModel("Trust", false, btr.direct, btr.trust));
            model.buttons.push(new ProfileViewButtonModel("Distrust", false, btr.direct, btr.distrust));
        }

        if(btr.direct)
            model.buttons.push(new ProfileViewButtonModel("Untrust", false));

    }

    private setupEmpty(model: ProfileViewModel) : void {
        model.buttons = [];
        model.buttons.push(new ProfileViewButtonModel("Trust"));
        model.buttons.push(new ProfileViewButtonModel("Distrust"));
    }


    userAction(controller: ProfileController, $element: JQuery, model: ProfileViewModel): void {

        if (model.trustResult.state == 0) {
            if(model.stateChanged)
                this.showElement($element); // Show element as the state has change
            return; // Exit
        }
            
        if (model.trustResult.state > 0) {
            if (this.settings.twittertrust == "autofollow") {
                this.follow(controller, $element);
            }

            if(model.stateChanged)
                this.showElement($element);

            return;
        }


        if (model.trustResult.state < 0) {

            if (this.settings.twitterdistrust == "hidecontent") {
                if(model.stateChanged)
                    this.hideElement($element);
            }

            if (this.settings.twitterdistrust == "automute") {
                $element.find("li.mute-user-item").trigger("click");
            }

            if (this.settings.twitterdistrust == "autoblock") {
                $element.find("li.block-link").trigger("click");
                $("body").removeClass("modal-enabled");
                $(document).find("#block-dialog").hide();
                $(document).find("button.block-button").trigger("click");
                $(document).find("span.Icon--close").trigger("click");
            }
        }
    }

    private showElement($element: JQuery) : void {
        $element.find('.js-tweet-text-container').show();
        $element.find('.QuoteTweet-container').show();
        $element.find('.AdaptiveMediaOuterContainer').show();
        $element.find('.card2').show();
    }

    private hideElement($element: JQuery) : void {
        $element.find('.js-tweet-text-container').hide();
        $element.find('.QuoteTweet-container').hide();
        $element.find('.AdaptiveMediaOuterContainer').hide();
        $element.find('.card2').hide();
    }

    private follow(controller: ProfileController, $element: JQuery) : void {
        DTP['trace']("Follow " + controller.profile.screen_name);

        let follow = $element.data("you-follow");
        if (follow)
            return;

        var $button = this.createFollowButton($element, controller.profile);
        $button.click();
    }


    private renderButton(button: ProfileViewButtonModel) {
        let html = `<div class="ProfileTweet-action ProfileTweet-action" style="min-width:40px">
                        <button class="ProfileTweet-actionButton u-textUserColorHover js-actionButton" type="button">
                            <div class="IconContainer js-tooltip" >
                                <span class="Icon Icon--medium">
                                    <a class="trustIcon ${button.typeClass} js-tooltip ${button.iconClass}" data-original-title="${button.title}" title="${button.title}"></a>
                                </span>
                                <span class="u-hiddenVisually">${button.text}</span>
                            </div>
                            <span class="ProfileTweet-actionCount">
                                <span class="ProfileTweet-actionCountForPresentation" aria-hidden="true">${button.countText}</span>
                            </span>
                        </button>
                    </div>`;

        return html;
    
    }

    static createTweetDTPButton() {
        let $editButton = $('.ProfileNav-list .edit-button');
        if ($editButton.length == 0)
            return;

        let $tweetDTP = $editButton.parent().find('button.tweet-dtp');
        if ($tweetDTP.length > 0)
            return;

        $tweetDTP = $(
            '<button type="button" class="EdgeButton EdgeButton--tertiary dtpUserAction-Button tweet-dtp">' +
            '<span class="button-text">Tweet DTP</span>' +
            '</button>'
        );

        $editButton.before($tweetDTP);
    }

    static showMessage(message) {
        let pop = $('#message-drawer');
        pop.find('.message-text').text(message);
        pop.attr("style", "").removeClass('hidden').delay(3000).fadeOut(1000, function () {
            pop.addClass('hidden').attr("style", "top: -40px;");
        });
    }

    createIdenticon(profile: IProfile) {
        let iconData = null;
        if (!profile.identiconData16) {
            //let hash = Crypto.Hash160(profile.userId).toBase64();
            let hash = Crypto.toDTPAddress(Crypto.Hash160(profile.userId));
            let icon = new Identicon(hash, { margin: 0.1, size: 16, format: 'svg' }); // Need min 15 chars
            profile.identiconData16 = icon.toString();
            //profile.time = Date.now();
            //profile.controller.save();
        }

        iconData = profile.identiconData16;

        let $icon = $('<a title="' + profile.screen_name + '" href="javascript:void 0"><img src="data:image/svg+xml;base64,' + iconData + '" class="dtpIdenticon"></a>');
        $icon.data("dtp_profile", profile);

        $icon.click(() => {
            let selectedProfile = $(this).data('dtp_profile');

            //let p = selectedProfile.
            //let parentProfile = this.profileRepository.getProfileByIndex(claim.issuer.id); // issuer is always a DTP ID

            let dialogData = {
                scope: Profile.CurrentUser.scope,
                currentUser: Profile.CurrentUser,
                selectedProfile: selectedProfile,
                trustResult: null
            };

            this.trustGraphPopupClient.openPopup({ data: dialogData });
            return false;
        });
        return $icon;
    }

    createFollowButton($element: JQuery, profile: IProfile): JQuery {
        let $button = $element.find('button.dtp-follow > span:first');
        if ($button.length == 0) {

            let user_id = $element.data("user-id");
            let html = `<div class="user-actions not-following not-muting" data-screen-name="${profile.screen_name}" data-user-id="${profile.userId}">
                        <span class="user-actions-follow-button js-follow-btn follow-button">
                        <button type="button" class="
                        EdgeButton
                        EdgeButton--secondary
                        EdgeButton--small 
                        dtp-follow
                        button-text
                        follow-text">
                            <span aria-hidden="true">Follow</span>
                        </button>
                    </span>
                    </div>`;
            //            <span class="u-hiddenVisually">Follow <span class="username u-dir u-textTruncate" dir="ltr">@<b>${this.profile.screen_name}</b></span></span>


            let $card = $(html).hide();
            $button = $card.find('button > span:first');
            $element.append($card);
        }
        return $button;
    }
}
export = ProfileView