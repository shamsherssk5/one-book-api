const express = require("express");
module.exports = () => {
  var app = express();
  var DBConnection = require("../helpers/DBConnection");
  var ResponseMaker = require("../helpers/ResponseMaker");
  var moment = require("moment-timezone");

  app.get("/quotes-list", (req, res) => {
    var query1 =
      "select c.*,(select GROUP_CONCAT(u.userName SEPARATOR ',') from users u where u.userID IN (SELECT l.m_id from cust_managers l where l.custID=c.custID)) as managers from  quotes c where orgID=" +
      req.query.orgID +
      " and Length(trim(c.projName))>0 and c.createdBy='" +
      req.query.username +
      "'";
    var query2 =
      "select c.*,(select GROUP_CONCAT(u.userName SEPARATOR ',') from users u where u.userID IN (SELECT l.m_id from cust_managers l where l.custID=c.custID)) as managers from  quotes c where orgID=" +
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

  app.get("/getQuote", (req, res) => {
    var query =
      "select c.*,(select GROUP_CONCAT(u.name SEPARATOR ',') from cust_contacts u where u.id IN (SELECT l.m_id from cust_managers l where l.custID=c.custID)) as managers from  quotes c where quoteID=" +
      req.query.quoteID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/quotes-mat-row", (req, res) => {
    var query =
      "select * from  quoteMatRow mat where mat.rowID=" +
      req.query.rowID +
      " and mat.units>0 and mat.unitPrice>0 order by id";
    DBConnection.executeQueryAndSendResponse(res, query);
  });
  app.get("/quotes-row", (req, res) => {
    var query =
      "select * from  quoteRow row where row.quoteID=" +
      req.query.quoteID +
      " and qty>0 and unitPrice>0 order by sequence,id";
    DBConnection.executeQueryAndSendResponse(res, query);
  });
  app.get("/latest-quote-activity", (req, res) => {
    let query =
      "(SELECT * FROM `quote_activity`  WHERE quoteID=" +
      req.query.quoteID +
      " and activity='Requested By'  ORDER By created DESC LIMIT 1) UNION (SELECT * FROM `quote_activity`  WHERE quoteID=" +
      req.query.quoteID +
      " and activity='Approved By'  ORDER By created DESC LIMIT 1)";

    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/get-latest-ref", (req, res) => {
    var query =
      "select t1.*,t2.* from ((select lpad(max(refNum)+1, 4, '0') as ref from  (SELECT '0000' as refNum UNION select max(refNum) as refNum from quotes WHERE orgID=" +
      req.query.orgID +
      ") t) t1, (SELECT 'QUO-' as refText LIMIT 1)t2)";

    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/set-opened", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let query =
      "UPDATE `quotes` SET `opened` = '" +
      dateTime +
      "' WHERE `quotes`.`quoteID` =" +
      req.body.id;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/mat-row-delete", (req, res) => {
    let query = "delete from quoteMatRow where id=" + req.body.id;
    DBConnection.executeQueryAndSendResponse(res, query);
  });
  app.post("/row-delete", (req, res) => {
    let query = "delete from quoteRow where id=" + req.body.id;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/row-copy", (req, res) => {
    let row = req.body;
    let rowQuery1 =
      "insert into quoteRow select null as id," +
      row.quoteID +
      " as quoteID,name,description,isMatList,qty,tax,unitPrice,discount,0 as sequence from quoteRow where id=" +
      row.id;
    DBConnection.executeQuery(rowQuery1, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        let matQuery =
          "insert into quoteMatRow select null as id," +
          result1.insertId +
          " as rowID,name,shortKey,unitType,unitPrice,units,margin,sellingPrice from quoteMatRow  where rowID=" +
          row.id;
        DBConnection.executeQuery(matQuery, (err, result5) => {
          if (err) {
            ResponseMaker.sendInternalError(res);
          } else {
            let selectQuery =
              "select id, shortKey,name from quoteMatRow where rowID=" +
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

  app.post("/create-initial-quote", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let est = req.body;
    let refNum =
      "select lpad(max(quoteseries)+1, 4, '0') as ref from ( SELECT '0000' as quoteseries UNION  SELECT max(t.refNum) as  quoteseries from quotes t WHERE orgID=" +
      est.orgID +
      ") s";
    let refText = "SELECT 'QUO-' as quotePrefix LIMIT 1";
    let estQuery =
      "INSERT INTO `quotes` (`orgID`, `refText`, `refNum`, `projName`, `reference`, `customer`, `contactName`, `contactEmail`, `custID`, `amount`, `status`, `additionalNotes`,`taxType`,`taxPercentage`,`currency`,`taxLabel`, `created`, `updated`, `opened`, `createdBy`) VALUES ( '" +
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
    let deleteQuery = "delete from quotes where Length(trim(projName))<=0";
    DBConnection.executeQuery(deleteQuery, (err, result) => {
      DBConnection.executeQuery(estQuery, (err, result1) => {
        if (err) {
          ResponseMaker.sendInternalError(res);
        } else {
          let rowQuery =
            "INSERT INTO `quoteRow` ( `quoteID`,`qty`,`tax`) values('" +
            result1.insertId +
            "','1','" +
            est.taxPercentage +
            "')";
          DBConnection.executeQuery(rowQuery, (err, result3) => {
            if (err) {
              ResponseMaker.sendInternalError(res);
            } else {
              let query =
                "select quoteID,refText,refNum from quotes where quoteID=" +
                result1.insertId;
              DBConnection.executeQuery(query, (err, result2) => {
                if (err) {
                  ResponseMaker.sendInternalError(res);
                } else {
                  ResponseMaker.sendOKResponse(res, {
                    quote: result2,
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
    let query = "insert into quoteMatRow (`rowID`) values (" + rowID + ")";
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
      "INSERT INTO `quoteRow` ( `quoteID`,`qty`,`tax`) values('" +
      est.quoteID +
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
    let query = "insert into quoteMatRow (`rowID`) values (" + rowID + ")";
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

  app.post("/update-quote-form", (req, res) => {
    let data = {
      tableName: "quotes",
      column: req.body.property,
      value: req.body.value,
      key: "quoteID",
      keyValue: req.body.quoteID,
    };
    handleDataUpdation(res, data);
  });

  app.post("/update-quote-row-form", (req, res) => {
    let data = {
      tableName: "quoteRow",
      column: req.body.property,
      value: req.body.value,
      key: "id",
      keyValue: req.body.id,
    };
    handleDataUpdation(res, data);
  });

  app.post("/update-quote-mat-row-form", (req, res) => {
    let data = {
      tableName: "quoteMatRow",
      key: "id",
      keyValue: req.body.id,
      props: req.body.data,
    };
    handleDataUpdationWithMultipleColumn(res, data);
  });

  app.post("/update-quote", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let est = req.body.formData;
    let estQuery =
      "update quotes set amount='" +
      est.grandTotal +
      "' ,updated='" +
      dateTime +
      "' where quoteID=" +
      est.quoteID;
    DBConnection.executeQuery(estQuery, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        let tID = "quote" + est.quoteID;
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

  app.post("/create-quote", (req, res) => {
    let dateTime = moment.tz(req.query.timeZone).format("yy-MM-DD HH:mm:ss");
    let est = req.body.formData;
    let estQuery =
      "update quotes set amount='" +
      est.grandTotal +
      "' ,updated='" +
      dateTime +
      "' where quoteID=" +
      est.quoteID;
    DBConnection.executeQuery(estQuery, (err, result1) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        let tID = "quote" + est.quoteID;
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
            let taskID = "quote" + est.quoteID;
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
      "delete from `quotes`  WHERE `quotes`.`quoteID` in (" + IDs + ")";
    DBConnection.executeQueryAndSendResponse(res, query);
  }

  function handleDuplicate(res, IDs, orgID, username, dateTime) {
    IDs.toString()
      .split(",")
      .map((m) => parseInt(m))
      .forEach((id) => {
        let estQuery =
          "INSERT INTO `quotes`  select null as quoteID,'" +
          orgID +
          "' as orgID, (SELECT 'QUO-' as quotePrefix LIMIT 1) as refText, (select lpad(max(quoteseries)+1, 4, '0') as ref from (SELECT '0000' as quoteseries UNION  SELECT max(t.refNum) as  quoteseries from quotes t WHERE orgID=" +
          orgID +
          ") s) as refNum, CONCAT(projName,'-duplicated') as projName , reference, customer, contactName, contactEmail, custID, amount, status, additionalNotes,taxType,taxPercentage,currency,taxLabel,'" +
          dateTime +
          "' as created,null as opened,null as updated,'" +
          username +
          "' as createdBy from quotes where quoteID=" +
          id;
        DBConnection.executeQuery(estQuery, (err, result1) => {
          if (err) {
            ResponseMaker.sendInternalError(res);
          } else {
            let rowQuery =
              "insert into quoteRow select null as id," +
              result1.insertId +
              " as quoteID,name,description,isMatList,qty,tax,unitPrice,discount,sequence from quoteRow where isMatList=0 and quoteID=" +
              id;
            DBConnection.executeQuery(rowQuery, (err, result2) => {
              if (err) {
                ResponseMaker.sendInternalError(res);
              } else {
                let tID = "quote" + result1.insertId;
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
                  "SELECT id FROM `quoteRow` WHERE  isMatList=1 and quoteID=" +
                  id;
                DBConnection.executeQuery(selectQuery, (err, result3) => {
                  if (err) {
                    ResponseMaker.sendInternalError(res);
                  } else {
                    if (result3 && result3.length > 0) {
                      let list = JSON.parse(JSON.stringify(result3));
                      list.forEach((row) => {
                        let rowQuery1 =
                          "insert into quoteRow select null as id," +
                          result1.insertId +
                          " as quoteID,name,description,isMatList,qty,tax,unitPrice,discount,sequence from quoteRow where id=" +
                          row.id;
                        DBConnection.executeQuery(rowQuery1, (err, result4) => {
                          if (err) {
                            ResponseMaker.sendInternalError(res);
                          } else {
                            let matQuery =
                              "insert into quoteMatRow select null as id," +
                              result4.insertId +
                              " as rowID,name,shortKey,unitType,unitPrice,units,margin,sellingPrice from quoteMatRow  where rowID=" +
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
      "UPDATE quotes set status='" + event + "' WHERE quoteID in (" + IDs + ")";
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
                "INSERT INTO `quote_activity` (`quoteID`, `name`, `created`, `activity`) VALUES ('" +
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

            let tID = "quote" + id;
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
