class SiteManager {
    static dtpUserContext: any;

    static GetUserContext(): JQueryPromise<any> {
        let deferred = $.Deferred<any>();
        if (SiteManager.dtpUserContext)
            deferred.resolve(SiteManager.dtpUserContext);

        const initData = $("#init-data");
        if (initData.length > 0) {
            const user = JSON.parse(initData[0]['value']);

            const source = {
                userId: user.userId,
                screen_name: user.screenName,
                alias: user.fullName,
                formAuthenticityToken: user.formAuthenticityToken,
                host: window.location.hostname
            }
            chrome.storage.local.set({ context: source }, null);
            SiteManager.dtpUserContext = source;
            deferred.resolve(source);
        } else {
            chrome.storage.local.get("context", (result) => {
                let context = result.context ||
                    {
                        userId: '',
                        screen_name: '',
                        alias: '',
                        formAuthenticityToken: '',
                        host: ''
                    }
                SiteManager.dtpUserContext = context;
                deferred.resolve(context);
            });
        }
        return deferred.promise();
    }
}

export = SiteManager