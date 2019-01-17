import ProfileController = require("./ProfileController");

declare var Identicon: any;
declare var tce: any;
class ProfileView {
    public controller: ProfileController;
    Anchor: string;
    fullNameGroup: string;

    constructor( controller?: ProfileController) {
        this.controller = controller;
        //this.checkIconUrl = chrome.extension.getURL("img/check13.gif");
        this.Anchor = '.ProfileTweet-action--favorite';
        this.fullNameGroup = '.FullNameGroup';
    }

    renderElement (element) {
        const $element = $(element);
        let bar = $element.data('dtp_bar');
        if(!bar) {
            let $anchor = $element.find(this.Anchor);

            if($anchor.find('.trustIcon').length > 0)
                return;

            bar = {
                trust: this.createButton("Trust", "trustIconPassive", "trust", undefined),
                distrust: this.createButton("Distrust", "distrustIconPassive", "distrust", undefined),
                untrust:this.createButton("Untrust", "untrustIconPassive", "untrust", undefined),
                follow:this.createButton("Follow", "trustIconPassive", "follow", undefined)
            }

            bar.$fullNameGroup = $element.find(this.fullNameGroup);
            bar.$fullNameGroup.prepend(this.createIdenticon(this.controller.profile));
           
            $anchor.after(bar.follow.$html);
            $anchor.after(bar.untrust.$html);
            $anchor.after(bar.distrust.$html);
            $anchor.after(bar.trust.$html);
            bar.untrust.$html.hide();

            $element.data('dtp_bar', bar);

            
            let $followButton = $("<li class='follow-link js-actionFollow' data-nav='follow' role='presentation'>"+
                                 "<button type='button' class='dropdown-link' role='menuitem'>Follow <span class='username u-dir u-textTruncate' dir='ltr'>@<b>zerohedge</b></span></button>"+
                                 "</li>");
            
            
            //$followButton.insertAfter($element.find("li.mute-user-item"));
        }

        bar.trust.$a.removeClass("trustIconActive").addClass("trustIconPassive");
        bar.trust.$span.text('');
        bar.distrust.$a.removeClass("distrustIconActive").addClass("trustIconPassive");
        bar.distrust.$span.text('');

        if(!this.controller.profile.result)
            return;

        if (this.controller.profile.result.state > 0) {
            bar.trust.$a.removeClass("trustIconPassive").addClass("trustIconActive");
            bar.trust.$span.text(this.controller.profile.result.trust);

        } 

        if (this.controller.profile.result.state < 0 ) {

            if(this.controller.host.settings.twitterdistrust == "hidecontent") {
                bar.distrust.$a.removeClass("trustIconPassive").addClass("distrustIconActive");
                bar.distrust.$span.text(this.controller.profile.result.distrust);
                $element.find('.js-tweet-text-container').hide();
                $element.find('.QuoteTweet-container').hide();
                $element.find('.AdaptiveMediaOuterContainer').hide();
            }
            if(this.controller.host.settings.twitterdistrust == "automute") {
                 $element.hide(); // Hide the tweet!
            }
        }
        else {
            $element.find('.js-tweet-text-container').show();
            $element.find('.QuoteTweet-container').show();
            $element.find('.AdaptiveMediaOuterContainer').show();
        }

        if (this.controller.profile.result.direct) {
            bar.untrust.$html.show();
        }
    } 

    static createTweetDTPButton() {
        let $editButton = $('.ProfileNav-list .edit-button');
        if($editButton.length == 0)
            return;

        let $tweetDTP = $editButton.parent().find('button.tweet-dtp');
        if($tweetDTP.length > 0)
            return;
       
        $tweetDTP = $(
            '<button type="button" class="EdgeButton EdgeButton--tertiary dtpUserAction-Button tweet-dtp">'+
            '<span class="button-text">Tweet DTP</span>'+
            '</button>'
        );
        
        $editButton.before($tweetDTP);
    }
    
   static showMessage(message) {
        let pop = $('#message-drawer');
        pop.find('.message-text').text(message);
        pop.attr("style", "").removeClass('hidden').delay(3000).fadeOut(1000, function() {
            pop.addClass('hidden').attr("style", "top: -40px;");
        });
    }

    createIdenticon(profile) {
        let iconData = null;
        if(!profile.identiconData16) {
            let icon = new Identicon(profile.address, {margin:0.1, size:16, format: 'svg'});
            profile.identiconData16 = icon.toString();
            profile.time = Date.now();
            profile.controller.save();
        }
        iconData = profile.identiconData16;

        let $icon = $('<a title="'+profile.screen_name+'" href="javascript:void 0" title"'+ profile.address +'"><img src="data:image/svg+xml;base64,' + iconData + '" class="dtpIdenticon"></a>');
        $icon.data("dtp_profile", profile);
        $icon.click(function() {
            var opt = {
                command:'openDialog',
                 url: 'trustlist.html',
                 data: $(this).data('dtp_profile')
             };
             opt['w'] = 800;
             opt['h'] = 800;
             var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
             var wTop = window.screenTop ? window.screenTop : window.screenY;
    
             opt['left'] = Math.floor(wLeft + (window.innerWidth / 2) - (opt['w'] / 2));
             opt['top'] = Math.floor(wTop + (window.innerHeight / 2) - (opt['h'] / 2));
             
             chrome.runtime.sendMessage(opt);
             return false;
         });
        return $icon;
    }

    createFollowButton($selectedTweet : JQuery) : JQuery {
        let $button = $selectedTweet.find('button.dtp-follow > span:first');
        if($button.length == 0)  {

            let user_id = $selectedTweet.data("user-id");
            let html = `<div class="user-actions not-following not-muting" data-screen-name="${this.controller.profile.screen_name}" data-user-id="${user_id}">
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



   createButton (text, iconClass, type, count) {
        let number = count || "";
        let html = '<div class="ProfileTweet-action ProfileTweet-action" style="min-width:40px">'+
        '<button class="ProfileTweet-actionButton u-textUserColorHover js-actionButton" type="button" >' +
        '<div class="IconContainer js-tooltip" >'+
        '<span class="Icon Icon--medium"><a class="trustIcon '+ type +' js-tooltip '+  iconClass +'" data-original-title="'+text+'" title="'+text+'"></a></span>' +
        '<span class="u-hiddenVisually">'+text+'</span>'+
        '</div>'+
        '<span class="ProfileTweet-actionCount">'+
        '<span class="ProfileTweet-actionCountForPresentation" aria-hidden="true">'+ number +'</span>'+
        '</span>'+
        '</button></div>';

        let $html = $(html);
        return {
            $html: $html,
            $a: $("a", $html),
            $span: $('.ProfileTweet-actionCountForPresentation', $html)
        }
    }
}
export = ProfileView