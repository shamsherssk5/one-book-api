const express = require("express");
const log = require("log-to-file");
module.exports = () => {
  const app = express();
  var jwt = require("jsonwebtoken");
  const bcrypt = require("bcrypt");
  const fs = require("fs");
  const saltRounds = 10;
  var DBConnection = require("../helpers/DBConnection");
  var ResponseMaker = require("../helpers/ResponseMaker");
  var mailer = require("../helpers/mailer");
  var jwtSecret = JSON.parse(
    fs.readFileSync("./src//assets/jwt-token-secret.json")
  );
  app.post("/signup", (req, res) => {
    var checkQuery =
      "select count(*) as exist from users u where u.email='" +
      req.body.email +
      "'";

    DBConnection.executeQuery(checkQuery, (err, result) => {
      if (parseInt(result[0].exist) === 0) {
        const hash = bcrypt.hashSync(req.body.password, saltRounds);
        var query =
          "INSERT INTO `users` (`first_name`, `last_name`, `mobile`, `email`, `password`, `userName`, `role`) VALUES ('" +
          req.body.first_name +
          "', '" +
          req.body.last_name +
          "', '" +
          req.body.mobile_num +
          "', '" +
          req.body.email +
          "', '" +
          hash +
          "',  '" +
          req.body.first_name +
          " " +
          req.body.last_name +
          "', 'admin')";
        DBConnection.executeQueryAndSendResponse(res, query);
      } else {
        ResponseMaker.customResponse(res, { message: "User Already exists!" });
      }
    });
  });

  app.post("/signin", (req, res) => {
    //var checkQuery = "select u.password, u.userName,u.userID,u.userAvatar, u.role, u.orgID from users u where u.email='" + req.body.user_email + "'";

    var checkQuery =
      "select u.password, u.userName,u.userID,u.userAvatar, u.role, u.orgID,l.timeZone,l.timeFormat,l.dateFormat from users u, location l where l.orgID in (u.orgID,0) and u.email='" +
      req.body.user_email +
      "' ORDER by l.orgID DESC LIMIT 1";
    DBConnection.executeQuery(checkQuery, (err, result) => {
      if (err) {
        log("Error Occured" + JSON.stringify(err), "app-log.log", "\r\n");
      }
      if (result && result.length > 0) {
        let check = bcrypt.compareSync(
          req.body.user_password,
          result[0].password
        );

        if (check) {
          var user = {
            username: result[0].userName,
            id: result[0].userID,
            avatarUrl: result[0].userAvatar,
            role: result[0].role,
            email: req.body.user_email,
            orgID: result[0].orgID,
            timeZone: result[0].timeZone,
            timeFormat: result[0].timeFormat,
            dateFormat: result[0].dateFormat,
          };
          var token = jwt.sign(user, jwtSecret.secret);
          ResponseMaker.customResponse(res, { token: token, user: user });
        } else {
          ResponseMaker.customResponse(res, {
            message: "Invalid Credentials",
          });
        }
      } else {
        ResponseMaker.customResponse(res, {
          message: "User does not exists!",
        });
      }
    });
  });

  app.post("/sendLink", (req, res) => {
    var checkQuery =
      "select u.userName from users u where u.email='" + req.body.email + "'";

    DBConnection.executeQuery(checkQuery, (err, result) => {
      if (result && result.length > 0) {
        var token = jwt.sign({ email: req.body.email }, jwtSecret.secret);
        mailer.sendResetMail(req.body, res, token);
      } else {
        ResponseMaker.customResponse(res, { message: "User does not exists!" });
      }
    });
  });

  app.post("/resetPassword", (req, res) => {
    const token = req.header("Authorization");
    if (!token) {
      ResponseMaker.customResponse(res, { error: "Link Expired" });
    }
    try {
      var decode = jwt.verify(token, jwtSecret.secret);
    } catch (err) {
      ResponseMaker.customResponse(res, { error: "Link Expired" });
    }

    var checkQuery =
      "select u.userName from users u where u.email='" + decode.email + "'";

    DBConnection.executeQuery(checkQuery, (err, result) => {
      if (result && result.length > 0) {
        const hash = bcrypt.hashSync(req.body.password, saltRounds);
        var query =
          "update users u set password='" +
          hash +
          "' where u.email='" +
          decode.email +
          "'";
        DBConnection.executeQueryAndSendResponse(res, query);
      } else {
        ResponseMaker.customResponse(res, { message: "User does not exists!" });
      }
    });
  });

  app.get("/getFile", async (req, res) => {
    // const contents = await fs.readFileSync('/one-book-upload/payslips.pdf', {encoding: 'base64'});
    // res.send({"base64":contents})
    res.sendFile("/one-book-upload/" + req.query.name);
  });
  app.get("/downLoadFile", async (req, res) => {
    res.download("/one-book-upload/" + req.query.name);
  });
  return app;
};
