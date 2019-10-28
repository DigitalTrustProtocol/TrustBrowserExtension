import $ = require('jquery');
import Oidc from "oidc-client";
import { LoginPopupClient } from '../Shared/LoginPopupClient';
import { MessageHandler } from '../Shared/MessageHandler';

let messageHandler = new MessageHandler();
let loginPopupClient = new LoginPopupClient(messageHandler);

$(document).ready(() => {

    new Oidc.UserManager({ response_mode: "query" }).signinRedirectCallback().then(function (user) {
        if(user) {
            loginPopupClient.setUser(user);
            loginPopupClient.userAuthenticated(user);
            window.close();
            return;
        }
    }).catch(function (e) {
        console.error(e);
    });
});
