
const fetch = require("node-fetch")
const config = require("./config.json")
const utils = require("./utils")
let lastUnseenState = 0;
let lastUnseenStateUpdate = 0;

module.exports = {
    "addNotifEndpoints": function(app) {
        /*
        =======
        notification count
        =======
        */
        app.get("/get_notification_count", (req, res) => {
            if((Date.now() - lastUnseenStateUpdate) / 1000 / 60 <= 15) {
                res.status(200).send(lastUnseenState.toString())
                console.log(`unseen count from cache`)
                return;
            }
            const userdata = require("./userdata.json")
            if(req.headers.auth !== userdata.code
            || !userdata.usernameCache) {
                res.sendStatus(401)
                return;
            }

            fetch(`https://www.youtube.com/youtubei/v1/notification/get_unseen_count?key=${userdata.itKey}`, {
                "headers": utils.createInnertubeHeaders(
                    config.cookie,
                    userdata.itContext,
                    userdata.session,
                    config.useragent,
                    userdata.authUser
                ),
                "method": "POST",
                "body": JSON.stringify({
                    "context": userdata.itContext
                })
            }).then(r => {r.json().then(r => {
                if(r.actions) {
                    lastUnseenState = r.actions[0].updateNotificationsUnseenCountAction.unseenCount
                    r.unseenCount = lastUnseenState;
                }
                if(!r.unseenCount) {
                    res.status(200).send("0")
                    return;
                }
                console.log(`unseen count clean: ${r.unseenCount}`)
                lastUnseenState = r.unseenCount
                lastUnseenStateUpdate = Date.now()
                res.status(200).send(lastUnseenState.toString()) 
            })})
        })

        /*
        =======
        get notifications themselves
        =======
        */
        app.get("/get_notifications", (req, res) => {
            const userdata = require("./userdata.json")
            if(req.headers.auth !== userdata.code
            || !userdata.usernameCache) {
                res.sendStatus(401)
                return;
            }

            let noJson = req.query.noJson == "0"

            fetch(`https://www.youtube.com/youtubei/v1/notification/get_notification_menu?key=${userdata.itKey}`, {
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
                    "notificationsMenuRequestType": "NOTIFICATIONS_MENU_REQUEST_TYPE_INBOX"
                })
            }).then(r => {r.json().then(r => {
                let unreadRaw = []
                let notificationsParsed = []
                r.actions[0].openPopupAction.popup.multiPageMenuRenderer.sections.forEach(s => {
                    if(!s.multiPageMenuNotificationSectionRenderer) return;
                    s.multiPageMenuNotificationSectionRenderer.items.forEach(i => {
                        if(i.notificationRenderer
                        && !i.notificationRenderer.read) {
                            unreadRaw.push(i.notificationRenderer)
                        }
                    })
                })
                console.log(`unread count clean: ${unreadRaw.length}`)
                lastUnseenState = 0;
                let queuedRequests = 0;
                let requestsMade = 0;

                // parse unread only
                unreadRaw.forEach(notif => {
                    let parsedNotification = {
                        "defaultText": notif.shortMessage.simpleText,
                        "notificationId": notif.notificationId
                    }
                    let notificationType = ""

                    // type-specific handle
                    if(notif.navigationEndpoint.getCommentsFromInboxCommand) {
                        notificationType = "comment"
                        parsedNotification.id = notif.navigationEndpoint
                                                .getCommentsFromInboxCommand
                                                .videoId
                        queuedRequests++;
                        utils.getVideo(parsedNotification.id, config.cookie,
                                       userdata.itContext, userdata.session,
                                       config.useragent, userdata.itKey,
                                       userdata.authUser, (data) => {
                            requestsMade++;
                            parsedNotification.title = data.title
                            parsedNotification.description = data.description
                            if(requestsMade >= queuedRequests) {
                                if(noJson) {
                                    notificationsParsed = unJson(notificationsParsed)
                                }
                                res.send(notificationsParsed)
                            }
                        })
                    } else if(notif.navigationEndpoint.watchEndpoint) {
                        notificationType = "upload"
                        parsedNotification.id = notif.navigationEndpoint
                                                .watchEndpoint.videoId
                    }
                    parsedNotification.type = notificationType

                    // date (relative to estimated abs)
                    parsedNotification.date = utils.relativeToAbs(
                        notif.sentTimeText.simpleText
                    )

                    // author thumbnail
                    if(notif.thumbnail) {
                        parsedNotification.thumbnail = notif.thumbnail
                                                       .thumbnails[0].url
                    }
                    
                    notificationsParsed.push(parsedNotification)
                })

                if(queuedRequests == 0) {
                    if(noJson) {
                        notificationsParsed = unJson(notificationsParsed)
                    }
                    res.send(notificationsParsed)
                }
            })})
        })

        function unJson(notifications) {
            let newNotifications = ""
            notifications.forEach(n => {
                newNotifications += n.type + ":" + n.id + ":"
                                    + encodeURIComponent(n.defaultText)
                                    + ":" + encodeURIComponent(n.title || "")
                                    + ";"
            })
            return newNotifications;
        }
    }
}