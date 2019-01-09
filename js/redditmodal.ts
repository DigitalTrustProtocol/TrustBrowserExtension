///<reference path="../typings/globals/jquery/index.d.ts" />
declare var tce: any;
import './common.js';
import SettingsController = require('./SettingsController');
let target;
let settings; 
const settingsController = new SettingsController()
//https://www.reddit.com/user/trustchain/.json

// Onload
$(function () {
    settingsController.loadSettings(function (items) {
        settings = items;
        //window.parent.postMessage({ type: "getDialogData" }, "*");
        $("input[type='radio']").checkboxradio({
            icon: false
        });
    });

});


// Listen to the response from main
/*
window.addEventListener("message", function (event) {
    if (event.data.type == "getDialogDataResult") {
        OnDataLoad(event.data);
    }
    if (event.data.type == "Issue") {
        var radioTrustResult = $('input[name="radio-trust"]:checked').val();
        if (radioTrustResult != "neutral")
            target.trust = (radioTrustResult == "trust");

        window.parent.postMessage({ type: "modalTrustIssue", target: target }, "*");
    }
});

*/

// Fill in form
/*
function OnDataLoad(data) {
    target = data.content;
    
    if (!target.id) {
        var rurl = "https://www.reddit.com/user/"+target.content+"/comments.json?t=all&limit=10&sort=new&t=all";
        $.ajax({
            type: "GET",
            url: rurl,
            dataType: 'json'
        }).done(function (result, textStatus, jqXHR) {
            ParseTargetResult(result); // Augment target with data
            DataBind(target); // Default!
        }).fail(function (jqXHR, textStatus, errorThrown) {
            DataBind(target); // Default!
        });

    } else
        DataBind(target);

    LoadPreviousTrust(target);
}
function LoadPreviousTrust(target) {
    var items = [];
    if (target.id) items.push({ user: { id: new tce.buffer.Buffer(target.id) } });
    if (target.contentid) items.push({ user: { id: new tce.buffer.Buffer(target.contentid) } });
    
    ResolveTarget(items, settings).done(function (result) {
        if (!result) return;

        
        var parser = new QueryParser(result);
        var trust = parser.FindById(target.id.toString("base64"));
        if (!trust) 
            trust = parser.FindById(target.contentid.toString("base64"));

        if (!trust)
            return;

        $("#trusttimestamp").html(node.timestamp);
        $("#trustclaim").html((node.claim.trust) ? "Trust" : "Distrust");
        $("#trustactivate").html(node.activate);
        $("#trustexpire").html(node.activate);
        $("#oldtrust").show();
    });
}


function ParseTargetResult(result) {
    if (result.data && result.data.children.length > 0) {
        for (var key in result.data.children) {
            var child = result.data.children[key];
            var body = child.data.body;
            var proofIndex = body.indexOf("([Proof](");
            if (proofIndex >= 0) {
                var temp = body.substring(proofIndex);
                var endsearch = '"' + target.content + '"))';
                var endIndex = temp.indexOf(endsearch);
                if (endIndex > 0) {
                    link = body.substring(proofIndex, endIndex);

                    var query = link.split("?").pop().split("&amp;");
                    for (key in query) {
                        var part = query[key];
                        var p = part.split("=");
                        if (p[0] == 'id') {
                            target.type = "id";
                            target[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
                        }
                    }
                    break;
                }
            }
        }
    }
}
*/
function DataBind(target) {
    if (target.id) {
        let pubKey = tce.bitcoin.ECPair.fromPublicKeyBuffer(new tce.buffer.Buffer(target.id));
        $("#subjectId").html(pubKey.getAddress()); // Only render the Text part
    } else {
        $("#subjectId").html("No Trust ID was provided.");
    }
    $("#contentName").html(target.content); // Only render the Text part

    let buf = tce.buffer.Buffer.concat([new tce.buffer.Buffer("41", 'HEX'), new tce.buffer.Buffer(target.contentid)]);
    let ctidbase85check = tce.base58check.encode(buf);
    $("#contentid").html(ctidbase85check); // Only render the Text part
}



