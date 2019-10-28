import $ = require('jquery');
import Oidc from "oidc-client";
import { LoginPopupClient } from '../Shared/LoginPopupClient';
import { MessageHandler } from '../Shared/MessageHandler';

let messageHandler = new MessageHandler();
let loginPopupClient = new LoginPopupClient(messageHandler);

// document.getElementById("login").addEventListener("click", login, false);
// document.getElementById("loginPassword").addEventListener("click", loginPassword, false);
// document.getElementById("api").addEventListener("click", api, false);
// document.getElementById("logout").addEventListener("click", logout, false);



// class LoginController {



// }

// function log(text: string) {
//     document.getElementById('results').innerText = '';

//     Array.prototype.forEach.call(arguments, function (msg) {
//         if (msg instanceof Error) {
//             msg = "Error: " + msg.message;
//         }
//         else if (typeof msg !== 'string') {
//             msg = JSON.stringify(msg, null, 2);
//         }
//         document.getElementById('results').innerHTML += msg + '\r\n';
//     });
// }
//window.addEventListener('blur', () => window.close());

function CloseWindow() {
    window.close();
}



$(document).ready(() => {
    let redirect_url = window.location.href.replace("loginpopup.html", "loginpopupcallback.html");

    let config = {
        authority: "http://localhost:5000",
        client_id: "js",
        redirect_uri: redirect_url,
        response_type: "code",
        scope:"openid profile",
        post_logout_redirect_uri : redirect_url,
    };
    let mgr = new Oidc.UserManager(config);
    
    mgr.getUser().then((user) => {
        if(user) {
            loginPopupClient.setUser(user);
            loginPopupClient.userAuthenticated(user);
            CloseWindow();
            return;
        }

        mgr.signinRedirect().then((test) => {
            mgr.getUser().then(function (user) {
                if (user) {
                    console.log("User logged in");
                    loginPopupClient.setUser(user);
                    loginPopupClient.userAuthenticated(user);
                    CloseWindow();
                }
                else {
                    console.log("User not logged in");
                    //CloseWindow();
                }
            });
        
        });
    
    });

    
});



// function login() {
//     //mgr.signinRedirect();
//     mgr.signinPopup();
// }

// async function loginPassword() {



//     let userName = "alice";
//     let password = "password";

//     var t = await mgr.metadataService.getTokenEndpoint();
//     var res = await fetch(t, {
//         method: "POST",
//         headers: {
//             'Content-Type': 'application/x-www-form-urlencoded'
//         },
//         body: `grant_type=password&username=${userName}&password=${password}&scope=api1%20profile%20openid&client_id=ro.client&userInfo=true`,
//         mode: "cors"
//     });
//     var r = await res.json();


//     //mgr.access_token = r.access_token;
//     let user = new Oidc.User({ access_token: r.access_token });
//     mgr.storeUser(user);
    

//     //var config = {
//     //    authority: "http://localhost:5000",
//     //    client_id: "ro.client",
//     //    redirect_uri: "http://localhost:5003/callback.html",
//     //    response_type: "id_token token",
//     //    scope: "openid profile api1",
//     //    username: userName,
//     //    password: password,
//     //    code: "password",
//     //    post_logout_redirect_uri: "http://localhost:5003/index.html",
//     //};
//     //mgr = new Oidc.UserManager(config);
//     //mgr.signinRedirect();

//     //console.log(r);
// }

// function api() {
//     mgr.getUser().then(function (user) {
//         var url = "http://localhost:5001/identity";

//         var xhr = new XMLHttpRequest();
//         xhr.open("GET", url);
//         xhr.onload = function () {
//             log(xhr.status, JSON.parse(xhr.responseText));
//         }
//         xhr.setRequestHeader("Authorization", "Bearer " + user.access_token);
//         xhr.send();
//     });
// }

// function logout() {
//     mgr.signoutRedirect();
// }


