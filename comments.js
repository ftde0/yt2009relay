const fetch = require("node-fetch")
const utils = require("./utils")
const config = require("./config.json")

module.exports = {
    "addCommentEndpoint": function(app) {
        /*
        =======
        comment
        =======
        */
        app.post("/comment_post", (req, res) => {
            const userdata = require("./userdata.json")

            if(req.headers.auth !== userdata.code
            || !userdata.usernameCache) {
                res.sendStatus(401)
                return;
            }
            let commentText = JSON.parse(req.body.toString()).comment
            let id = req.headers.source.split("v=")[1]
                                        .split("&")[0]
                                        .split("#")[0]
            
            // get comment param used to post a commend
            utils.commentParamFromVideoId(
                id, config.cookie,
                userdata.itContext,
                userdata.session,
                config.useragent,
                userdata.itKey,
            (data) => {
                setTimeout(function() {
                    // comment!!
                    fetch(`https://www.youtube.com/youtubei/v1/comment/create_comment?key=${userdata.itKey}`, {
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
                            "commentText": commentText,
                            "createCommentParams": data
                        })
                    }).then(r => {r.json().then(r => {
                        res.send("")
                        console.log(`comment posted via relay to ${id}, with text ${commentText}`)
                    })})
                }, 1753)
            })
        })
    }
}