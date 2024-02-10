const express = require('express');
module.exports = () => {
    var app = express();
    var DBConnection = require('../helpers/DBConnection');
    var ResponseMaker = require('../helpers/ResponseMaker');
    var moment = require('moment-timezone');

    app.get("/remTypes", (req, res) => {
        var query = "select * from rem_types";
        DBConnection.executeQueryAndSendResponse(res, query);

    });

    app.get("/get-reminders", (req, res) => {
        var query = "SELECT t.*, (select GROUP_CONCAT(u.userName SEPARATOR ',') from users u where u.userID IN (SELECT l.userID from rem_assigned l where l.remID=t.id)) as userNames,(SELECT count(*) from conversations c where concat('rem',t.id)=c.moduleID) as messages, (SELECT count(*) from attachments a where concat('rem',t.id)=a.moduleID) as attachmentsCount FROM reminders t where t.orgID=" + req.query.orgID + " order by t.created_date DESC";
        DBConnection.executeQueryAndSendResponse(res, query);

    });

    app.get("/contacts", (req, res) => {
        var query = "SELECT * FROM rem_contacts where remID=" + req.query.ID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/updateRemDate", (req, res) => {
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        var query = "UPDATE `reminders` SET `remDate` = '" + req.body.remDate + "', lastUpdate='"+dateTime+"' WHERE `reminders`.`id` = " + req.body.id;
        var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('rem" + req.body.id + "', 'Reminder Date changed to " + req.body.remDate + "','" + dateTime + "', '" + req.body.assignee + "')"
        DBConnection.executeQuery(history, (err, result) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                DBConnection.executeQueryAndSendResponse(res, query);
            }
        });
    });

    app.post("/delete-rem", (req, res) => {
        let data = req.body;
        let query = "delete from `reminders`  WHERE `reminders`.`id` in (" + data.IDs + ")";
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/postReminderType", (req, res) => {
        var query = "INSERT INTO `rem_types` (`name`, `colour`) VALUES ('" + req.body.name + "', '" + req.body.color + "')";
        if (req.body.isEditable) {
            query = "update `rem_types` set name='" + req.body.name + "', colour='" + req.body.color + "' where depID=" + req.body.id;
        }
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/deleteType", (req, res) => {
        var query = "delete from `rem_types` where depID=" + req.body.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/createReminder", (req, res) => {
        let rem = req.body;
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let refNum = "select lpad(max(remSeries)+1, 4, '0') as ref from ( SELECT '0000' as remSeries UNION  SELECT max(t.refNum) as  remSeries from reminders t WHERE orgID=" + rem.orgID + ") s";
        var query = "INSERT INTO `reminders` ( `orgID`, `refText`, `refNum`, `type`, `title`, `be_fore`, `beforeType`, `inter_val`, `notes`, `assignee`, `remDate`, `remTime`, `noTime`) VALUES ('" + rem.orgID + "', 'REM', (" + refNum + "), '" + rem.type + "', '" + rem.title + "', '" + rem.be_fore + "', '" + rem.beforeType + "', '" + rem.inter_val + "', '" + rem.notes + "', '" + rem.assignee + "', '" + rem.remDate + "', '" + rem.remTime + "', '" + rem.noTime + "')";
        DBConnection.executeQuery(query, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                if (rem.assignTo && rem.assignTo.length > 0) {
                    rem.assignTo.forEach(user => {
                        let assignedQuery = "INSERT INTO `rem_assigned` (`remID`, `userID`) VALUES ('" + result1.insertId + "','" + user.userID + "')";
                        DBConnection.executeQuery(assignedQuery, (err, result) => { });
                    });
                }

                if (rem.contacts && rem.contacts.length > 0) {
                    rem.contacts.forEach(contact => {
                        let contactQuery = "INSERT INTO `rem_contacts` (`remID`, `companyName`, `contactPerson`, `email`, `phone`) VALUES ('" + result1.insertId + "', '" + contact.companyName + "', '" + contact.contactPerson + "', '" + contact.email + "', '" + contact.phone + "')";
                        DBConnection.executeQuery(contactQuery, (err, result) => { });
                    });
                }

                let tID = "rem" + result1.insertId;
                var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + tID + "', 'Added', '" + dateTime + "', '" + rem.assignee + "')";
                DBConnection.executeQuery(history, (err, result3) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        let taskID = "rem" + result1.insertId;
                        if (req.body.attachments && req.body.attachments.length > 0) {
                            req.body.attachments.forEach(element => {
                                let attachQuery = "UPDATE `attachments` SET `moduleID` = '" + taskID + "' WHERE `attachments`.`fileID` =" + element.fileID;
                                DBConnection.executeQuery(attachQuery, (err, result) => { });
                            });
                        }
                        ResponseMaker.customResponse(res, result1);
                    }
                })
            }

        })

    });

    app.post("/updateReminder", (req, res) => {
        let rem = req.body;
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let query = "UPDATE `reminders` SET `type` = '" + rem.type + "', `title` = '" + rem.title + "', `be_fore` = '" + rem.be_fore + "', `beforeType` = '" + rem.beforeType + "', `inter_val` = '" + rem.inter_val + "', `notes` = '" + rem.notes + "', `remDate` = '" + rem.remDate + "', `remTime` = '" + rem.remTime + "', `noTime` = '" + rem.noTime + "', `lastUpdate` = '" + dateTime + "' WHERE `reminders`.`id` =" + rem.id;
        let deleteAssigned = "delete from rem_assigned where remID=" + rem.id;
        let deleteContacts = "delete from rem_contacts where remID=" + rem.id;
        DBConnection.executeQuery(query, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {

                DBConnection.executeQuery(deleteAssigned, (err, result2) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        DBConnection.executeQuery(deleteContacts, (err, result3) => {
                            if (err) {
                                ResponseMaker.sendInternalError(res);
                            } else {
                                if (rem.assignTo && rem.assignTo.length > 0) {
                                    rem.assignTo.forEach(user => {
                                        let assignedQuery = "INSERT INTO `rem_assigned` (`remID`, `userID`) VALUES ('" + rem.id + "','" + user.userID + "')";
                                        DBConnection.executeQuery(assignedQuery, (err, result) => { });
                                    });
                                }

                                if (rem.contacts && rem.contacts.length > 0) {
                                    rem.contacts.forEach(contact => {
                                        let contactQuery = "INSERT INTO `rem_contacts` (`remID`, `companyName`, `contactPerson`, `email`, `phone`) VALUES ('" + rem.id + "', '" + contact.companyName + "', '" + contact.contactPerson + "', '" + contact.email + "', '" + contact.phone + "')";
                                        DBConnection.executeQuery(contactQuery, (err, result) => { });
                                    });
                                }

                                let tID = "rem" + rem.id;
                                var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + tID + "', 'Edited', '" + dateTime + "', '" + rem.assignee + "')";
                                DBConnection.executeQuery(history, (err, result3) => {
                                    if (err) {
                                        ResponseMaker.sendInternalError(res);
                                    } else {
                                        ResponseMaker.customResponse(res, {"message":"Reminder Updated Successfully"});
                                    }
                                })

                            }
                        })
                    }
                })
            }
        });
    })



    return app;
}