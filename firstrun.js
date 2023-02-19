const fetch = require("node-fetch")
const utils = require("./utils")
const config = require("./config.json")
const fs = require("fs")

module.exports = {
    "browserHeaders": {
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "max-age=0",
        "cookie": config.cookie,
        "dnt": "1",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "user-agent": config.useragent
    },


    /*
    =======
    fetch youtube for account data
    =======
    */
    "createUserdata": function(callback) {
        let key = ""
        while(key.length !== 6) {
            key += "qwertyuiopasdfghjklzxcvbnm1234567890".split("")
                    [Math.floor(Math.random() * 36)]
        }
        console.log(`yt2009relay first time run: access code: ${key},
    use it on (frontend url)/relay/link.htm`)
        let initialUserdata = {
            "code": key
        }
        // fetch mainpage with cookies for signed in data
        fetch("https://www.youtube.com/", {
            "headers": this.browserHeaders
        }).then(r => {r.text().then(r => {
            // innertube access things
            let itApiKey = r.split(`"INNERTUBE_API_KEY":"`)[1].split(`"`)[0]
            let itContext = JSON.parse(
                r.split(`"INNERTUBE_CONTEXT":`)[1].split(`}}`)[0] + "}}"
            )
            let itSession = r.split(`"DELEGATED_SESSION_ID":"`)[1].split(`"`)[0]
            initialUserdata.itKey = itApiKey;
            initialUserdata.itContext = itContext;
            initialUserdata.session = itSession;
            // cache username + handle (if available)
            fetch(`https://www.youtube.com/youtubei/v1/account/account_menu?key=${itApiKey}`, {
                "headers": utils.createInnertubeHeaders(
                    config.cookie,
                    itContext,
                    itSession,
                    config.useragent
                ),
                "method": "POST",
                "body": JSON.stringify({
                    "context": itContext,
                    "deviceTheme": "DEVICE_THEME_SUPPORTED",
                    "userInterfaceTheme": "USER_INTERFACE_THEME_DARK"
                })
            }).then(res => {res.json().then(res => {
                let username = res.actions[0].openPopupAction
                                .popup.multiPageMenuRenderer.header
                                .activeAccountHeaderRenderer.accountName
                                .simpleText
                let handle = res.actions[0].openPopupAction
                                .popup.multiPageMenuRenderer.header
                                .activeAccountHeaderRenderer.channelHandle
                                .simpleText
                initialUserdata.usernameCache = username;
                initialUserdata.handleCache = handle;

                // save and callback to main
                fs.writeFileSync(
                    "userdata.json",
                    JSON.stringify(initialUserdata)
                )
                console.log("created userdata, saved to userdata.json")

                callback(initialUserdata)
            })})
        })})
    }
}