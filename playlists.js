
const fetch = require("node-fetch")
const config = require("./config.json")
const utils = require("./utils")

module.exports = {
    "addPlaylistEndpoints": function(app) {
        /*
        =======
        add to playlist
        =======
        */
        function addToPlaylist(playlistId, videoId, callback) {
            const userdata = require("./userdata.json")

            setTimeout(function() {
                fetch(`https://www.youtube.com/youtubei/v1/browse/edit_playlist?key=${userdata.itKey}`, {
                    "headers": utils.createInnertubeHeaders(
                        config.cookie,
                        userdata.itContext,
                        userdata.session,
                        config.useragent,
                        userdata.authUser
                    ),
                    "method": "POST",
                    "body": JSON.stringify({
                        "context": userdata.itContext,
                        "playlistId": playlistId,
                        "actions": [{
                            "action": "ACTION_ADD_VIDEO",
                            "addedVideoId": videoId
                        }]
                    })
                }).then(r => {r.json().then(r => {
                    callback()
                    console.log(`video ${videoId} added to ${playlistId} via relay`)
                })})
            }, 1753)
        }


        app.post("/playlist_add", (req, res) => {
            const userdata = require("./userdata.json")

            if(req.headers.auth !== userdata.code
            || !userdata.usernameCache
            || !userdata.uiSettings.includes("relay-playlists-sync")) {
                res.sendStatus(401)
                return;
            }
            let playlistId = JSON.parse(req.body.toString()).playlistId
            let videoId = req.headers.source.split("v=")[1]
                                            .split("&")[0]
                                            .split("#")[0]
            let playlistPartOfRelay = false;
            userdata.playlists.forEach(playlist => {
                if(playlist.id == playlistId) {
                    playlistPartOfRelay = true;
                }
            })

            // if playlist doesn't belong to relay, send 404
            if(!playlistPartOfRelay) {
                res.sendStatus(404)
                return;
            }

            // add!!
            addToPlaylist(playlistId, videoId, () => {
                res.sendStatus(200)
            })
        })

        /*
        =======
        favorites
        =======
        */
        app.post("/favorite_video", (req, res) => {
            const userdata = require("./userdata.json")

            if(req.headers.auth !== userdata.code
            || !userdata.usernameCache
            || !userdata.uiSettings.includes("relay-create-favorites")) {
                res.sendStatus(401)
                return;
            }

            let videoId = req.headers.source.split("v=")[1]
                                            .split("&")[0]
                                            .split("#")[0]

            let favoritesId = false;
            userdata.playlists.forEach(playlist => {
                if(playlist.name == "Favorites") {
                    favoritesId = playlist.id
                }
            })

            // if no favorites playlist, create one
            if(!favoritesId) {
                fetch(`https://www.youtube.com/youtubei/v1/playlist/create?key=${userdata.itKey}`, {
                    "headers": utils.createInnertubeHeaders(
                        config.cookie,
                        userdata.itContext,
                        userdata.session,
                        config.useragent,
                        userdata.authUser
                    ),
                    "method": "POST",
                    "body": JSON.stringify({
                        "context": userdata.itContext,
                        "privacyStatus": "UNLISTED",
                        "title": "Favorites",
                        "videoIds": [videoId]
                    })
                }).then(r => {r.json().then(r => {
                    console.log(`relay: created a Favorites playlist and added ${videoId} to it!`)
                    res.send(JSON.stringify({
                        "relayCommand": "resync", 
                    }))
                })})
            } else {
                addToPlaylist(favoritesId, videoId, () => {
                    res.send("{}")
                })
            }
        })
    }
}