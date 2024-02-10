const express = require("express");
module.exports = () => {
  var app = express();
  var DBConnection = require("../helpers/DBConnection");
  var ResponseMaker = require("../helpers/ResponseMaker");
  var moment = require("moment-timezone");

  app.get("/estimations-list", (req, res) => {
    var query1 =
      "select c.*,(select GROUP_CONCAT(u.userName SEPARATOR ',') from users u where u.userID IN (SELECT l.m_id from cust_managers l where l.custID=c.custID)) as managers from  estimations c where orgID=" +
      req.query.orgID +
      " and Length(trim(c.projName))>0 and c.createdBy='" +
      req.query.username +
      "'";
    var query2 =
      "select c.*,(select GROUP_CONCAT(u.userName SEPARATOR ',') from users u where u.userID IN (SELECT l.m_id from cust_managers l where l.custID=c.custID)) as managers from  estimations c where orgID=" +
      req.query.orgID +
      " and Length(trim(c.projName))>0 and Length(trim(c.customer))>0 and c.amount>0 and c.createdBy!='" +
      req.query.username +
      "'";
    let query =
      " select * from ((" +
      query1 +
      ") union (" +
      query2 +
      ")) x order by x.created desc";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/est-getpnm", async (req, res) => {
    var query =
      "SELECT prodID,category,shotKey,CONCAT(itemName,' - ',itemDesc) as itemName,unitPrice,unitType,sellingPercentage,reduceLimit,fixedSellingPrice,reduceLimitAmount, marginType from pnm where marginType!='others' and orgID=" +
      req.query.orgID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/customers-list", (req, res) => {
    var query =
      "select custID,custName,address,country,state,emailAccounts,phone from customers c where orgID=" +
      req.query.orgID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/getEst", (req, res) => {
    var query =
      "select c.*,(select GROUP_CONCAT(u.name SEPARATOR ',') from cust_contacts u where u.id IN (SELECT l.m_id from cust_managers l where l.custID=c.custID)) as managers from  estimations c where estID=" +
      req.query.estID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/estimations-mat-row", (req, res) => {
    var query =
      "select * from  estimatMatRow mat where mat.rowID=" +
      req.query.rowID +
      " and mat.units>0 and mat.unitPrice>0 order by id";
    DBConnection.executeQueryAndSendResponse(res, query);
  });
  app.get("/estimations-row", (req, res) => {
    var query =
      "select * from  estimateRow row where row.estID=" +
      req.query.estID +
      " and qty>0 and unitPrice>0 order by sequence,id";
    DBConnection.executeQueryAndSendResponse(res, query);
  });
  app.get("/latest-est-activity", (req, res) => {
    let query =
      "(SELECT * FROM `est_activity`  WHERE estID=" +
      req.query.estID +
      " and activity='Requested By'  ORDER By created DESC LIMIT 1) UNION (SELECT * FROM `est_activity`  WHERE estID=" +
      req.query.estID +
      " and activity='Approved By'  ORDER By created DESC LIMIT 1)";

    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/get-latest-ref", (req, res) => {
    var query =
      "select t1.*,t2.* from ((select lpad(max(refNum)+1, 4, '0') as ref from  (SELECT '0000' as refNum UNION select max(refNum) as refNum from estimations WHERE orgID=" +
      req.query.orgID +
      ") t) t1, (SELECT s.estimationPrefix from series s where orgID=" +
      req.query.orgID +
      " UNION SELECT 'EST-' as inventoryPrefix LIMIT 1)t2)";

    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/set-opened", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let query =
      "UPDATE `estimations` SET `opened` = '" +
      dateTime +
      "' WHERE `estimations`.`estID` =" +
      req.body.id;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/mat-row-delete", (req, res) => {
    let query = "delete from estimatMatRow where id=" + req.body.id;
    DBConnection.executeQueryAndSendResponse(res, query);
  });
  app.post("/row-delete", (req, res) => {
    let query = "delete from estimateRow where id=" + req.body.id;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/row-copy", (req, res) => {
    let row = req.body;
    let rowQuery1 =
      "insert into estimateRow select null as id," +
      row.estID +
      " as estID,name,description,isMatList,qty,tax,unitPrice,discount,0 as sequence from estimateRow where id=" +
      row.id;
    DBConnection.executeQuery(rowQuery1, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        let matQuery =
          "insert into estimatMatRow select null as id," +
          result1.insertId +
          " as rowID,name,shortKey,unitType,unitPrice,units,margin,sellingPrice from estimatMatRow  where rowID=" +
          row.id;
        DBConnection.executeQuery(matQuery, (err, result5) => {
          if (err) {
            ResponseMaker.sendInternalError(res);
          } else {
            let selectQuery =
              "select id, shortKey,name from estimatMatRow where rowID=" +
              result1.insertId;
            DBConnection.executeQuery(selectQuery, (err, result6) => {
              if (err) {
                ResponseMaker.sendInternalError(res);
              } else {
                ResponseMaker.customResponse(res, {
                  id: result1.insertId,
                  matList: result6,
                });
              }
            });
          }
        });
      }
    });
  });

  app.post("/create-initial-est", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let est = req.body;
    let refNum =
      "select lpad(max(estimationSeries)+1, 4, '0') as ref from (SELECT s.estimationSeries from series s where orgID=" +
      est.orgID +
      " UNION SELECT '0000' as estimationSeries UNION  SELECT max(t.refNum) as  estimationSeries from estimations t WHERE orgID=" +
      est.orgID +
      ") s";
    let refText =
      "SELECT s.estimationPrefix from series s where orgID=" +
      est.orgID +
      " UNION SELECT 'EST-' as estimationPrefix LIMIT 1";
    let estQuery =
      "INSERT INTO `estimations` (`orgID`, `refText`, `refNum`, `projName`, `reference`, `customer`, `contactName`, `contactEmail`, `custID`, `amount`, `status`, `additionalNotes`,`taxType`,`taxPercentage`,`currency`,`taxLabel`, `created`, `updated`, `opened`, `createdBy`) VALUES ( '" +
      est.orgID +
      "', (" +
      refText +
      "), (" +
      refNum +
      "), '', '', '', '', '', '', '', 'Draft', '','" +
      est.taxType +
      "','" +
      est.taxPercentage +
      "', '" +
      est.currency +
      "', '" +
      est.taxLabel +
      "', '" +
      dateTime +
      "', '" +
      dateTime +
      "', '" +
      dateTime +
      "', '" +
      est.createdBy +
      "')";
    let deleteQuery = "delete from estimations where Length(trim(projName))<=0";
    DBConnection.executeQuery(deleteQuery, (err, result) => {
      DBConnection.executeQuery(estQuery, (err, result1) => {
        if (err) {
          ResponseMaker.sendInternalError(res);
        } else {
          let rowQuery =
            "INSERT INTO `estimateRow` ( `estID`,`qty`,`tax`) values('" +
            result1.insertId +
            "','1','" +
            est.taxPercentage +
            "')";
          DBConnection.executeQuery(rowQuery, (err, result3) => {
            if (err) {
              ResponseMaker.sendInternalError(res);
            } else {
              let query =
                "select estID,refText,refNum from estimations where estID=" +
                result1.insertId;
              DBConnection.executeQuery(query, (err, result2) => {
                if (err) {
                  ResponseMaker.sendInternalError(res);
                } else {
                  ResponseMaker.sendOKResponse(res, {
                    est: result2,
                    rowID: result3.insertId,
                  });
                }
              });
            }
          });
        }
      });
    });
  });

  app.post("/mat-row-addition", (req, res) => {
    let rowID = req.body.rowID;
    let query = "insert into estimatMatRow (`rowID`) values (" + rowID + ")";
    DBConnection.executeQuery(query, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        ResponseMaker.customResponse(res, [
          {
            id: result1.insertId,
            value: null,
          },
        ]);
      }
    });
  });

  app.post("/row-addition", (req, res) => {
    let est = req.body;
    let query =
      "INSERT INTO `estimateRow` ( `estID`,`qty`,`tax`) values('" +
      est.estID +
      "','1','" +
      est.taxPercentage +
      "')";
    DBConnection.executeQuery(query, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        ResponseMaker.customResponse(res, [
          {
            id: result1.insertId,
            value: null,
          },
        ]);
      }
    });
  });

  app.post("/create-initial-matRows", (req, res) => {
    let rowID = req.body.rowID;
    let query = "insert into estimatMatRow (`rowID`) values (" + rowID + ")";
    DBConnection.executeQuery(query, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        DBConnection.executeQuery(query, (err, result2) => {
          if (err) {
            ResponseMaker.sendInternalError(res);
          } else {
            ResponseMaker.customResponse(res, [
              {
                id: result1.insertId,
                value: null,
              },
              {
                id: result2.insertId,
                value: null,
              },
            ]);
          }
        });
      }
    });
  });

  app.post("/addEditCategories", (req, res) => {
    let { isEdit, formData, prodIDs, orgID } = req.body;
    let IDs = prodIDs.length === 1 ? prodIDs[0] : prodIDs.join();
    let query = "";
    if (isEdit) {
      query =
        "update pnm set sellingPercentage='" +
        formData.sellingPercentage +
        "', category='" +
        formData.category +
        "' where orgID=" +
        orgID +
        " and marginType='percentage' and prodID in (" +
        IDs +
        ")";
    } else {
      query =
        "INSERT INTO `pnm_category` (`catname`) VALUES ('" +
        formData.category +
        "')";
    }
    DBConnection.executeQuery(query, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        ResponseMaker.sendOKResponse(res, { message: "success" });
      }
    });
  });

  app.post("/update-est-form", (req, res) => {
    let data = {
      tableName: "estimations",
      column: req.body.property,
      value: req.body.value,
      key: "estID",
      keyValue: req.body.estID,
    };
    handleDataUpdation(res, data);
  });

  app.post("/update-est-row-form", (req, res) => {
    let data = {
      tableName: "estimateRow",
      column: req.body.property,
      value: req.body.value,
      key: "id",
      keyValue: req.body.id,
    };
    handleDataUpdation(res, data);
  });

  app.post("/update-est-mat-row-form", (req, res) => {
    let data = {
      tableName: "estimatMatRow",
      key: "id",
      keyValue: req.body.id,
      props: req.body.data,
    };
    handleDataUpdationWithMultipleColumn(res, data);
  });

  app.post("/update-est", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let est = req.body.formData;
    let estQuery =
      "update estimations set amount='" +
      est.grandTotal +
      "' ,updated='" +
      dateTime +
      "' where estID=" +
      est.estID;
    DBConnection.executeQuery(estQuery, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        let tID = "est" + est.estID;
        var history =
          "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" +
          tID +
          "', 'Updated', '" +
          dateTime +
          "', '" +
          req.query.username +
          "')";
        DBConnection.executeQuery(history, (err, result4) => {});
        ResponseMaker.customResponse(res, result1);
      }
    });
  });

  app.post("/create-est", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let est = req.body.formData;
    let estQuery =
      "update estimations set amount='" +
      est.grandTotal +
      "' ,updated='" +
      dateTime +
      "' where estID=" +
      est.estID;
    DBConnection.executeQuery(estQuery, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        let tID = "est" + est.estID;
        var history =
          "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" +
          tID +
          "', 'Added', '" +
          dateTime +
          "', '" +
          est.createdBy +
          "')";
        DBConnection.executeQuery(history, (err, result4) => {
          if (err) {
            ResponseMaker.sendInternalError(res);
          } else {
            let taskID = "est" + est.estID;
            if (req.body.attachments && req.body.attachments.length > 0) {
              req.body.attachments.forEach((element) => {
                let attachQuery =
                  "UPDATE `attachments` SET `moduleID` = '" +
                  taskID +
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

  app.post("/event-update", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let IDs = req.body.IDs;
    let event = req.body.event;
    let orgID = req.body.orgID;
    let username = req.body.username;
    switch (event) {
      case "delete":
        handleDelete(res, IDs);
        break;
      case "duplicate":
        handleDuplicate(res, IDs, orgID, username, dateTime);
        break;
      case "Awaiting Approval":
        changeStatusAndAddActivity(
          res,
          IDs,
          event,
          username,
          dateTime,
          "Requested By"
        );
        break;
      case "Approved":
        changeStatusAndAddActivity(
          res,
          IDs,
          event,
          username,
          dateTime,
          "Approved By"
        );
        break;
      case "Sent":
        changeStatusAndAddActivity(res, IDs, event, username, dateTime);
        break;
      case "Declined":
        changeStatusAndAddActivity(res, IDs, event, username, dateTime);
        break;
      case "Draft":
        changeStatusAndAddActivity(res, IDs, event, username, dateTime);
        break;
      default:
        break;
    }
  });

  function handleDelete(res, IDs) {
    let query =
      "delete from `estimations`  WHERE `estimations`.`estID` in (" + IDs + ")";
    DBConnection.executeQueryAndSendResponse(res, query);
  }

  function handleDuplicate(res, IDs, orgID, username, dateTime) {
    IDs.toString()
      .split(",")
      .map((m) => parseInt(m))
      .forEach((id) => {
        let estQuery =
          "INSERT INTO `estimations`  select null as estID,'" +
          orgID +
          "' as orgID, (SELECT s.estimationPrefix from series s where orgID=" +
          orgID +
          " UNION SELECT 'EST-' as estimationPrefix LIMIT 1) as refText, (select lpad(max(estimationSeries)+1, 4, '0') as ref from (SELECT s.estimationSeries from series s where orgID=" +
          orgID +
          " UNION SELECT '0000' as estimationSeries UNION  SELECT max(t.refNum) as  estimationSeries from estimations t WHERE orgID=" +
          orgID +
          ") s) as refNum, CONCAT(projName,'-duplicated') as projName , reference, customer, contactName, contactEmail, custID, amount, status, additionalNotes,taxType,taxPercentage,currency,taxLabel,'" +
          dateTime +
          "' as created,null as opened,null as updated,'" +
          username +
          "' as createdBy from estimations where estID=" +
          id;
        DBConnection.executeQuery(estQuery, (err, result1) => {
          if (err) {
            ResponseMaker.sendInternalError(res);
          } else {
            let rowQuery =
              "insert into estimateRow select null as id," +
              result1.insertId +
              " as estID,name,description,isMatList,qty,tax,unitPrice,discount,sequence from estimateRow where isMatList=0 and estID=" +
              id;
            DBConnection.executeQuery(rowQuery, (err, result2) => {
              if (err) {
                ResponseMaker.sendInternalError(res);
              } else {
                let tID = "est" + result1.insertId;
                var history =
                  "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" +
                  tID +
                  "', 'Copied', '" +
                  dateTime +
                  "', '" +
                  username +
                  "')";
                DBConnection.executeQuery(history, (err, resultH) => {});

                let selectQuery =
                  "SELECT id FROM `estimateRow` WHERE  isMatList=1 and estID=" +
                  id;
                DBConnection.executeQuery(selectQuery, (err, result3) => {
                  if (err) {
                    ResponseMaker.sendInternalError(res);
                  } else {
                    if (result3 && result3.length > 0) {
                      let list = JSON.parse(JSON.stringify(result3));
                      list.forEach((row) => {
                        let rowQuery1 =
                          "insert into estimateRow select null as id," +
                          result1.insertId +
                          " as estID,name,description,isMatList,qty,tax,unitPrice,discount,sequence from estimateRow where id=" +
                          row.id;
                        DBConnection.executeQuery(rowQuery1, (err, result4) => {
                          if (err) {
                            ResponseMaker.sendInternalError(res);
                          } else {
                            let matQuery =
                              "insert into estimatMatRow select null as id," +
                              result4.insertId +
                              " as rowID,name,shortKey,unitType,unitPrice,units,margin,sellingPrice from estimatMatRow  where rowID=" +
                              row.id;
                            DBConnection.executeQuery(
                              matQuery,
                              (err, result5) => {
                                if (err) {
                                  ResponseMaker.sendInternalError(res);
                                }
                              }
                            );
                          }
                        });
                      });
                    }
                    ResponseMaker.customResponse(res, { status: "success" });
                  }
                });
              }
            });
          }
        });
      });
  }

  function changeStatusAndAddActivity(
    res,
    IDs,
    event,
    username,
    dateTime,
    activity
  ) {
    let updtQuery =
      "UPDATE estimations set status='" +
      event +
      "' WHERE estID in (" +
      IDs +
      ")";
    DBConnection.executeQuery(updtQuery, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        IDs.toString()
          .split(",")
          .map((m) => parseInt(m))
          .forEach((id) => {
            if (activity) {
              let actQuery =
                "INSERT INTO `est_activity` (`estID`, `name`, `created`, `activity`) VALUES ('" +
                id +
                "', '" +
                username +
                "', '" +
                dateTime +
                "', '" +
                activity +
                "')";
              DBConnection.executeQuery(actQuery, (err, result) => {});
            }

            let tID = "est" + id;
            var history =
              "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" +
              tID +
              "', 'Changed to " +
              event +
              "', '" +
              dateTime +
              "', '" +
              username +
              "')";
            DBConnection.executeQuery(history, (err, resultH) => {});
          });
      }
      ResponseMaker.customResponse(res, { status: "success" });
    });
  }

  function handleDataUpdationWithMultipleColumn(res, data) {
    let part1 = "update " + data.tableName;
    let part3 = " where " + data.key + "=" + data.keyValue;
    let part2 = " set";
    data.props.forEach((d, i) => {
      part2 = part2 + " " + d.name + "='" + d.value + "' ";
      if (i != data.props.length - 1) {
        part2 = part2 + ",";
      }
    });

    DBConnection.executeQuery(part1 + part2 + part3, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        ResponseMaker.customResponse(res, { status: "success" });
      }
    });
  }

  function handleDataUpdation(res, data) {
    let query =
      "update " +
      data.tableName +
      " set " +
      data.column +
      "='" +
      data.value +
      "' where " +
      data.key +
      "=" +
      data.keyValue;

    DBConnection.executeQuery(query, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        ResponseMaker.customResponse(res, { status: "success" });
      }
    });
  }
  return app;
};
