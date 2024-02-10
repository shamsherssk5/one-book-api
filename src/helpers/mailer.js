var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var ResponseMaker = require("./ResponseMaker");
const log = require("log-to-file");
const fs = require("fs");

var transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: "onebook.team.smptp@gmail.com",
    // pass: 'Onebook@12345'
    pass: "oxwrkwyltjkntifo",
  },
});

const sendResetMail = (data, res, token) => {
  var mailOptions = {
    from: "OneBook Team",
    to: data.email,
    subject: "Request for password reset",
    html:
      "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
      "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
      data.env +
      "?token=" +
      token +
      "\n\n" +
      "If you did not request this, please ignore this email and your password will remain unchanged.\n",
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      log(error, "app-log.log", "\r\n");
      ResponseMaker.customResponse(res, { message: "Error Occured" });
    } else {
      log(JSON.stringify(info), "app-log.log", "\r\n");
      ResponseMaker.customResponse(res, { data: "Message Sent Successfully" });
    }
  });
};

const sendUserCreatedEmail = (data, res, token, result) => {
  var mailOptions = {
    from: "OneBook Team",
    to: data.email,
    subject: "Welcome to One Book Team",
    html:
      "Hello " +
      data.email +
      ",\n\n" +
      "Welcome to OneBook Team, Please click the below link to set your Password:\n\n" +
      data.env +
      "?token=" +
      token +
      "\n\n" +
      "If you did not request this, please Ignore this email.\n",
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      ResponseMaker.customResponse(res, { message: "Error Occured" });
    } else {
      ResponseMaker.customResponse(res, result);
    }
  });
};

const sendExportedFile = (data, res) => {
  var mailOptions = {
    from: "OneBook Team",
    to: data.email ? data.to + "," + data.email : data.to,
    subject: data.subject,
    text: data.message,
    attachments: [
      {
        filename: data.fileName,
        path: data.path,
      },
    ],
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      ResponseMaker.customResponse(res, { message: "Error Occured" });
    } else {
      fs.unlinkSync(data.path, (err) => {
        if (err) {
          log(err);
        }
      });
      ResponseMaker.customResponse(res, {
        message: "Email sent SuccessFully",
      });
    }
  });
};

module.exports = {
  sendResetMail,
  sendUserCreatedEmail,
  sendExportedFile,
};
