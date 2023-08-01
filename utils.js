const crypto = require("crypto")
const fetch = require("node-fetch")

module.exports = {
    "getAuthorization": function(cookie) {
        /*
        =======
        Get the SAPISIDHASH authorization,
        required for signed-in stuff (such as commenting).
        =======
        */

        let unix = Math.floor(new Date().getTime() / 1000)
        if(!cookie.includes("SAPISID=")) return ""
        let sapisid = cookie.split("SAPISID=")[1].split(";")[0]
        let origin = "https://www.youtube.com";
        let tr = unix + "_"

        tr += crypto.createHash("sha1")
                    .update(`${unix} ${sapisid} ${origin}`)
                    .digest("hex")

        return tr;
    },
    "createInnertubeHeaders": function(cookie, context, session, useragent, authuser) {
        if(!authuser) {
            authuser = 0;
        }
        let headers = {
            "accept-encoding": "gzip, deflate, br",
            "accept-language": "en-US,en;q=0.9",
            "authorization": "SAPISIDHASH " + this.getAuthorization(cookie),
            "cache-control": "max-age=0",
            "cookie": cookie,
            "dnt": "1",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "user-agent": useragent,
            "x-goog-authuser": authuser,
            "x-goog-visitor-id": context.client.visitorData,
            "x-youtube-bootstrap-logged-in": "true",
            "x-youtube-client-name": "1",
            "x-youtube-client-version": context.client.clientVersion,
            "x-origin": "https://www.youtube.com"
        }
        if(session) {
            headers["x-goog-pageid"] = session
        }
        return headers;
    },
    "commentParamFromVideoId": function(videoId, cookie, context,
                                        session, userAgent, apiKey,
                                        authuser, callback) {
        // get innertube comment param by just the video id by navigating to it
        // and extracting the param to send a comment.

        let headers = this.createInnertubeHeaders(
            cookie,
            context,
            session,
            userAgent,
            authuser
        )

        // fetch video
        fetch(`https://www.youtube.com/youtubei/v1/next?key=${apiKey}`, {
            "headers": headers,
            "referrer": `https://www.youtube.com/watch?v=${videoId}`,
            "referrerPolicy": "origin-when-cross-origin",
            "body": JSON.stringify({
                "autonavState": "STATE_OFF",
                "captionsRequested": false,
                "contentCheckOk": false,
                "context": context,
                "playbackContext": {
                    "lactMilliseconds": "-1",
                    "vis": 0
                },
                "racyCheckOk": false,
                "videoId": videoId
            }),
            "method": "POST",
            "mode": "cors"
        }).then(r => r.json().then(r => {
            // comment continuation token
            r.engagementPanels.forEach(panel => {
                if(panel.engagementPanelSectionListRenderer
                        .panelIdentifier == "comment-item-section") {
                    let token = panel.engagementPanelSectionListRenderer
                                .content.sectionListRenderer.contents[0]
                                .itemSectionRenderer.contents[0]
                                .continuationItemRenderer.continuationEndpoint
                                .continuationCommand.token // seen those long
                                // jsons in it like a million times already
                                // yet they can't stop amazing me
                    commentParam(token)
                }
            })
        }))

        // fetch comments for add param
        function commentParam(token) {
            setTimeout(function() {
                fetch(`https://www.youtube.com/youtubei/v1/next?key=${apiKey}&prettyPrint=false`, {
                    "headers": headers,
                    "referrer": `https://www.youtube.com/watch?v=${videoId}`,
                    "referrerPolicy": "origin-when-cross-origin",
                    "body": JSON.stringify({
                        "context": context,
                        "continuation": token
                    }),
                    "method": "POST",
                    "mode": "cors"
                }).then(r => {r.text().then(r => {
                    let commentParamToken = r.split(`"createCommentParams":"`)[1]
                                            .split(`"`)[0]
                    callback(commentParamToken)
                })});
            }, 166)
        }
    },
    "getVideo":  function(
    videoId, cookie, context,
    session, userAgent, apiKey,
    authuser, callback) {
        let headers = this.createInnertubeHeaders(
            cookie,
            context,
            session,
            userAgent,
            authuser
        )
    
        // fetch video
        fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
            "headers": headers,
            "referrer": `https://www.youtube.com/watch?v=${videoId}`,
            "referrerPolicy": "origin-when-cross-origin",
            "body": JSON.stringify({
                "autonavState": "STATE_OFF",
                "captionsRequested": false,
                "contentCheckOk": false,
                "context": context,
                "playbackContext": {
                    "lactMilliseconds": "-1",
                    "vis": 0
                },
                "racyCheckOk": false,
                "videoId": videoId
            }),
            "method": "POST",
            "mode": "cors"
        }).then(r => r.json().then(r => {
            // will just update this code if more is needed
            let data = {
                "title": r.videoDetails.title,
                "description": r.videoDetails.shortDescription
            }
            callback(data)
        }))
    },

    "relativeToAbs": function(relDate) {
        function jsDateToString(jsd) {
            let months = ["Jan", "Feb", "Mar",
                          "Apr", "May", "Jun",
                          "Jul", "Aug", "Sep",
                          "Oct", "Nov", "Dec"]
            return months[jsd.getMonth()]
                   + " " + jsd.getDate()
                   + ", " + jsd.getFullYear()
        }

        let d = new Date()
        let dayUnix = (1000 * 60 * 60 * 24)
        if(relDate.includes("day")) {
            let dayCount = relDate.split(" ")[0]
            d = new Date(Date.now() - (dayCount * dayUnix))
        } else if(relDate.includes("week")) {
            let weekCount = relDate.split(" ")[0]
            d = new Date(Date.now() - (weekCount * dayUnix * 7))
        } else if(relDate.includes("month")) {
            let moCount = relDate.split(" ")[0]
            d = new Date(Date.now() - (moCount * dayUnix * 31))
        }

        return jsDateToString(d)
    },

    "getUserId": function(callback) {
        let userdata = require("./userdata.json");
        let config = require("./config.json")
        let h = this.createInnertubeHeaders(
            config.cookie,
            userdata.itContext,
            userdata.session,
            config.useragent,
            userdata.authUser || 0
        )
        fetch(`https://www.youtube.com/${userdata.handleCache}`, {
            "headers": h,
            "referrer": `https://www.youtube.com/`,
            "referrerPolicy": "origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors"
        }).then(r => r.text().then(r => {
            let id = r.split(`rel="canonical" href="`)[1].split("\"")[0]
            callback(id.split("/channel/")[1])
        }))
    },

    "getPlaylists": function(callback) {
        let userdata = require("./userdata.json");
        let config = require("./config.json")
        this.getUserId(id => {
            fetch("https://www.youtube.com/youtubei/v1/browse?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8", {
                "headers": this.createInnertubeHeaders(
                    config.cookie,
                    userdata.itContext,
                    userdata.session,
                    config.useragent,
                    userdata.authUser || 0
                ),
                "referrer": "https://www.youtube.com/@uh00/playlists",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": JSON.stringify({
                    "context": userdata.itContext,
                    "browseId": id,
                    "params": "EglwbGF5bGlzdHPyBgQKAkIA"
                }),
                "method": "POST",
                "mode": "cors"
            }).then(r => {r.json().then(r => {
                callback(parsePlaylists(r))
            })})
        })
        function parsePlaylists(r) {
            let rawPlaylists = []
            let parsedPlaylists = []

            // this needs to be written better.
            // ONE DAY.
            r.contents.twoColumnBrowseResultsRenderer.tabs.forEach(tab => {
                if(tab.tabRenderer
                && tab.tabRenderer.selected) {
                    tab = tab.tabRenderer.content
                    try {
                        tab.sectionListRenderer.contents.forEach(s => {
                            s = s.itemSectionRenderer.contents[0]
                            if(s.gridRenderer) {
                                s.gridRenderer.items.forEach(i => {
                                    rawPlaylists.push(i)
                                })
                            }
                        })
                    }
                    catch(error) {console.log(error + `
                    
                    =========
                    above error may have caused your playlists
                    to sync incorrectly!
                    please report that one on #yt2009-feedback.
                    =========

                    `)}
                }
            })


            rawPlaylists.forEach(p => {
                if(!p.gridPlaylistRenderer) return;
                parsedPlaylists.push({
                    "name": p.gridPlaylistRenderer.title.runs[0].text,
                    "id": p.gridPlaylistRenderer.playlistId
                })
            })

            return parsedPlaylists;
        }
    },

    "simComment": function(content) {
        let userdata = require("./userdata.json")
        return `
    <div class="watch-comment-entry">
        <div class="watch-comment-head">
            <div class="watch-comment-info">
                <a class="watch-comment-auth" href="#" rel="nofollow">${
                    userdata.handleCache.replace("@", "")
                }</a>
                <span class="watch-comment-time"> 1 minute ago </span>
            </div>
            <div class="watch-comment-voting">
                <span class="watch-comment-score watch-comment-gray">0</span>
                <a href="#"><button class="master-sprite watch-comment-down-hover" title="Poor comment"></button></a>
                <a href="#"><button class="master-sprite watch-comment-up-hover" title="Good comment"></button></a>
                <span class="watch-comment-msg"></span>
            </div>
            <span class="watch-comment-spam-bug">Marked as spam</span>
            <div class="watch-comment-action">
                <a>Reply</a>
                |
                <a title="Flag this comment as Spam">Spam</a>
            </div>
            <div class="clearL"></div>
        </div>
    
        <div>
            <div class="watch-comment-body"><div>${content}</div></div>
            <div></div>
        </div>
    </div>`
    }
}