const express = require("express")
const cors = require("cors")
const fetch = require("node-fetch")
const fs = require("fs")
const utils = require("./utils")
const config = require("./config.json")



const firstrun = require("./firstrun")
const relaytest = require("./relaytest")
const relaysettings = require("./relaysettings")
const comments = require("./comments")
const playlists = require("./playlists")



let userdata = {
    "itKey": "",
    "itContext": {},
    "session": "",
    "usernameCache": "",
    "handleCache": "@h",
    "uiSettings": []
}
if(fs.existsSync("userdata.json")) {
    userdata = JSON.parse(fs.readFileSync("userdata.json").toString())
    console.log("userdata file exists, no need to create")
}



const app = express();
app.listen(config.port, () => {
    console.log(`yt2009relay server started!! port ${config.port}`);
});
//app.use(express.static("./vidstorage/"))
app.use(cors({
    "origin": new RegExp(config.domain)
}))
app.use(express.raw({
    "type": () => true
}))


/*
=======
set up endpoints
=======
*/
relaytest.addRelayTestEndpoints(app)
relaysettings.addRelaySettingsEndpoints(app)
comments.addCommentEndpoint(app)
playlists.addPlaylistEndpoints(app)

/*
=======
first run, create userdata files if necessary
=======
*/
if(!fs.existsSync(`userdata.json`)) {
    firstrun.createUserdata((data) => {
        userdata = data;
    })
} else {
    userdata = JSON.parse(
        fs.readFileSync(`userdata.json`).toString()
    )
}
