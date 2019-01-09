import DTPService = require("./DTPService");

declare var Identicon: any;

class TagBar  {
    subject: any;
    container: HTMLElement;
    settings: any;
    packageBuilder: any;
    subjectService: any;
    dtpService: any;
    updateCallback: any;
    // Static properties
    static TAGBAR_NAME = 'reddittagbar';
    static instances = [];
    $neutralLink: any;
    $trustLink: any;
    $distrustLink: any;
    $bar: any;
    $content: any;
    $identicon: JQLite;


    // Constructor
    constructor(subject, settings: any, packageBuilder, subjectService, dtpService) {
        this.subject = subject;
        this.container = $('<span />')[0];
        this.settings = settings;
        this.packageBuilder = packageBuilder;
        this.subjectService = subjectService;
        this.dtpService = dtpService;
        this.updateCallback = undefined;
    }

    // Instance methods
    update (networkScore, personalScore) {
        if (this.$neutralLink.length > 0 && personalScore === 0) {
            this.$neutralLink.hide();
        } else {
            this.$neutralLink.show();
        }
        
        if (this.$trustLink.length > 0 && personalScore > 0) {
            //this.$trustLink.removeAttr("href");
            this.$trustLink.hide();
        } else {
            //this.$trustLink.attr('href', 'javascript:void 0');
            this.$trustLink.show();
        }

        if (this.$distrustLink.length > 0 && personalScore < 0) {
            //this.$distrustLink.removeAttr("href");
            this.$distrustLink.hide();
        } else {
            //this.$distrustLink.attr('href', 'javascript:void 0');
            this.$distrustLink.show();
        }


        // if (this.$trusticon.length > 0 && networkScore === 0) {
        //      this.$trusticon.hide();
        // } else {
        //     this.$trusticon.show();
        //     if(networkScore > 0) {
        //         this.$trusticon.attr('src', 'check16.png');
        //     } else {
        //         this.$trusticon.attr('src', 'close16.png');
        //     }
        // }
                        
        if (true) { // this.settings.resultrender === "color") {
            if (this.$bar.length > 0 && networkScore === 0) {
                this.$bar.attr('style','');
            } else {
                if(networkScore > 0) {
                    this.$bar.attr('style','background-color:'+this.settings.trustrendercolor);
                } else {
                    this.$bar.attr('style','background-color:'+this.settings.resultrendercolor);
                }
            }
        }
        
        if (this.$content && this.$content.length > 0 && networkScore < 0) {
            if(this.settings.resultrenderhide) {
                this.$content.hide();
            } else {
                this.$content.show();
            }
        } else {
            this.$content.show();
        }


    }

    render (expando, subject) {
        const self = this;
        let $htmlElement = $(expando.jsapiTarget);
        if($htmlElement.data(TagBar.TAGBAR_NAME)) return;

        if(this.container.childElementCount === 0) {
            
            this.$identicon = this.createIdenticon(this.subject, "Analyse "+this.subject.author);
            //this.$trustLink = this.createButtonTw("Trust","trustIconPassive", 'link', 0);
            this.$trustLink = this.createButton('link', "Trust "+this.subject.author, "T", subject, true, 0, "trustIconPassive");
            this.$distrustLink = this.createButton('link', "Distrust "+this.subject.author, "D", subject, false, 0, "distrustIconPassive");
            this.$neutralLink = this.createButton('link', "Neutral "+this.subject.author, "N", subject, true, 1, "untrustIconPassive");
            //this.$trusticon = this.createIcoin("check16.png");
            //this.$trusticon.click(function() {
            //    $(this).closest('div.entry').children('form, ul').toggle();
            //});

            this.$bar = $(expando.jsapiTarget.parentElement.parentElement);
            this.$content = this.$bar.next();
            this.$bar.click(function(event) {
                event.stopPropagation();
                self.$content.toggle();
            });


        }
        $htmlElement.append(this.container);
        $htmlElement.data(TagBar.TAGBAR_NAME, true);
        $htmlElement.attr("data-dtpName", this.subject.author);
    }
    
    createButton(type, title, text, subject, value, expire, iconClass) {
        //const self = this;

        let $element = null;
        switch (type) {
            case 'text' : $element = $("<b title='"+title+"'>["+text+"] <span class='glyphicon glyphicons-ok' aria-hidden='true'></span></b>"); break;
            //case 'link' : $element = $("<a title='"+title+"' href='javascript:void 0'>["+text+"]</a>");
            case 'link' : $element = $(`<div class="IconContainer position-trust-icons js-tooltip" data-original-title="">
            <span class="Icon Icon--medium"><a class="trustIcon ${type} js-tooltip ${iconClass}" href="javascript:void 0" data-original-title="${text}" title="${title}"></a></span>
        </div>`);
        }
        if (type !== 'text') {
            $element.click((event) =>{
                event.stopPropagation();
                this.BuildAndSubmitBinaryTrust(subject, value, expire);
            });
        }



        this.container.appendChild($element[0]);
        return $element;
    }

    BuildAndSubmitBinaryTrust (subject, value, expire) {
        //const self = this;
        let trustpackage = this.subjectService.BuildBinaryClaim(subject, value, null, expire);
        this.packageBuilder.SignPackage(trustpackage);
        $['notify']("Updating trust", 'information');
        this.dtpService.PostTrust(trustpackage).done((trustResult) =>{
            console.log(`trust post result ${JSON.stringify(trustResult)}`)
            //$.notify("Updating view",trustResult.status.toLowerCase());
            console.log("Posting package is a "+trustResult.status.toLowerCase());

            if (this.updateCallback) {
                this.updateCallback(subject);
            }

        }).fail((trustResult) => { 
            $['notify']("Adding trust failed: " +trustResult.message,"fail");
        });
    }


    createIdenticon (subject, title) {
        var data = new Identicon(subject.address.toString('HEX'), {margin:0.1, size:16, format: 'svg'}).toString();
        var $alink = $('<a title="'+title+'" href="javascript:void 0" class="position-trust-icons"><img src="data:image/svg+xml;base64,' + data + '"></a>');
        $alink.data("subject", subject);
        $alink.click(function() {
            var opt = {
                command:'openDialog',
                url: 'trustlist.html',
                data: $(this).data("subject")
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
        this.container.appendChild($alink[0]);
        return $alink;
    }

    createIcoin (name) {
        const a = document.createElement('a');
        a.href = 'javascript:void 0';
        a['class'] = 'entrytrusticon';
        const img = document.createElement('img');
        a.appendChild(img);
        img.src = chrome.extension.getURL('img/'+name);
        this.container.appendChild(a);
        return $(img);
    }

    // Static methods
    static bind (expando, subject, settings, packageBuilder, subjectService, dtpService: DTPService) {
        const id = expando.id;
        let instance = this.instances[id];
        if(!instance) {
            instance = new TagBar(subject, settings, packageBuilder, subjectService, dtpService);
            this.instances[id] = instance;
        }

        instance.render(expando, subject);

        return instance;
    }
}
export = TagBar
