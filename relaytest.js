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
            const userdata = require("./userdata.json")
            if(req.headers.auth !== userdata.code) {
                res.sendStatus(401)
                return;
            }
            if(userdata.usernameCache) {
                res.send({
                    "username": userdata.usernameCache,
                    "handle": userdata.handleCache
                })
            } else {
                res.send(404)
            }
        })
    }
}