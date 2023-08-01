module.exports = {
    "addRelayTestEndpoints": function(app) {
        /*
        =======
        test relay
        =======
        */
        app.get("/relay_test_auth", (req, res) => {
            const userdata = require("./userdata.json")
            console.log("\nrelay authorization test running")
            if(req.headers.auth == userdata.code) {
                res.sendStatus(200)
                console.log("relay test: authorization successful!")
                return;
            } else {
                res.sendStatus(401)
                console.log("relay test: fail (wrong key?)")
                return;
            }
        })

        /*
        =======
        test yt connection
        =======
        */
        app.get("/relay_test_yt", (req, res) => {
            const userdata = JSON.parse(
                require("fs").readFileSync("./userdata.json").toString()
            )
            if(req.headers.auth !== userdata.code) {
                res.sendStatus(401)
                return;
            }
            if(userdata.usernameCache) {
                let response = {
                    "username": userdata.usernameCache,
                    "handle": userdata.handleCache
                }
                if(userdata.playlists) {
                    response.playlists = userdata.playlists;
                }
                res.send(response)
            } else {
                res.send(404)
            }
        })
    }
}