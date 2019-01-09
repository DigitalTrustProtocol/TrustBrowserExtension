///<reference path="../typings/globals/jquery/index.d.ts" />
declare var tce: any;
declare var bililiteRange: any;

import TagBar = require('./TagBar')
import TrustHandler = require('./TrustHandler');
import ISubject from './SubjectInterface';
import DTPService = require('./DTPService');


class RedditD2X {
    settings: any;
    subjectService: any;
    packageBuilder: any;
    dtpService: DTPService;
    queryResult: {};
    callbacks: any[];
    callQuery: boolean;
    environment: string;
    subjects: any[];
    targets: any[];
    trustHandler: any;
    static JSAPI_CONSUMER_NAME: string = "DTPreddit";
    
    constructor(settings, packageBuilder, subjectService, dtpService) {
        this.settings = settings;
        this.subjectService = subjectService;
        this.packageBuilder = packageBuilder;
        this.dtpService = dtpService;
        this.queryResult = {};
        this.callbacks = [];
        this.callQuery = false;
        this.environment = 'prod';
        this.subjects = [];
        this.targets = [];
    }

    update () {

        this.targets.map(subject => {
            
            let container = this.subjects[subject.author];
            
            container.tagBars.map((key, index) => {
                const tagBar = container.tagBars[index];
                if (!container.result) {
                    subject.queryResult = this.queryResult;
                    let owner = subject.owner;
                    let ownerAddressBase64 = (owner) ? owner.address.toString('base64') : "";
                    container.result = this.trustHandler.CalculateBinaryTrust2(subject.address.toString('base64'), ownerAddressBase64);
                }

                tagBar.update(container.result.networkScore, container.result.personalScore);
            })
        })
        // for (let subject of this.targets) {
        //     let container = this.subjects[subject.author];
        //     for (let key in container.tagBars) {
        //         const tagBar = container.tagBars[key];

        //         if (!container.result) {

        //             subject.queryResult = this.queryResult;
        //             let owner = subject.owner;
        //             let ownerAddressBase64 = (owner) ? owner.address.toString('base64') : "";
        //             container.result = this.trustHandler.CalculateBinaryTrust2(subject.address.toString('base64'), ownerAddressBase64);
        //         }

        //         tagBar.update(container.result.networkScore, container.result.personalScore);
        //     }
        // }
    }

    bindEvents () {
        this.enableProof ();
        this.defineEvents();        
        document.addEventListener('reddit',(e) => this.handleEvent(e), true);
        document.dispatchEvent(new CustomEvent('reddit.ready', {
			detail: {
				name: RedditD2X.JSAPI_CONSUMER_NAME,
			},
		}));
    }

   defineEvents () {
        var callback = (expando, detail) => {
            //this.ensureProof(expando, detail);
            this.ensureTabBar(expando, detail);
        };
        this.watchForRedditEvents('postAuthor', callback)
        this.watchForRedditEvents('commentAuthor', callback);
    }





    //  ensureProof (expando, detail) {
    //     if(expando.update || !expando.jsapiTarget) return; 

    //     const contentElement = $('#'+expando.contentId);
    //     let subject = this.subjectService.enrichSubject(detail.data.author, contentElement);
    //     const container = this.ensureContainer(subject);

    //     //let username = $("span.user a").text();
    //     // let content = $area.val();
    //     // let proofIndex = content.indexOf("([Proof](");
    //     // if (proofIndex >= 0) {
    //     //     let temp = content.substring(proofIndex);
    //     //     let endIndex = temp.indexOf("))");
    //     //     if (endIndex > 0) {
    //     //         content = content.substring(0, proofIndex) + content.substring(proofIndex + endIndex + "))".length);
    //     //     }
    //     // }

    //     // $area.val(content + this.BuildProof(this.settings, username, content));
    // }

    


//    postData(query, data) {
//         let deferred = $.Deferred();
//         let path = "/api/comment.json?rtj=debug&redditWebClient=web2x&app=web2x-client-production&raw_json=1";
//         let url = "";

//         $.ajax({
            
//             type: "POST",
//             url: path,
//             data: "api_type=json&return_rtjson=true&thing_id=t3_9mocus&text=Test666",
//             contentType: 'application/x-www-form-urlencoded',
            
//             beforeSend: (xhr) => {
//                 //xhr.setRequestHeader(":authority", "oauth.reddit.com");
//                 xhr.setRequestHeader("authorization", "Bearer 116825208147-gTqsneEecjzOKU_7zUXyYJwDNDU" ); //  "Bearer "+ this.getCookie("reddit_session"));
//                 xhr.setRequestHeader("x-reddit-loid",  this.getCookie("loid"));
//                 xhr.setRequestHeader("x-reddit-session", this.getCookie("session_tracker"));
//             },
            
//         }).done((msg, textStatus, jqXHR) => {
//             let resolve = msg;
//             deferred.resolve(resolve);
//         }).fail((jqXHR, textStatus, errorThrown) => {
            
//             deferred.fail();
//         });

//         return deferred.promise();
//     }

//     getCookie(cname) {
//         var name = cname + "=";
//         var decodedCookie = decodeURIComponent(document.cookie);
//         var ca = decodedCookie.split(';');
//         for(var i = 0; i <ca.length; i++) {
//             var c = ca[i];
//             while (c.charAt(0) == ' ') {
//                 c = c.substring(1);
//             }
//             if (c.indexOf(name) == 0) {
//                 return c.substring(name.length, c.length);
//             }
//         }
//         return "";
//     }



    enableProof () {
    
        $('div.usertext-buttons button.save').click( (e) => {
            let $area = $(e.target).closest("form").find("textarea");
            //this.ensureProof($area);
            return true;
        });

        var $buttonArea = $();
        

        const observer = new MutationObserver( (mutations) => {
            mutations.forEach( (mutation) => {
                mutation.addedNodes.forEach( (node) => {
                    if (!node.childNodes || node.childNodes.length == 0)
                        return;

                    let $node = $(node);
                    var $save = $node.find(':submit');

                     if($save.length > 0) {
                        let name = $node.parent().find('span[data-dtpname]').attr("data-dtpname");
                        if(name == null)
                            return;

                        //let $area = $node.find('span[data-text="true"]');
                        let $area = $node.find('div[data-contents="true"]');
                        if($area.length == 0)
                            return;

                        var $proofBtn = this.createProofButton($save, $area, name);
                        $proofBtn.appendTo($save.parent());
                        $area.trigger("change");

                    //     if($area.html().indexOf("(Proof)") > 0)
                    //         return;
                    //     this.ensureProof($area, name);
                    //     $area.trigger("change");
                    }


                    // $submit.wrapClick((e) =>{
                    //     console.log("Test");
                    // } );

                    // $submit.click( (e) => {
                    //     //let test = $node;
                    //     //let $area = $(e.target).find("textarea");
                    //     let $area = $node.find('div[data-contents="true"]');
                    //     let $name = $node.parent().find('span[data-dtpname]');
                    //     this.ensureProof($area, $name.attr("data-dtpname"));
                    //     //$area.css('visibility', 'hidden');
                    //     //this.postData("","");

                    //     return false;
                    // });
                });
            });
        });

        const observerConfig = {
            attributes: false,
            childList: true,
            subtree: true,
            characterData: false
        };

        let targetNode = document.body;
        observer.observe(targetNode, observerConfig);
    }

    DTPsendkeys($element, x){
        //x = x.replace(/([^{])\n/g, '$1{enter}'); // turn line feeds into explicit break insertions, but not if escaped
        return $element.each( function(){
          bililiteRange(this).bounds('selection').sendkeys(x).select();
          this.focus();
        });
      };

    ensureProof($area, username) {
        //console.log(`area val ${$area}`)
       //let username = $("span.user a").text();
       let $proofLink = $area.find('div[data-dtpproof="true"]');
       if($proofLink.length > 0) {
            $proofLink.remove();
       }
        
        var content = $area.text();
        
        var $children = $area.children();
        if($children.length > 0) {
            //$proofLink = $(this.createRichTextLink(this.settings, username, content));
            //var html = this.createRichTextLink(this.settings, username, content);
            var html = this.buildProof(this.settings, username, content);
            var target = $($children[0]);
            this.DTPsendkeys(target, html);
            //$target.sendkeys(html);
            //$proofLink.appendTo($children[0]);
            //$area.trigger('change');
        }
    //    let proofIndex = content.indexOf("([Proof](");
    //    if (proofIndex >= 0) {
    //        let temp = content.substring(proofIndex);
    //        let endIndex = temp.indexOf("))");
    //        if (endIndex > 0) {
    //            content = content.substring(0, proofIndex) + content.substring(proofIndex + endIndex + "))".length);
    //        }
    //    }



    //     $area.html(content + this.buildProof(this.settings, username, content));
    //     $area.trigger("change");

        //createRichTextLink
   }

           //<div class="s19iist0-0 eRSicR" data-offset-key="6inkh-0-0">
        //<div class="" data-block="true" data-editor="dad1b1" data-offset-key="6inkh-0-0">
        //<div data-offset-key="6inkh-0-0" class="public-DraftStyleDefault-block public-DraftStyleDefault-ltr">
        //<span data-offset-key="6inkh-0-0"><span data-text="true">Test 123sss</span></span></div></div>
        createRichTextLink(settings, username, content) {
            let hash = tce.bitcoin.crypto.hash256(new tce.buffer.Buffer(username + content.trim(), 'UTF8'));
            let signature = settings.keyPair.signCompact(hash); // sign needs a sha256
    
            let href =
                settings.infoserver +
                '/resources/proof.htm' +
                '?scope=reddit.com' +
                '&script=btc-pkh' +
                '&address=' + settings.address +
                '&signature=' + signature.toString('HEX') +
                '&hash=' + hash.toString('HEX') +
                '&name=' + username;
    
            var link = 
            '<div data-block="true" data-dtpproof="true">'+
            '<div class="public-DraftStyleDefault-block public-DraftStyleDefault-ltr">'+
            '<span><span data-text="true">(</span></span>'+
            '<span><a href="'+href+'" title="'+username+'"><span><span data-text="true">Proof</span></span></a></span>'+
            '<span><span data-text="true">)</span></span>'+
            '</div></div>';

            return link;
        }

        buildProof(settings, username, content) {
            let hash = tce.bitcoin.crypto.hash256(new tce.buffer.Buffer(username + content.trim(), 'UTF8'));
            let signature = settings.keyPair.signCompact(hash); // sign needs a sha256
    
            let proof =
                ' ([Proof](' + settings.infoserver +
                '/resources/proof.htm' +
                '?scope=reddit.com' +
                '&script=btc-pkh' +
                '&address=' + settings.address +
                '&signature=' + signature.toString('HEX') +
                '&hash=' + hash.toString('HEX') +
                '&name=' + username +
                ' "' + username + '"))';
    
            return proof;
        }        

    createProofButton($save: any, $area: any, username: string) {
        var html = "<button type='submit'>Proof and Save</button>";
        var $btn = $(html);
        $btn.click(() => {
            this.ensureProof($area, username);
            //$save.click(); 
            return true;
        });
        return $btn;
    }

    ensureTabBar (expando, detail) {
        if(expando.update || !expando.jsapiTarget) return; 

        const contentElement = $('#'+expando.contentId);
        let subject = this.subjectService.enrichSubject(detail.data.author, contentElement);
        const container = this.ensureContainer(subject);

        let instance = TagBar.bind(expando, subject, this.settings, this.packageBuilder, this.subjectService, this.dtpService);
        instance.updateCallback = (subject) => {
            this.queryDTP(subject);
        };

        if(container.result)
            instance.update(container.result.networkScore, container.result.personalScore);

        container.tagBars.push(instance);
    }

    ensureContainer (subject) {
        let container = this.subjects[subject.author];
        if(!container) {
            container = {
                 subject: subject,
                 tagBars: [],
            };
            this.subjects[subject.author] = container;
            if (subject.owner) {
                this.subjects[subject.owner.author] = container;
            }
        }
        return container;
    }

    watchForRedditEvents (type, callback) {
        if (!this.callbacks[type]) {
            this.callbacks[type] = [];
        }
        this.callbacks[type].push(callback);
    }


    queryDTP(custom : ISubject) {
        this.callQuery = false; // Enable the queryDTP to be called again

        this.targets = [];
        if (custom) {
            if ($.isArray(custom)) {
                this.targets = custom;
             } else {
                this.targets.push(custom); // Predefined targets!
             }
        } else {
            for (let author in this.subjects) {
                let container = this.subjects[author];
                if (container.processed) 
                    continue;
                
                this.targets.push(container.subject);
                if (container.subject.owner) {
                    this.targets.push(container.subject.owner);
                }
                container.processed = true;
            }
        }
        if(this.targets.length === 0)
            return;

        for (const subject of this.targets) {
            const container = this.subjects[subject.author];
            container.result = undefined;
        }

        console.log("Quering the DTP!");

        this.dtpService.Query(this.targets, window.location.hostname).then((result) => {
            //if (result || result.status == "Success") 
                this.queryResult = result["results"];
            //else
                //console.log(result["message"]);
            
            this.trustHandler = new TrustHandler(this.queryResult, this.settings);

            this.update();
        }, this.DeferredFail);

    }
    DeferredFail(error, arg1, arg2) {
        console.log(error);
    }    

    handleEvent(event) {
        // A hack to make a function call when all the events have executed.
        if (!this.callQuery) { 
            this.callQuery = true;
            setTimeout(() => this.queryDTP(null), 100);
        }
        
        if(!event) return;
        if(!event.detail) return;

        //console.log('Type: '+event.detail.type);
        const fns = this.callbacks[event.detail.type];
        if(!fns) {
            if (this.environment === 'development') {
                console.warn('Unhandled reddit event type:', event.detail.type);
            }
            return;
        }
   

        let contentId;
        let expandoId = `${event.detail.type}|`;
        switch (event.detail.type) {
            case 'postAuthor':
                expandoId += event.detail.data.post.id;
                contentId = event.detail.data.post.id;
                break;
            case 'commentAuthor':
                expandoId += event.detail.data.comment.id;
                contentId = event.detail.data.comment.id;
                break;
            case 'userHovercard':
                expandoId += `${event.detail.data.contextId}|${event.detail.data.user.id}`;
                break;
            case 'subreddit':
            case 'post':
            default:
                expandoId += event.detail.data.id;
                contentId = event.detail.data.id;
                break;
        }
    
        const update = event.target.expando && event.target.expando.id === expandoId ?
            (event.target.expando.update || 0) + 1 :
            0;
    
        if(!event.target.expando) {
            event.target.expando = {
                id: expandoId,
                contentId: contentId,
            } ;

            event.target.expando.jsapiTarget = event.target.querySelector(`[data-name="${RedditD2X.JSAPI_CONSUMER_NAME}"]`);
        }

        event.target.expando.update = update;
        
        for (let fn of fns) {
            try {
                fn(event.target.expando, event.detail);
            } catch (e) {
                console.log(e);
            }
        }

    }
    
}
export = RedditD2X