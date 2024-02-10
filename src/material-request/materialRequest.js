const express = require("express");
module.exports = () => {
  var app = express();
  var DBConnection = require("../helpers/DBConnection");
  var ResponseMaker = require("../helpers/ResponseMaker");
  var moment = require("moment-timezone");

  app.get("/departments", (req, res) => {
    var query = "select * from mtr_departments";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/postDepartment", (req, res) => {
    var query =
      "INSERT INTO `mtr_departments` (`name`, `colour`) VALUES ('" +
      req.body.name +
      "', '" +
      req.body.color +
      "')";
    if (req.body.isEditable) {
      query =
        "update `mtr_departments` set name='" +
        req.body.name +
        "', colour='" +
        req.body.color +
        "' where depID=" +
        req.body.id;
    }
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/deleteDepartment", (req, res) => {
    var query = "delete from `mtr_departments` where depID=" + req.body.id;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/getMtr", async (req, res) => {
    var query =
      "select t.*,(SELECT count(*) from attachments a where concat('mtr',t.matID)=a.moduleID) as attachmentsCount from  mtr t where orgID=" +
      req.query.orgID +
      " order by requestedDate desc";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/getpnm", async (req, res) => {
    var query =
      "select CONCAT(itemName,' - ',itemDesc) as itemName,unitType as unitname from  pnm where orgID=" +
      req.query.orgID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/delete-mtr", (req, res) => {
    let query =
      "delete from `mtr`  WHERE `mtr`.`matID` in (" + req.body.IDs + ")";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/move-mtr", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    if (req.body.status === "Order Request") {
      (req.body.IDs + ",")
        .split(",")
        .filter((id) => !!id)
        .map((id) => parseInt(id))
        .forEach((id) => {
          let query =
            "insert into mtr select null as matID,orgID," +
            "(select lpad(max(refNum)+1, 4, '0') as ref from  (SELECT '0000' as refNum UNION select max(refNum) as refNum from mtr WHERE orgID=" +
            req.body.orgID +
            ") t) as refNum,refText,department,materialName,quantity,unit,projectID,priority,'Re Order Request' as status,'" +
            dateTime +
            "' as requestedDate,notes,'" +
            req.body.user +
            "' as createdBy,priority_date from mtr where matID=" +
            id;

          DBConnection.executeQuery(query, (err, result1) => {
            if (err) {
            } else {
              let cID = "mtr" + result1.insertId;
              var history =
                "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" +
                cID +
                "', 'Re Ordered', '" +
                dateTime +
                "', '" +
                req.body.user +
                "')";
              DBConnection.executeQuery(history, (err, result5) => {});
            }
          });
        });
      ResponseMaker.sendOKResponse(res, { result: "success" });
    } else {
      let query =
        "UPDATE `mtr` SET `status` = '" +
        req.body.status +
        "'  WHERE `mtr`.`matID` in (" +
        req.body.IDs +
        ")";

      DBConnection.executeQuery(query, (err, result1) => {
        if (err) {
          ResponseMaker.sendInternalError(res);
        } else {
          var history =
            "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ?";
          DBConnection.executeMultiple(
            history,
            [
              (req.body.IDs + ",")
                .split(",")
                .map((id) => [
                  "mtr" + id,
                  "Moved to " + req.body.status,
                  dateTime,
                  req.body.user,
                ]),
            ],
            (err, result2) => {
              if (err) {
                ResponseMaker.sendInternalError(res);
              } else {
                ResponseMaker.sendOKResponse(res, { result: "success" });
              }
            }
          );
        }
      });
    }
  });
  app.post("/create-multiple-mtr", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let mtrs = req.body.mtrs;
    mtrs.forEach((mtr) => {
      let refNum =
        "select lpad(max(refNum)+1, 4, '0') as ref from  (SELECT '0000' as refNum UNION select max(refNum) as refNum from mtr WHERE orgID=" +
        mtr.orgID +
        ") t";
      let query =
        "INSERT INTO `mtr` (`orgID`, `refNum`, `department`, `materialName`, `quantity`, `unit`, `projectID`, `priority`, `status`, `requestedDate`, `notes`, `createdBy`, `priority_date`) VALUES ('" +
        mtr.orgID +
        "', (" +
        refNum +
        "), '" +
        mtr.department +
        "', '" +
        mtr.materialName +
        "', '" +
        mtr.quantity +
        "', '" +
        mtr.unit +
        "', '" +
        mtr.projectID +
        "', '" +
        mtr.priority +
        "', '" +
        mtr.status +
        "', '" +
        dateTime +
        "', '" +
        mtr.notes +
        "', '" +
        mtr.createdBy +
        "', '" +
        mtr.priority_date +
        "')";

      DBConnection.executeQuery(query, (err, result1) => {
        if (err) {
        } else {
          let cID = "mtr" + result1.insertId;
          var history =
            "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" +
            cID +
            "', 'Added', '" +
            dateTime +
            "', '" +
            mtr.createdBy +
            "')";
          DBConnection.executeQuery(history, (err, result5) => {});
        }
      });
    });
    ResponseMaker.sendOKResponse(res, { result: "success" });
  });

  app.post("/create-mtr", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let mtr = req.body;
    let refNum =
      "select lpad(max(refNum)+1, 4, '0') as ref from  (SELECT '0000' as refNum UNION select max(refNum) as refNum from mtr WHERE orgID=" +
      mtr.orgID +
      ") t";
    let query =
      "INSERT INTO `mtr` (`orgID`, `refNum`, `department`, `materialName`, `quantity`, `unit`, `projectID`, `priority`, `status`, `requestedDate`, `notes`, `createdBy`, `priority_date`) VALUES ('" +
      mtr.orgID +
      "', (" +
      refNum +
      "), '" +
      mtr.department +
      "', '" +
      mtr.materialName +
      "', '" +
      mtr.quantity +
      "', '" +
      mtr.unit +
      "', '" +
      mtr.projectID +
      "', '" +
      mtr.priority +
      "', '" +
      mtr.status +
      "', '" +
      dateTime +
      "', '" +
      mtr.notes +
      "', '" +
      mtr.createdBy +
      "', '" +
      mtr.priority_date +
      "')";

    DBConnection.executeQuery(query, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        let cID = "mtr" + result1.insertId;
        var history =
          "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" +
          cID +
          "', 'Added', '" +
          dateTime +
          "', '" +
          mtr.createdBy +
          "')";
        DBConnection.executeQuery(history, (err, result5) => {
          if (err) {
            ResponseMaker.sendInternalError(res);
          } else {
            let customerID = "mtr" + result1.insertId;
            if (mtr.attachments && mtr.attachments.length > 0) {
              mtr.attachments.forEach((element) => {
                let attachQuery =
                  "UPDATE `attachments` SET `moduleID` = '" +
                  customerID +
                  "' WHERE `attachments`.`fileID` =" +
                  element.fileID;
                DBConnection.executeQuery(attachQuery, (err, result) => {});
              });
            }
            ResponseMaker.customResponse(res, result1);
          }
        });
      }
    });
  });

  app.post("/update-mtr", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let mtr = req.body;
    let editQuery =
      "UPDATE `mtr` SET `department` = '" +
      mtr.department +
      "', `materialName` = '" +
      mtr.materialName +
      "', `quantity` = '" +
      mtr.quantity +
      "', `unit` = '" +
      mtr.unit +
      "', `projectID` = '" +
      mtr.projectID +
      "', `priority` = '" +
      mtr.priority +
      "', `notes` = '" +
      mtr.notes +
      "', `priority_date` = '" +
      mtr.priority_date +
      "' WHERE `mtr`.`matID` = " +
      mtr.matID;
    var history =
      "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('mtr" +
      mtr.matID +
      "', 'Edited', '" +
      dateTime +
      "', '" +
      mtr.assignee +
      "')";
    DBConnection.executeQuery(editQuery, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        DBConnection.executeQuery(history, (err, result1) => {
          if (err) {
            ResponseMaker.sendInternalError(res);
          } else {
            ResponseMaker.customResponse(res, result1);
          }
        });
      }
    });
  });
  return app;
};
