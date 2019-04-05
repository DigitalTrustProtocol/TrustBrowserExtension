import './common.js';
import ProfileController = require("./ProfileController");
import Profile = require("./Profile");
import IProfile from "./IProfile";
import Identicon = require('identicon.js');
import Crypto = require("./Crypto");
import BinaryTrustResult = require('./Model/BinaryTrustResult.js');
import { TrustGraphPopupClient } from './Shared/TrustGraphPopupClient.js';

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
    public buttons: Array<ProfileViewButtonModel>  = [];
    private controller: ProfileController;
    /**
     *
     */
    constructor(controller: ProfileController) {
        this.controller = controller;
    }

    public setup() : void {
        if(this.controller.trustResult && this.controller.trustResult.claims.length > 0) 
            this.setupWithData();
        else 
            this.setupEmpty();
    }

    private setupWithData() : void {
        let btr = this.controller.trustResult;
        
        if(btr.state > 0) {
            this.buttons.push(new ProfileViewButtonModel("Trust", true, btr.direct, btr.trust));
            this.buttons.push(new ProfileViewButtonModel("Distrust", false, btr.direct, btr.distrust));
        }
        
        if(btr.state < 0) {
            this.buttons.push(new ProfileViewButtonModel("Trust", false, btr.direct, btr.trust));
            this.buttons.push(new ProfileViewButtonModel("Distrust", true, btr.direct, btr.distrust));
        }

        if(btr.state == 0) {
            this.buttons.push(new ProfileViewButtonModel("Trust", false, btr.direct, btr.trust));
            this.buttons.push(new ProfileViewButtonModel("Distrust", false, btr.direct, btr.distrust));
        }

        if(btr.direct)
            this.buttons.push(new ProfileViewButtonModel("Untrust", false));

    }



    private setupEmpty() : void {
        this.buttons.push(new ProfileViewButtonModel("Trust"));
        this.buttons.push(new ProfileViewButtonModel("Distrust"));
    }
}

class ProfileView {
    Anchor: string;
    fullNameGroup: string;
    trustGraphPopupClient: TrustGraphPopupClient;

    //constructor(controller?: ProfileController) {
    constructor(trustGraphPopupClient: TrustGraphPopupClient) {
        //this.controller = controller;
        //this.checkIconUrl = chrome.extension.getURL("img/check13.gif");
        this.Anchor = 'div.ProfileTweet-action--favorite';
        this.fullNameGroup = '.FullNameGroup';
        this.trustGraphPopupClient = trustGraphPopupClient;
    }

    public render(controller: ProfileController, element: HTMLElement): void {
        const $element = $(element);
        let $bar = $element.data('dtp_bar') as JQuery;
        if (!$bar) {
            let $anchor = $element.find(this.Anchor);
            $bar = $('<span>') as JQuery;
            $anchor.after($bar);
            $bar.$fullNameGroup = $element.find(this.fullNameGroup);
            $bar.$fullNameGroup.prepend(this.createIdenticon(controller.profile));
            $element.data('dtp_bar', $bar);
        }

        let html = this.createBar(controller);
        $bar.html(html); // Replace with new html
    }

    private createBar(controller: ProfileController): string {
        // Create model
        let model = new ProfileViewModel(controller);
        model.setup();
        let html = model.buttons.map(this.renderButton).join('');
        return  html;
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
        // let $html = $(html);
        // return {
        //     $html: $html,
        //     $a: $("a", $html),
        //     $span: $('.ProfileTweet-actionCountForPresentation', $html)
        // }
    }



    // renderElement(element) {
    //     const $element = $(element);
    //     let bar = $element.data('dtp_bar');
    //     if (!bar) {
    //         let $anchor = $element.find(this.Anchor);

    //         if ($anchor.find('.trustIcon').length > 0)
    //             return;

    //         bar = {
    //             trust: this.createButton("Trust", "trustIconPassive", "trust", undefined),
    //             distrust: this.createButton("Distrust", "distrustIconPassive", "distrust", undefined),
    //             untrust: this.createButton("Untrust", "untrustIconPassive", "untrust", undefined),
    //         }

    //         bar.$fullNameGroup = $element.find(this.fullNameGroup);
    //         bar.$fullNameGroup.prepend(this.createIdenticon(this.controller.profile));

    //         $anchor.after(bar.untrust.$html);
    //         $anchor.after(bar.distrust.$html);
    //         $anchor.after(bar.trust.$html);
    //         bar.untrust.$html.hide();

    //         $element.data('dtp_bar', bar);


    //         // let $followButton = $("<li class='follow-link js-actionFollow' data-nav='follow' role='presentation'>"+
    //         //                      "<button type='button' class='dropdown-link' role='menuitem'>Follow <span class='username u-dir u-textTruncate' dir='ltr'>@<b>zerohedge</b></span></button>"+
    //         //                      "</li>");


    //         //$followButton.insertAfter($element.find("li.mute-user-item"));
    //     }

    //     bar.trust.$a.removeClass("trustIconActive").addClass("trustIconPassive");
    //     bar.trust.$span.text('');
    //     bar.distrust.$a.removeClass("distrustIconActive").addClass("trustIconPassive");
    //     bar.distrust.$span.text('');

    //     if (!this.controller.profile.binaryTrustResult)
    //         return;
    //     let result = this.controller.profile.binaryTrustResult;

    //     if (result.state > 0) {
    //         bar.trust.$a.removeClass("trustIconPassive").addClass("trustIconActive");
    //         bar.trust.$span.text(result.trust);

    //     }

    //     if (result.state < 0) {

    //         if (this.controller.host.settings.twitterdistrust == "hidecontent") {
    //             bar.distrust.$a.removeClass("trustIconPassive").addClass("distrustIconActive");
    //             bar.distrust.$span.text(result.distrust);
    //             $element.find('.js-tweet-text-container').hide();
    //             $element.find('.QuoteTweet-container').hide();
    //             $element.find('.AdaptiveMediaOuterContainer').hide();
    //             $element.find('.card2').hide();

    //         }
    //         if (this.controller.host.settings.twitterdistrust == "automute") {
    //             $element.hide(); // Hide the tweet!
    //         }
    //     }
    //     else {
    //         $element.find('.js-tweet-text-container').show();
    //         $element.find('.QuoteTweet-container').show();
    //         $element.find('.AdaptiveMediaOuterContainer').show();
    //     }

    //     if (result.direct) {
    //         bar.untrust.$html.show();
    //     }
    // }

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

    createFollowButton($selectedTweet: JQuery, profile: IProfile): JQuery {
        let $button = $selectedTweet.find('button.dtp-follow > span:first');
        if ($button.length == 0) {

            let user_id = $selectedTweet.data("user-id");
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
            $selectedTweet.append($card);
        }
        return $button;
    }



}
export = ProfileView