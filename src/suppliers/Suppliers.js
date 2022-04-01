const express = require('express');
module.exports = () => {
    var app = express();
    var DBConnection = require('../helpers/DBConnection');
    var ResponseMaker = require('../helpers/ResponseMaker');
    var moment=require('moment-timezone');

    app.get("/suppliers-list", (req, res) => {
        var query = "select c.* from  suppliers c where orgID=" + req.query.orgID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/sup-financial", (req, res) => {
        var query = "select * from sup_financial where supID=" + req.query.ID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });


    app.post("/create-contact", (req, res) => {
        let contact = req.body;
        let query = "INSERT INTO `sup_contacts` (`orgID`, `name`, `profession`, `phone`, `email`) VALUES ('" + contact.orgID + "', '" + contact.name + "', '" + contact.profession + "', '" + contact.phone + "', '" + contact.email + "')";
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/update-contact", (req, res) => {
        let contact = req.body;
        let query = "UPDATE `sup_contacts` SET `name` = '" + contact.name + "', `profession` = '" + contact.profession + "', `phone` = '" + contact.phone + "', `email` = '" + contact.email + "' WHERE `sup_contacts`.`id` = " + contact.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/delete-contact", (req, res) => {
        let query = "DELETE FROM `sup_contacts` WHERE `sup_contacts`.`id` =" + req.body.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.get("/suppliers-contact-list", (req, res) => {
        var query = "select * from  sup_contacts where orgID=" + req.query.orgID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });





    app.get("/sup-notes", (req, res) => {
        var query = "select * from sup_notes where supID=" + req.query.ID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });


    app.post("/create-note", (req, res) => {
        let note = req.body;
        let query = "INSERT INTO `sup_notes` (`supID`, `note`, `created_by`, `note_time`) VALUES ('" + note.supID + "', '" + note.note + "', '" + note.created_by + "', '"+note.note_time+"')";
        DBConnection.executeQueryAndSendResponse(res, query);
    })


    app.post("/update-note", (req, res) => {
        let note = req.body;
        let query = "UPDATE `sup_notes` SET `note` = '" + note.note + "' WHERE `sup_notes`.`id` = " + note.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })


    app.post("/delete-note", (req, res) => {
        let query = "DELETE FROM `sup_notes` WHERE `sup_notes`.`id` =" + req.body.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.get("/sup-reminders", (req, res) => {
        var query = "select * from sup_reminders where supID=" + req.query.ID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });


    app.post("/create-reminder", (req, res) => {
        let reminder = req.body;
        let query = "INSERT INTO `sup_reminders` (`supID`, `created_by`, `created_date`, `rem_date`, `rem_employee`, `description`) VALUES ('" + reminder.supID + "', '" + reminder.created_by + "', '"+reminder.created_date+"', '" + reminder.rem_date + "', '" + reminder.rem_employee + "', '" + reminder.description + "')";
        DBConnection.executeQueryAndSendResponse(res, query);
    })


    app.post("/update-reminder", (req, res) => {
        let reminder = req.body;
        let query = "UPDATE `sup_reminders` SET `rem_date` = '" + reminder.rem_date + "', `rem_employee` = '" + reminder.rem_employee + "', `description` = '" + reminder.description + "' WHERE `sup_reminders`.`id` =" + reminder.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/delete-reminder", (req, res) => {
        let query = "DELETE FROM `sup_reminders` WHERE `sup_reminders`.`id` =" + req.body.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/update-supplier-category", (req, res) => {
        let query = "UPDATE `suppliers` SET `category` = '" + req.body.category + "' WHERE `suppliers`.`supID` in (" + req.body.supIDs + ")";
        DBConnection.executeQueryAndSendResponse(res, query);

    })

    app.post("/delete-supplier", (req, res) => {
        let query = "delete from `suppliers`  WHERE `suppliers`.`supID` in (" + req.body.IDs + ")";
        DBConnection.executeQueryAndSendResponse(res, query);

    })
    app.post("/add-to-customer", (req, res) => {
        let customerDetails = req.body;
        let dateTime=moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let refNum = "select lpad(max(customersSeries)+1, 4, '0') as ref from (SELECT s.customersSeries from series s where orgID=" + customerDetails.orgID + " UNION SELECT '0000' as customersSeries UNION  SELECT max(t.refNum) as  customersSeries from customers t WHERE orgID=" + customerDetails.orgID + ") s";
        let refText = "SELECT s.customersPrefix from series s where orgID=" + customerDetails.orgID + " UNION SELECT 'CUST-' as customersPrefix LIMIT 1";
        let customerQuery = "INSERT INTO `customers` ( `orgID`, `refNum`, `refText`, `custName`, `businessType`, `address`, `country`, `state`, `emailAccounts`, `phone`, `created_date`)  select " + customerDetails.orgID + " as orgID ,(" + refNum + ") as refNum,(" + refText + ") as refText, custName, businessType, address, country, state, emailAccounts, phone, timestamp('"+dateTime+"') as created_date from suppliers where supID=" + customerDetails.supID;

        DBConnection.executeQuery(customerQuery, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                let financialQuery = "INSERT INTO `cust_financial` (`custID`, `orgID`, `f_license_number`, `f_expiry_date`, `f_vat_reg_num`, `f_credit_limit`, `f_credit_period`, `f_contact_person`, `f_email`, `f_phone`) select " + result1.insertId + " as custID," + customerDetails.orgID + " as orgID, f_license_number, f_expiry_date, f_vat_reg_num, f_credit_limit, f_credit_period, f_contact_person, f_email, f_phone from sup_financial where supID=" + customerDetails.supID;

                DBConnection.executeQuery(financialQuery, (err, result2) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        let invoiceQuery = "INSERT INTO `cust_address` (`custID`, `address`, `country`, `state`, `email`, `phone`, `type`) VALUES ('" + result1.insertId + "', '', '', '', '', '', 'Invoice')";
                        DBConnection.executeQuery(invoiceQuery, (err, result3) => {
                            if (err) {
                                ResponseMaker.sendInternalError(res);
                            } else {
                                let deliveryQuery = "INSERT INTO `cust_address` (`custID`, `address`, `country`, `state`, `email`, `phone`, `type`) VALUES ('" + result1.insertId + "', '', '', '', '', '', 'Delivery')";
                                DBConnection.executeQuery(deliveryQuery, (err, result4) => {
                                    if (err) {
                                        ResponseMaker.sendInternalError(res);
                                    } else {
                                        let cID = "customer" + result1.insertId;
                                        var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Added', '"+dateTime+"', '" + customerDetails.assignee + "')";
                                        DBConnection.executeQuery(history, (err, result5) => {
                                            if (err) {
                                                ResponseMaker.sendInternalError(res);
                                            } else {
                                                ResponseMaker.sendOKResponse(res, result1);
                                            }
                                        })
                                    }
                                })

                            }
                        })
                    }
                })
            }
        })

    })

    app.post("/create-supplier", (req, res) => {
        let dateTime=moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let { customerDetails, customerFinance } = req.body;
        let refNum = "select lpad(max(suppliersSeries)+1, 4, '0') as ref from (SELECT s.suppliersSeries from series s where orgID=" + customerDetails.orgID + " UNION SELECT '0000' as customersSeries UNION  SELECT max(t.refNum) as  customersSeries from suppliers t WHERE orgID=" + customerDetails.orgID + ") s";
        let refText = "SELECT s.suppliersPrefix from series s where orgID=" + customerDetails.orgID + " UNION SELECT 'SUP-' as suppliersPrefix LIMIT 1"

        let customerQuery = "INSERT INTO `suppliers` ( `orgID`, `refNum`, `refText`, `custName`, `businessType`, `address`, `country`, `state`, `emailAccounts`, `phone`, `created_date`) VALUES ('" + customerDetails.orgID + "',(" + refNum + "),(" + refText + "), '" + customerDetails.custName + "', '" + customerDetails.businessType + "', '" + customerDetails.address + "', '" + customerDetails.country + "', '" + customerDetails.state + "', '" + customerDetails.emailAccounts + "', '" + customerDetails.phone + "', '" + customerDetails.created_date+ "')"

        DBConnection.executeQuery(customerQuery, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                let noteQuery = "INSERT INTO `sup_notes` (`supID`, `note`, `created_by`, `note_time`) VALUES ('" + result1.insertId + "', '" + customerDetails.notee + "', '" + customerDetails.assignee + "', '"+dateTime+"')"
                DBConnection.executeQuery(noteQuery, (err, result0) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        let financialQuery = "INSERT INTO `sup_financial` (`supID`, `orgID`, `f_license_number`, `f_expiry_date`, `f_vat_reg_num`, `f_credit_limit`, `f_credit_period`, `f_contact_person`, `f_email`, `f_phone`) VALUES ('" + result1.insertId + "', '" + customerDetails.orgID + "', '" + customerFinance.f_license_number + "', '" + customerFinance.f_expiry_date + "', '" + customerFinance.f_vat_reg_num + "', '" + customerFinance.f_credit_limit + "', '" + customerFinance.f_credit_period + "', '" + customerFinance.f_contact_person + "', '" + customerFinance.f_email + "', '" + customerFinance.f_phone + "')";
                        DBConnection.executeQuery(financialQuery, (err, result2) => {
                            if (err) {
                                console.log(err);
                                ResponseMaker.sendInternalError(res);
                            } else {

                                let cID = "supplier" + result1.insertId;
                                var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Added', '"+dateTime+"', '" + customerDetails.assignee + "')";
                                DBConnection.executeQuery(history, (err, result5) => {
                                    if (err) {
                                        ResponseMaker.sendInternalError(res);
                                    } else {
                                        let customerID = "supplier" + result1.insertId;
                                        if (customerDetails.attachments && customerDetails.attachments.length > 0) {
                                            customerDetails.attachments.forEach(element => {
                                                let attachQuery = "UPDATE `attachments` SET `moduleID` = '" + customerID + "' WHERE `attachments`.`fileID` =" + element.fileID;
                                                DBConnection.executeQuery(attachQuery, (err, result) => { });
                                            });
                                        }
                                        ResponseMaker.customResponse(res, { supID: result1.insertId, noteID: result0.insertId });
                                    }
                                })

                            }
                        })


                    }
                })
            }
        })

    })


    app.post("/update-supplier", (req, res) => {
        let dateTime=moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let { customerDetails, customerFinance } = req.body;

        let customerUpdateQuery = "UPDATE `suppliers` SET `custName` = '" + customerDetails.custName + "', `businessType` = '" + customerDetails.businessType + "', `address` = '" + customerDetails.address + "', `country` = '" + customerDetails.country + "', `state` = '" + customerDetails.state + "', `emailAccounts` = '" + customerDetails.emailAccounts + "', `phone` = '" + customerDetails.phone + "' WHERE `suppliers`.`supID` =" + customerDetails.supID;

        let financeUpdateQuery = "UPDATE `sup_financial` SET `f_license_number` = '" + customerFinance.f_license_number + "', `f_expiry_date` = '" + customerFinance.f_expiry_date + "', `f_vat_reg_num` = '" + customerFinance.f_vat_reg_num + "', `f_credit_limit` = '" + customerFinance.f_credit_limit + "', `f_credit_period` = '" + customerFinance.f_credit_period + "', `f_contact_person` = '" + customerFinance.f_contact_person + "', `f_email` = '" + customerFinance.f_email + "', `f_phone` = '" + customerFinance.f_phone + "' WHERE `sup_financial`.`id` =" + customerFinance.id;

        var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('supplier" + customerDetails.supID + "', 'Edited', '"+dateTime+"', '" + customerDetails.assignee + "')"

        DBConnection.executeQuery(customerUpdateQuery, (err, result1) => {

            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {

                DBConnection.executeQuery(financeUpdateQuery, (err, result) => {

                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {

                        DBConnection.executeQuery(history, (err, result) => {

                            if (err) {
                                ResponseMaker.sendInternalError(res);
                            } else {
                                ResponseMaker.customResponse(res, result1)
                            }
                        })
                    }
                })

            }
        })

    })

    return app;


}   