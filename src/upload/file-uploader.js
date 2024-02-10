const express = require("express");
const readXlsxFile = require("read-excel-file/node");
const log = require("log-to-file");
const { sendExportedFile } = require("../helpers/mailer");
module.exports = () => {
  const app = express();
  var multer = require("multer");
  const fs = require("fs");
  var moment = require("moment-timezone");

  var DBConnection = require("../helpers/DBConnection");
  var ResponseMaker = require("../helpers/ResponseMaker");

  var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      let dir = "/one-book-upload/" + req.query.module;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname);
    },
  });

  var upload = multer({ storage: storage }).single("file");

  app.post("/export-file", (req, res) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return res.status(500).json(err);
      } else if (err) {
        return res.status(500).json(err);
      }
      let data = {
        to: req.query.to,
        subject: req.query.subject,
        message: req.query.message,
        email: req.query.email,
        module: req.query.module,
        fileName: req.file.originalname,
        path: "/one-book-upload/" + req.query.module + "/" + req.file.filename,
      };

      sendExportedFile(data, res);
    });
  });

  app.post("/import-data", (req, res) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return res.status(500).json(err);
      } else if (err) {
        return res.status(500).json(err);
      }
      readXlsxFile(
        "/one-book-upload/" + req.query.module + "/" + req.file.filename
      ).then((rows) => {
        rows.shift();
        switch (req.query.moduleName) {
          case "pnm":
            handlePnm(req, res, rows);
            break;
          default:
            break;
        }
      });
    });
  });

  app.post("/uploadFile", (req, res) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return res.status(500).json(err);
      } else if (err) {
        return res.status(500).json(err);
      }
      let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");

      var moduleID = req.query.moduleID;
      var user = req.query.username;
      var query =
        "INSERT INTO `attachments` (`moduleID`, `filename`,`originalname`, `type`) VALUES ('" +
        moduleID +
        "', '" +
        req.file.filename +
        "','" +
        req.file.originalname +
        "' ,'" +
        req.file.mimetype +
        "')";

      var history =
        "INSERT INTO `history` (`moduleID`, `action`, `description`, `dateAndTime`,`name`) VALUES ('" +
        moduleID +
        "', 'File Upload','file#" +
        req.file.originalname +
        "', '" +
        dateTime +
        "', '" +
        user +
        "')";
      DBConnection.executeQuery(query, (err, result1) => {
        if (err) {
          ResponseMaker.sendInternalError(res);
        } else {
          if (moduleID !== "undefined") {
            DBConnection.executeQuery(history, (err, result2) => {
              if (err) {
                ResponseMaker.sendInternalError(res);
              } else {
                let data = {
                  fileID: result1.insertId,
                  filename: req.file.filename,
                  originalname: req.file.originalname,
                  type: req.file.mimetype,
                };
                ResponseMaker.customResponse(res, data);
              }
            });
          } else {
            let data = {
              fileID: result1.insertId,
              filename: req.file.filename,
              originalname: req.file.originalname,
              type: req.file.mimetype,
            };
            ResponseMaker.customResponse(res, data);
          }
        }
      });
    });
  });

  app.post("/deleteFile", (req, res) => {
    fs.unlinkSync(
      "/one-book-upload/" + req.body.module + "/" + req.body.filename,
      (err) => {
        if (err) {
          log(err);
          ResponseMaker.sendInternalError(res);
        }
      }
    );

    var query = "delete from `attachments` where fileID=" + req.body.fileID;

    if (req.body.module === "orgLogo") {
      query = "delete from `attachments` where moduleID='" + req.body.id + "'";
      DBConnection.executeQueryAndSendResponse(res, query);
    } else {
      let dateTime = moment.tz(req.body.timeZone).format("yy-MM-DD HH:mm:ss");
      var moduleID = req.body.moduleID;
      var user = req.body.username;
      var originalname = req.body.originalname;
      var history =
        "INSERT INTO `history` (`moduleID`, `action`, `description`, `dateAndTime`,`name`) VALUES ('" +
        moduleID +
        "', 'File Deleted','file#" +
        originalname +
        "', '" +
        dateTime +
        "', '" +
        user +
        "')";
      DBConnection.executeQuery(query, (err, result1) => {
        if (err) {
          ResponseMaker.sendInternalError(res);
        } else {
          DBConnection.executeQueryAndSendResponse(res, history);
        }
      });
    }
  });

  app.get("/attachments", (req, res) => {
    var query =
      "select * from attachments where moduleID='" + req.query.ID + "'";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  function handlePnm(req, res, rows) {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let refNum =
      "select lpad(max(materialSeries)+1, 4, '0') as ref from (SELECT s.materialSeries from series s where orgID=" +
      req.query.orgID +
      " UNION SELECT '0000' as materialSeries UNION  SELECT max(t.refNum) as  materialSeries from pnm t WHERE orgID=" +
      req.query.orgID +
      ") s";
    let refText =
      "SELECT s.materialPrefix from series s where orgID=" +
      req.query.orgID +
      " UNION SELECT 'PM-' as materialPrefix LIMIT 1";
    let con = DBConnection.getConnection();
    rows.forEach((row, i) => {
      row = row.map((column) => column || "");
      let pnmQuery =
        "INSERT INTO `pnm` (`orgID`, `refNum`, `refText`, `category`, `shotKey`, `itemName`, `itemDesc`, `unitPrice`, `unitType`, `sellingPercentage`, `reduceLimit`, `fixedSellingPrice`, `reduceLimitAmount`, `notes`, `sellingPrice`, `lastUpdate`, `updatedBy`, `marginType`) VALUES ('" +
        req.query.orgID +
        "',(" +
        refNum +
        "),(" +
        refText +
        "), '" +
        row[0] +
        "', '" +
        row[1] +
        "', '" +
        row[2] +
        "', '" +
        row[3] +
        "', '" +
        row[4] +
        "', '" +
        row[5] +
        "', '" +
        row[6] +
        "', '" +
        row[7] +
        "','" +
        row[8] +
        "', '" +
        row[9] +
        "', '" +
        row[10] +
        "', '" +
        0 +
        "', '" +
        dateTime +
        "', '" +
        req.query.username +
        "', '" +
        row[11] +
        "')";

      DBConnection.executeImportData(con, pnmQuery, (err, result1) => {
        if (err) {
          log(err);
          DBConnection.closeConnection();
        } else {
          let vendorQuery =
            "INSERT INTO `pnm_vendors` (`prodID`, `vendorName`, `vendorPrice`, `vendorCode`, `lastUpdate`, `updatedBy`) VALUES ('" +
            result1.insertId +
            "', '" +
            row[12] +
            "', '" +
            row[13] +
            "', '   ', '" +
            dateTime +
            "','" +
            req.query.username +
            "')";
          DBConnection.executeImportData(con, vendorQuery, (err, result2) => {
            if (err) {
              log(err);
              DBConnection.closeConnection(con);
            } else {
              let cID = "pnm" + result1.insertId;
              var history =
                "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" +
                cID +
                "', 'Added', '" +
                dateTime +
                "', '" +
                req.query.username +
                "')";
              DBConnection.executeImportData(con, history, (err, result5) => {
                if (err) {
                  log(err);
                  DBConnection.closeConnection(con);
                } else {
                  if (i === rows.length - 1) {
                    DBConnection.closeConnection(con);
                    deleteFileAftterImport(req.file.filename);
                  }
                }
              });
            }
          });
        }
      });
    });
    ResponseMaker.customResponse(res, {
      message: "Data processing in Progress",
    });
  }

  function deleteFileAftterImport(filename) {
    fs.unlinkSync("/one-book-upload/data-imports/" + filename, (err) => {
      if (err) {
        log(err);
      }
    });
  }

  return app;
};
