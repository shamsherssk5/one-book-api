const express = require("express");
module.exports = () => {
  var app = express();
  var DBConnection = require("../helpers/DBConnection");
  var ResponseMaker = require("../helpers/ResponseMaker");
  var moment = require("moment-timezone");

  app.get("/history", (req, res) => {
    var query =
      "select * from history where moduleID='" +
      req.query.ID +
      "' order by dateAndTime desc";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/discussion", async (req, res) => {
    var query =
      "SELECT * from discussion where moduleID='" +
      req.query.ID +
      "' order by case when isreply='no' then -cid else cid END ASC";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/postComment", (req, res) => {
    let comment = req.body;
    let dateTime = moment.tz(comment.timeZone).format("yy-MM-DD HH:mm:ss");
    var query =
      "INSERT INTO `discussion` (`moduleID`,`comId`, `userId` ,`fullName`, `avatarUrl`, `text`, `created_date`) VALUES ('" +
      comment.moduleID +
      "','" +
      comment.comId +
      "', '" +
      comment.userId +
      "','" +
      comment.fullName +
      "', '" +
      comment.avatarUrl +
      "', '" +
      comment.text +
      "', '" +
      dateTime +
      "')";
    DBConnection.executeQueryAndSendResponse(res, query);
  });
  app.post("/editComment", (req, res) => {
    let comment = req.body;
    var query =
      "UPDATE `discussion` SET `text` = '" +
      comment.text +
      "' WHERE `discussion`.`comId` = '" +
      comment.comId +
      "' and `discussion`.moduleID='" +
      comment.moduleID +
      "'";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/deleteComment", (req, res) => {
    let comment = req.body;
    var query =
      "delete from `discussion` WHERE `discussion`.`cid` in (SELECT cid from discussion where comId='" +
      comment.comIdToDelete +
      "' or parentId='" +
      comment.comIdToDelete +
      "') and `discussion`.moduleID='" +
      comment.moduleID +
      "'";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/addReply", (req, res) => {
    let comment = req.body;
    let dateTime = moment.tz(comment.timeZone).format("yy-MM-DD HH:mm:ss");
    var query =
      "INSERT INTO `discussion` (`moduleID`,`comId`, `userId` ,`fullName`, `avatarUrl`, `text`, `created_date`,`isreply`,`parentId`) VALUES ('" +
      comment.moduleID +
      "','" +
      comment.comId +
      "', '" +
      comment.userId +
      "','" +
      comment.fullName +
      "', '" +
      comment.avatarUrl +
      "', '" +
      comment.text +
      "', '" +
      dateTime +
      "','yes','" +
      comment.repliedToCommentId +
      "')";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/conversations", (req, res) => {
    var query =
      "select * from conversations where moduleID='" + req.query.ID + "'";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/postMessage", (req, res) => {
    let message = req.body;
    let dateTime = moment.tz(message.timeZone).format("yy-MM-DD HH:mm:ss");
    var query =
      "INSERT INTO `conversations` (`moduleID`, `userID`, `username`, `text`, `avatarUrl`, `timestamp`) VALUES ('" +
      message.moduleID +
      "', '" +
      message.userID +
      "', '" +
      message.username +
      "', '" +
      message.text +
      "', '" +
      message.avatarUrl +
      "','" +
      dateTime +
      "')";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/users-sup-cust", (req, res) => {
    var query =
      "select userName as name, userID as id from users where orgID=" +
      req.query.orgID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });
  return app;
};
