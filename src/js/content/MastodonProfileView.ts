import '../common.js';
import ProfileController = require("../ProfileController");
import Profile = require("../Profile");
import IProfile from "../IProfile";
import Identicon = require('identicon.js');
import Crypto = require("../Crypto");
import BinaryTrustResult = require('../Model/BinaryTrustResult');
import { TrustGraphPopupClient } from '../Shared/TrustGraphPopupClient';
import ISettings from '../Interfaces/Settings.interface.js';
import IProfileView from './IProfileView.js';
import { browser } from 'webextension-polyfill-ts';
import * as $ from 'jquery';
import IGraphData from './IGraphData.js';
import IOpenDialogResult from '../Model/OpenDialogResult.interface.js';

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

class ProfileViewModel  {
    public time: number = undefined;
    public settingsTime: number = undefined;
    public stateChanged: boolean = true;

    public buttons: Array<ProfileViewButtonModel>  = [];
    public trustResult: BinaryTrustResult;

}

class MastodonProfileView implements IProfileView {
    Anchor: string;
    fullNameGroup: string;
    settings: ISettings;
    viewModel = new ProfileViewModel();

    constructor(settings: ISettings) {
        this.Anchor = 'div.status__action-bar__counter';
        this.fullNameGroup = 'span.display-name';
        this.settings = settings;
    }

    public setViewModel(controller: ProfileController): void {
        if(controller.trustResult && this.viewModel.trustResult) {
            this.viewModel.stateChanged = (this.viewModel.trustResult.state != controller.trustResult.state) || (this.viewModel.settingsTime != this.settings.time);
        } else {
            if(!controller.trustResult)
                controller.trustResult = new BinaryTrustResult();
            
                this.viewModel.stateChanged = true;
        }

        this.viewModel.trustResult = controller.trustResult;
        this.viewModel.time = controller.trustResult.time;
        this.viewModel.settingsTime = this.settings.time;

        if(this.viewModel.trustResult.claims.length > 0) 
            this.setupButtons(this.viewModel);
        else 
            this.setupEmpty(this.viewModel);
    }

    public render(controller: ProfileController, element: HTMLElement): void {
        const $element = $(element);
        if(!this.viewModel.stateChanged) {
            let $identicon = $element.find(".dtp-identicon");
            if($identicon.length > 0)
                return;
        }

        this.renderIdenticon(controller, $element);
        this.renderBar(controller, $element, this.viewModel);
        this.userAction(controller, $element, this.viewModel);
    }

    private renderIdenticon(controller: ProfileController, $element: JQuery) : JQLite {
       
        let $identicon = $element.find(".dtp-identicon");
        if($identicon.length > 0)
            return;

        let $nameGroup = $element.find(this.fullNameGroup);
        $identicon = this.createIdenticon(controller);
        $nameGroup.prepend($identicon);
        return $identicon;
    }

    private renderBar(controller: ProfileController, $element: JQuery, model: ProfileViewModel) : void {
        let $anchor = $element.find(this.Anchor);
        let $bar = $anchor.parent().find('div.dtp-bar');
        if (!$bar.length) {
            $bar = $('<div class="dtp-bar">') as JQuery;
            $anchor.after($bar);
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
                this.mute(controller, $element);
            }

            if (this.settings.twitterdistrust == "autoblock") {
                this.block(controller, $element);
            }
        }
    }

    private showElement($element: JQuery) : void {
        $element.find('.status__content').show();
        $element.find('.status-card').show();
    }

    private hideElement($element: JQuery) : void {
        $element.find('.status__content').hide();
        $element.find('.status-card').hide();
    }

    private mute(controller: ProfileController, $element: JQuery) : void {
        if (controller.profile["youMute"])
            return;

        // $element.find("div.status__action-bar-dropdown button").trigger("click");
        // setTimeout(() => {
        //     $(($element.get(0) as HTMLElement).ownerDocument).find()
        // }, 1);

        controller.profile["youMute"] = true;
    }

    private block(controller: ProfileController, $element: JQuery) : void {
        if (controller.profile["youBlock"])
            return;

        // $element.find("li.block-link").trigger("click");
        // $("body").removeClass("modal-enabled");
        // $(document).find("#block-dialog").hide();
        // $(document).find("button.block-button").trigger("click");
        // $(document).find("span.Icon--close").trigger("click");

        controller.profile["youBlock"] = true;
    }



    private follow(controller: ProfileController, $element: JQuery) : void {
        DTP['trace']("Follow " + controller.profile.screen_name);

        if (controller.profile["youFollow"])
            return;

        // var $button = this.createFollowButton($element, controller.profile);
        // $button.click();
        controller.profile["youFollow"] = true;
    }


    private renderButton(button: ProfileViewButtonModel) {
        let html = `<button aria-label="Boost" aria-pressed="false" title="${button.title}" class="icon-button" tabindex="0" style="font-size: 18px; width: 23.1429px; height: 23.1429px; line-height: 24px;">
                        <i role="img" class="trustIcon ${button.typeClass} ${button.iconClass}" aria-hidden="true"></i>
                    </button>`;
        return html;
    
    }

    static showMessage(message) {
        // let pop = $('#message-drawer');
        // pop.find('.message-text').text(message);
        // pop.attr("style", "").removeClass('hidden').delay(3000).fadeOut(1000, function () {
        //     pop.addClass('hidden').attr("style", "top: -40px;");
        // });
        console.log(message);
    }

    createIdenticon(controller: ProfileController) {

        let iconData = null;
        if (!controller.profile.identiconData16) {
            //let hash = Crypto.Hash160(profile.userId).toBase64();
            let hash = Crypto.toDTPAddress(Crypto.Hash160(controller.profile.userId));
            let icon = new Identicon(hash, { margin: 0.1, size: 16, format: 'svg' }); // Need min 15 chars
            controller.profile.identiconData16 = icon.toString();
            //profile.time = Date.now();
            //profile.controller.save();
        }

        iconData = controller.profile.identiconData16;

        let $icon = $('<a title="' + controller.profile.screen_name + '" href="javascript:void 0" class="dtp-identicon-btn"><img src="data:image/svg+xml;base64,' + iconData + '" class="dtp-identicon"></a>');
        if(controller.onTrustGraphClick)  // Bind event directly, to ensure call
            $icon.click(controller.onTrustGraphClick);

        return $icon;
    }
}
export = MastodonProfileView