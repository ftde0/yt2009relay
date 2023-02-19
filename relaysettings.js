const fetch = require("node-fetch")
const fs = require("fs")
const utils = require("./utils")
const config = require("./config.json")

module.exports = {
    "addRelaySettingsEndpoints": function(app) {
        /*
        =======
        relay settings update
        =======
        */
        app.post("/apply_relay_settings", (req, res) => {
            const userdata = require("./userdata.json")

            // authorized?
            if(req.headers.auth !== userdata.code
            || !userdata.usernameCache) {
                res.sendStatus(401)
                return;
            }

            // fetch guide and subscriptions
            let guideCache = {}
            let settings = JSON.parse(req.body.toString()).settings
            if(settings.includes("relay-playlists-sync")
            || settings.includes("relay-sub-sync")) {
                utils.fetchGuide(
                    config.cookie,
                    userdata.itContext,
                    userdata.session,
                    config.useragent,
                    userdata.itKey,
                    (data) => {
                        guideCache = data;
                        applySettings()
                    }
                )
            } else {
                applySettings()
            }

            // and THEN apply the settings
            function applySettings() {
                userdata.uiSettings = settings;
                settings.forEach(setting => {
                    switch(setting) {
                        // per-setting handling

                        // import playlists
                        case "relay-playlists-sync": {
                            let playlists = utils.guideGetPlaylists(guideCache)
                                            || []
                            userdata.playlists = playlists
                            break;
                        }

                        // import subscriptions
                        case "relay-sub-sync": {
                            let subscriptions = utils.guideGetSubscriptions(guideCache)
                                                || []
                            userdata.subscriptions = subscriptions
                            break;
                        }
                    }
                })
                fs.writeFileSync("./userdata.json", JSON.stringify(userdata))
            }


            let response = {}
            if(userdata.subscriptions) {
                response.subscriptions = userdata.subscriptions
            }
            if(userdata.playlists) {
                response.playlists = userdata.playlists
            }
            res.send(response)
            
        })

        /*
        =======
        get settings
        =======
        */
        app.get("/relay_settings", (req, res) => {
            const userdata = require("./userdata.json")

            if(req.headers.auth !== userdata.code
            || !userdata.usernameCache) {
                res.sendStatus(401)
                return;
            }
            
            res.send(userdata.uiSettings)
        })
    }
}