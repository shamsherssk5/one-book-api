const express = require('express');
module.exports = () => {
    var app = express();
    var DBConnection = require('../helpers/DBConnection');
    var ResponseMaker = require('../helpers/ResponseMaker');
    var moment = require('moment-timezone');

    app.get("/customers-list", (req, res) => {
        var query = "select c.*,(select GROUP_CONCAT(u.name SEPARATOR ',') from cust_contacts u where u.id IN (SELECT l.m_id from cust_managers l where l.custID=c.custID)) as managers from  customers c where orgID=" + req.query.orgID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/cust-notes", (req, res) => {
        var query = "select * from cust_notes where custID=" + req.query.ID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/cust-financial", (req, res) => {
        var query = "select * from cust_financial where custID=" + req.query.ID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/cust-address", (req, res) => {
        var query = "select * from cust_address where type='" + req.query.type + "' and custID=" + req.query.ID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/cust-reminders", (req, res) => {
        var query = "select * from cust_reminders where custID=" + req.query.ID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/customers-contact-list", (req, res) => {
        var query = "select * from  cust_contacts where orgID=" + req.query.orgID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });


    app.post("/create-contact", (req, res) => {
        let contact = req.body;
        let query = "INSERT INTO `cust_contacts` (`orgID`, `name`, `profession`, `phone`, `email`) VALUES ('" + contact.orgID + "', '" + contact.name + "', '" + contact.profession + "', '" + contact.phone + "', '" + contact.email + "')";
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/create-note", (req, res) => {
        let note = req.body;
        let query = "INSERT INTO `cust_notes` (`custID`, `note`, `created_by`, `note_time`) VALUES ('" + note.custID + "', '" + note.note + "', '" + note.created_by + "', '" + note.note_time + "')";
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/create-reminder", (req, res) => {
        let reminder = req.body;
        let query = "INSERT INTO `cust_reminders` (`custID`, `created_by`, `created_date`, `rem_date`, `rem_employee`, `description`) VALUES ('" + reminder.custID + "', '" + reminder.created_by + "', '" + reminder.created_date + "', '" + reminder.rem_date + "', '" + reminder.rem_employee + "', '" + reminder.description + "')";
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/update-contact", (req, res) => {
        let contact = req.body;
        let query = "UPDATE `cust_contacts` SET `name` = '" + contact.name + "', `profession` = '" + contact.profession + "', `phone` = '" + contact.phone + "', `email` = '" + contact.email + "' WHERE `cust_contacts`.`id` = " + contact.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/update-note", (req, res) => {
        let note = req.body;
        let query = "UPDATE `cust_notes` SET `note` = '" + note.note + "' WHERE `cust_notes`.`id` = " + note.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/update-reminder", (req, res) => {
        let reminder = req.body;
        let query = "UPDATE `cust_reminders` SET `rem_date` = '" + reminder.rem_date + "', `rem_employee` = '" + reminder.rem_employee + "', `description` = '" + reminder.description + "' WHERE `cust_reminders`.`id` =" + reminder.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/update-customer-category", (req, res) => {
        let query = "UPDATE `customers` SET `category` = '" + req.body.category + "' WHERE `customers`.`custID` in (" + req.body.custIDs + ")";
        DBConnection.executeQueryAndSendResponse(res, query);

    })

    app.post("/delete-contact", (req, res) => {
        let query = "DELETE FROM `cust_contacts` WHERE `cust_contacts`.`id` =" + req.body.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/delete-note", (req, res) => {
        let query = "DELETE FROM `cust_notes` WHERE `cust_notes`.`id` =" + req.body.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/delete-customer", (req, res) => {
        let query = "delete from `customers`  WHERE `customers`.`custID` in (" + req.body.IDs + ")";
        DBConnection.executeQueryAndSendResponse(res, query);

    })

    app.post("/delete-reminder", (req, res) => {
        let query = "DELETE FROM `cust_reminders` WHERE `cust_reminders`.`id` =" + req.body.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })


    app.post("/add-to-supplier", (req, res) => {
        let customerDetails = req.body;
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let refNum = "select lpad(max(suppliersSeries)+1, 4, '0') as ref from (SELECT s.suppliersSeries from series s where orgID=" + customerDetails.orgID + " UNION SELECT '0000' as customersSeries UNION  SELECT max(t.refNum) as  customersSeries from suppliers t WHERE orgID=" + customerDetails.orgID + ") s";
        let refText = "SELECT s.suppliersPrefix from series s where orgID=" + customerDetails.orgID + " UNION SELECT 'SUP-' as suppliersPrefix LIMIT 1"
        let customerQuery = "INSERT INTO `suppliers` ( `orgID`, `refNum`, `refText`, `custName`, `businessType`, `address`, `country`, `state`, `emailAccounts`, `phone`, `created_date`)  select " + customerDetails.orgID + " as orgID ,(" + refNum + ") as refNum,(" + refText + ") as refText, custName, businessType, address, country, state, emailAccounts, phone, timestamp('" + dateTime + "') as created_date from customers where custID=" + customerDetails.custID;

        DBConnection.executeQuery(customerQuery, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                let financialQuery = "INSERT INTO `sup_financial` (`supID`, `orgID`, `f_license_number`, `f_expiry_date`, `f_vat_reg_num`, `f_credit_limit`, `f_credit_period`, `f_contact_person`, `f_email`, `f_phone`) select " + result1.insertId + " as supID," + customerDetails.orgID + " as orgID, f_license_number, f_expiry_date, f_vat_reg_num, f_credit_limit, f_credit_period, f_contact_person, f_email, f_phone from cust_financial where custID=" + customerDetails.custID;

                DBConnection.executeQuery(financialQuery, (err, result2) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {

                        let cID = "supplier" + result1.insertId;
                        var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Added', '" + dateTime + "', '" + customerDetails.assignee + "')";
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

    })

    app.post("/update-customer", (req, res) => {
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')

        let { customerDetails, customerFinance, invoiceAddress, deliveryAddress } = req.body;

        let customerUpdateQuery = "UPDATE `customers` SET `custName` = '" + customerDetails.custName + "', `businessType` = '" + customerDetails.businessType + "', `address` = '" + customerDetails.address + "', `country` = '" + customerDetails.country + "', `state` = '" + customerDetails.state + "', `emailAccounts` = '" + customerDetails.emailAccounts + "', `phone` = '" + customerDetails.phone + "' WHERE `customers`.`custID` =" + customerDetails.custID;

        let deleteManagers = "delete from cust_managers where custID=" + customerDetails.custID;

        let mangerQuery = "INSERT INTO `cust_managers` (`custID`, `m_id`) VALUES ?"

        let invoiceUpdateQuery = "UPDATE `cust_address` SET `address` = '" + invoiceAddress.address + "', `country` = '" + invoiceAddress.country + "', `state` = '" + invoiceAddress.state + "', `email` = '" + invoiceAddress.email + "', `phone` = '" + invoiceAddress.phone + "' WHERE `cust_address`.`id` =" + invoiceAddress.id;

        let deliveryUpdateQuery = "UPDATE `cust_address` SET `address` = '" + deliveryAddress.address + "', `country` = '" + deliveryAddress.country + "', `state` = '" + deliveryAddress.state + "', `email` = '" + deliveryAddress.email + "', `phone` = '" + deliveryAddress.phone + "' WHERE `cust_address`.`id` =" + deliveryAddress.id;

        let financeUpdateQuery = "UPDATE `cust_financial` SET `f_license_number` = '" + customerFinance.f_license_number + "', `f_expiry_date` = '" + customerFinance.f_expiry_date + "', `f_vat_reg_num` = '" + customerFinance.f_vat_reg_num + "', `f_credit_limit` = '" + customerFinance.f_credit_limit + "', `f_credit_period` = '" + customerFinance.f_credit_period + "', `f_contact_person` = '" + customerFinance.f_contact_person + "', `f_email` = '" + customerFinance.f_email + "', `f_phone` = '" + customerFinance.f_phone + "' WHERE `cust_financial`.`id` =" + customerFinance.id;

        var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('customer" + customerDetails.custID + "', 'Edited', '" + dateTime + "', '" + customerDetails.assignee + "')"

        DBConnection.executeQuery(customerUpdateQuery, (err, result1) => {

            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {

                DBConnection.executeQuery(deleteManagers, (err, result) => {

                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        if (customerDetails.c_managers.length <= 0) {
                            customerDetails.c_managers = [{ id: 0 }];
                        }
                        DBConnection.executeMultiple(mangerQuery, [customerDetails.c_managers.map(contact => [customerDetails.custID, contact.id])], (err, result0) => {
                            if (err) {
                                ResponseMaker.sendInternalError(res);
                            } else {

                                DBConnection.executeQuery(financeUpdateQuery, (err, result) => {
                                    if (err) {
                                        ResponseMaker.sendInternalError(res);
                                    } else {

                                        DBConnection.executeQuery(invoiceUpdateQuery, (err, result) => {

                                            if (err) {
                                                ResponseMaker.sendInternalError(res);
                                            } else {

                                                DBConnection.executeQuery(deliveryUpdateQuery, (err, result) => {

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

                                    }
                                })
                            }
                        })
                    }
                })
            }

        });


    })

    app.post("/create-customer", (req, res) => {
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let { customerDetails, customerFinance, invoiceAddress, deliveryAddress } = req.body;
        let refNum = "select lpad(max(customersSeries)+1, 4, '0') as ref from (SELECT s.customersSeries from series s where orgID=" + customerDetails.orgID + " UNION SELECT '0000' as customersSeries UNION  SELECT max(t.refNum) as  customersSeries from customers t WHERE orgID=" + customerDetails.orgID + ") s";
        let refText = "SELECT s.customersPrefix from series s where orgID=" + customerDetails.orgID + " UNION SELECT 'CUST-' as customersPrefix LIMIT 1"

        let customerQuery = "INSERT INTO `customers` ( `orgID`, `refNum`, `refText`, `custName`, `businessType`, `address`, `country`, `state`, `emailAccounts`, `phone`, `created_date`) VALUES ('" + customerDetails.orgID + "',(" + refNum + "),(" + refText + "), '" + customerDetails.custName + "', '" + customerDetails.businessType + "', '" + customerDetails.address + "', '" + customerDetails.country + "', '" + customerDetails.state + "', '" + customerDetails.emailAccounts + "', '" + customerDetails.phone + "', '" + customerDetails.created_date + "')"

        DBConnection.executeQuery(customerQuery, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                if (customerDetails.c_managers.length <= 0) {
                    customerDetails.c_managers = [{ id: 0 }];
                }
                let mangerQuery = "INSERT INTO `cust_managers` (`custID`, `m_id`) VALUES ?"
                DBConnection.executeMultiple(mangerQuery, [customerDetails.c_managers.map(contact => [result1.insertId, contact.id])], (err, result0) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        let financialQuery = "INSERT INTO `cust_financial` (`custID`, `orgID`, `f_license_number`, `f_expiry_date`, `f_vat_reg_num`, `f_credit_limit`, `f_credit_period`, `f_contact_person`, `f_email`, `f_phone`) VALUES ('" + result1.insertId + "', '" + customerDetails.orgID + "', '" + customerFinance.f_license_number + "', '" + customerFinance.f_expiry_date + "', '" + customerFinance.f_vat_reg_num + "', '" + customerFinance.f_credit_limit + "', '" + customerFinance.f_credit_period + "', '" + customerFinance.f_contact_person + "', '" + customerFinance.f_email + "', '" + customerFinance.f_phone + "')";
                        DBConnection.executeQuery(financialQuery, (err, result2) => {
                            if (err) {
                                ResponseMaker.sendInternalError(res);
                            } else {
                                let invoiceQuery = "INSERT INTO `cust_address` (`custID`, `address`, `country`, `state`, `email`, `phone`, `type`) VALUES ('" + result1.insertId + "', '" + invoiceAddress.address + "', '" + invoiceAddress.country + "', '" + invoiceAddress.state + "', '" + invoiceAddress.email + "', '" + invoiceAddress.phone + "', 'Invoice')";
                                DBConnection.executeQuery(invoiceQuery, (err, result3) => {
                                    if (err) {
                                        ResponseMaker.sendInternalError(res);
                                    } else {
                                        let deliveryQuery = "INSERT INTO `cust_address` (`custID`, `address`, `country`, `state`, `email`, `phone`, `type`) VALUES ('" + result1.insertId + "', '" + deliveryAddress.address + "', '" + deliveryAddress.country + "', '" + deliveryAddress.state + "', '" + deliveryAddress.email + "', '" + deliveryAddress.phone + "', 'Delivery')";
                                        DBConnection.executeQuery(deliveryQuery, (err, result4) => {
                                            if (err) {
                                                ResponseMaker.sendInternalError(res);
                                            } else {
                                                let cID = "customer" + result1.insertId;
                                                var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Added', '" + dateTime + "', '" + customerDetails.assignee + "')";
                                                DBConnection.executeQuery(history, (err, result5) => {
                                                    if (err) {
                                                        ResponseMaker.sendInternalError(res);
                                                    } else {
                                                        let customerID = "customer" + result1.insertId;
                                                        if (customerDetails.attachments && customerDetails.attachments.length > 0) {
                                                            customerDetails.attachments.forEach(element => {
                                                                let attachQuery = "UPDATE `attachments` SET `moduleID` = '" + customerID + "' WHERE `attachments`.`fileID` =" + element.fileID;
                                                                DBConnection.executeQuery(attachQuery, (err, result) => { });
                                                            });
                                                        }
                                                        ResponseMaker.customResponse(res, result1);
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
            }
        })

    });




    return app;

}   