const express = require("express");
module.exports = () => {
    var app = express();
    var DBConnection = require("../helpers/DBConnection");
    var ResponseMaker = require("../helpers/ResponseMaker");
    var moment = require('moment-timezone');

    app.get("/getContacts", async (req, res) => {
        // await new Promise(resolve => setTimeout(resolve, 5000));
        var query = "select * from  phone_book where orgID=" + req.query.orgID + " order by creationTime desc";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/delete-contact", (req, res) => {
        let query = "delete from `phone_book`  WHERE `phone_book`.`ID` in (" + req.body.IDs + ")";
        DBConnection.executeQueryAndSendResponse(res, query);

    })

    app.post("/copy-contact-supplier", (req, res) => {
        let query = "INSERT INTO `sup_contacts` (`orgID`, `name`, `phone`, `email`) SELECT p.orgID,p.contactPerson, p.contactNumber, p.email from phone_book p WHERE p.ID in (" + req.body.IDs + ")";
        DBConnection.executeQueryAndSendResponse(res, query);

    })


    app.post("/create-phone-book", (req, res) => {
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss');
        let contact = req.body;
        let refNum = "select lpad(max(refNum)+1, 4, '0') as ref from  (SELECT '0000' as refNum UNION select max(refNum) as refNum from phone_book WHERE orgID=" + contact.orgID + ") t";
        let query = "INSERT INTO `phone_book` (`orgID`,`refNum`, `companyName`, `contactPerson`, `contactNumber`, `keyWords`, `createdBy`, `creationTime`, `email`, `address`) VALUES ('" + contact.orgID + "', (" + refNum + "), '" + contact.companyName + "', '" + contact.contactPerson + "', '" + contact.contactNumber + "','" + contact.keyWords + "', '" + contact.assignee + "', '" + dateTime + "', '" + contact.email + "', '" + contact.address + "')";
        DBConnection.executeQuery(query, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {

                let cID = "phonebook" + result1.insertId;
                var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Added', '" + dateTime + "', '" + contact.assignee + "')";
                DBConnection.executeQuery(history, (err, result5) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        let customerID = "phonebook" + result1.insertId;
                        if (contact.attachments && contact.attachments.length > 0) {
                            contact.attachments.forEach(element => {
                                let attachQuery = "UPDATE `attachments` SET `moduleID` = '" + customerID + "' WHERE `attachments`.`fileID` =" + element.fileID;
                                DBConnection.executeQuery(attachQuery, (err, result) => { });
                            });
                        }
                        ResponseMaker.customResponse(res, result1);
                    }
                })
            }

        })
    })

    app.post("/update-phone-book", (req, res) => {
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss');
        let contact = req.body;
        let editQuery = "UPDATE `phone_book` SET `companyName` = '" + contact.companyName + "', `contactPerson` = '" + contact.contactPerson + "', `contactNumber` = '" + contact.contactNumber + "', `keyWords` = '" + contact.keyWords + "', `email` = '" + contact.email + "', `address` = '" + contact.address + "' WHERE `phone_book`.`ID` =" + contact.ID;
        var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('phonebook" + contact.ID + "', 'Edited', '" + dateTime + "', '" + contact.assignee + "')"
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

                })
            }
        })

    })


    app.post("/update-rating", (req, res) => {
        let query = "UPDATE `phone_book` SET `rating` = '" + req.body.rating + "' WHERE `phone_book`.`ID` =" + req.body.ID;

        DBConnection.executeQuery(query, (err, result) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                ResponseMaker.customResponse(res, result);
            }
        })
    })

    app.post("/update-category", (req, res) => {
        let query = "UPDATE `phone_book` SET `category` = '" + req.body.category + "' WHERE `phone_book`.`ID` in (" + req.body.IDs +")";

        DBConnection.executeQuery(query, (err, result) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                ResponseMaker.customResponse(res, result);
            }
        })
    })


    return app;
};
