const express = require('express');
module.exports = () => {
    var app = express();
    var DBConnection = require('../helpers/DBConnection');
    var ResponseMaker = require('../helpers/ResponseMaker');
    var moment=require('moment-timezone');


    app.get("/history", (req, res) => {
        var query = "select * from history where moduleID='" + req.query.ID + "' order by dateAndTime desc";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/conversations", (req, res) => {
        var query = "select * from conversations where moduleID='" + req.query.ID + "'";
        DBConnection.executeQueryAndSendResponse(res, query);
    });


    app.post("/postMessage", (req, res) => {
        let message=req.body;
        let dateTime=moment.tz(message.timeZone).format('yy-MM-DD HH:mm:ss')
        var query = "INSERT INTO `conversations` (`moduleID`, `userID`, `username`, `text`, `avatarUrl`, `timestamp`) VALUES ('"+message.moduleID+"', '"+message.userID+"', '"+message.username+"', '"+message.text+"', '"+message.avatarUrl+"','"+dateTime+"')";
        DBConnection.executeQueryAndSendResponse(res, query);

    });
    return app;
}