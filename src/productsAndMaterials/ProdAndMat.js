const express = require("express");
module.exports = () => {
    var app = express();
    var DBConnection = require("../helpers/DBConnection");
    var ResponseMaker = require("../helpers/ResponseMaker");
    var moment = require('moment-timezone');

    app.get("/getpnm", async (req, res) => {
        var query = "select * from  pnm where orgID=" + req.query.orgID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });


    app.get("/getVendors", async (req, res) => {
        var query = "SELECT * FROM `pnm_vendors` WHERE prodID=" + req.query.prodID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/categories", async (req, res) => {
        var query = "SELECT * FROM `pnm_category`";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/postCategory", (req, res) => {
        var query = "INSERT INTO `pnm_category` (`catname`) VALUES ('" + req.body.name + "')";
        if (req.body.isEditable) {
            query = "update `pnm_category` set catname='" + req.body.name + "' where catID=" + req.body.id;
        }
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/deleteCategory", (req, res) => {
        var query = "delete from `pnm_category` where catID=" + req.body.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    });


    app.get("/units", async (req, res) => {
        var query = "SELECT * FROM `pnm_unit_types`";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/postUnit", (req, res) => {
        var query = "INSERT INTO `pnm_unit_types` (`unitname`) VALUES ('" + req.body.name + "')";
        if (req.body.isEditable) {
            query = "update `pnm_unit_types` set unitname='" + req.body.name + "' where unitID=" + req.body.id;
        }
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/deleteUnit", (req, res) => {
        var query = "delete from `pnm_unit_types` where unitID=" + req.body.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/delete-vendors", (req, res) => {
        let data=req.body;
        let query = "delete from `pnm_vendors`  WHERE `pnm_vendors`.`id` in (" + data.IDs + ")";
        let cID = "pnm" + data.prodID;
        let dateTime = moment.tz(data.timeZone).format('yy-MM-DD HH:mm:ss')
        var history = "INSERT INTO `history` (`moduleID`, `action`,`description`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Deleted Vendor(s)','" + data.vendors + "', '" + dateTime + "', '" + data.username+ "')";
        DBConnection.executeQuery(query, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                DBConnection.executeQueryAndSendResponse(res, history);
            }
        });

    })

    app.post("/delete-mat", (req, res) => {
        let query = "delete from `pnm`  WHERE `pnm`.`prodID` in (" + req.body.IDs + ")";
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/add-vendor", (req, res) => {
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let vendor = req.body;
        var query = "INSERT INTO `pnm_vendors` (`prodID`, `vendorName`, `vendorPrice`, `vendorCode`,`lastUpdate`, `updatedBy`) VALUES ('" + vendor.prodID + "', '" + vendor.vendorName + "', '" + vendor.vendorPrice + "', '" + vendor.vendorCode + "','" + dateTime + "', '" + vendor.updatedBy + "')";
        DBConnection.executeQuery(query, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {

                let cID = "pnm" + vendor.prodID;
                var history = "INSERT INTO `history` (`moduleID`, `action`,`description`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Added Vendor','" + vendor.vendorName + "', '" + dateTime + "', '" + vendor.updatedBy + "')";
                DBConnection.executeQuery(history, (err, result5) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        ResponseMaker.customResponse(res, result1);
                    }
                })
            }
        })
    });

    app.post("/update-vendor", (req, res) => {
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let vendor = req.body;
        var query = "UPDATE `pnm_vendors` SET `vendorName` = '"+vendor.vendorName+"', `vendorPrice` = '"+vendor.vendorPrice+"', `vendorCode` = '"+vendor.vendorCode+"', `lastUpdate` = '"+dateTime+"', `updatedBy` = '"+vendor.updatedBy+"' WHERE `pnm_vendors`.`id` = "+vendor.id;
        DBConnection.executeQuery(query, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {

                let cID = "pnm" + vendor.prodID;
                var history = "INSERT INTO `history` (`moduleID`, `action`,`description`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Edited Vendor','" + vendor.vendorName + "', '" + dateTime + "', '" + vendor.updatedBy + "')";
                DBConnection.executeQuery(history, (err, result5) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        ResponseMaker.customResponse(res, result1);
                    }
                })
            }
        })
    });

    app.post("/update-note", (req, res) => {
        let data=req.body;
        var query="";
        if(data.type==="mat"){
            query="UPDATE `pnm` SET `notes` = '"+data.note+"' WHERE `pnm`.`prodID` = "+data.id;
        }else if(data.type==="vendor"){
            query="UPDATE `pnm_vendors` SET `notes` = '"+data.note+"' WHERE `pnm_vendors`.`id` = "+data.id;
        }
        DBConnection.executeQueryAndSendResponse(res, query);

    })

    app.post("/update-pnm", (req, res) => {
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let pnm = req.body;
        var query = "UPDATE `pnm` SET `category` = '" + pnm.category + "', `shotKey` = '" + pnm.shotKey + "', `itemName` = '" + pnm.itemName + "', `itemDesc` = '" + pnm.itemDesc + "', `unitPrice` = '" + pnm.unitPrice + "', `unitType` = '" + pnm.unitType + "', `sellingPercentage` = '" + pnm.sellingPercentage + "', `reduceLimit` = '" + pnm.reduceLimit + "', `fixedSellingPrice` = '" + pnm.fixedSellingPrice + "', `reduceLimitAmount` = '" + pnm.reduceLimitAmount + "', `notes` = '" + pnm.notes + "', `sellingPrice` = '" + pnm.sellingPrice + "', `lastUpdate` = '" + dateTime + "', `updatedBy` = '" + pnm.updatedBy + "', `marginType` = '" + pnm.marginType + "' WHERE `pnm`.`prodID` = " + pnm.prodID

        DBConnection.executeQuery(query, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                let cID = "pnm" + pnm.prodID;
                var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Edited', '" + dateTime + "', '" + pnm.updatedBy + "')";
                DBConnection.executeQuery(history, (err, result5) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        ResponseMaker.customResponse(res, result1)
                    }
                })
            }
        })

    })



    app.post("/create-pnm", (req, res) => {
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let { pnm, vendor } = req.body;
        let refNum = "select lpad(max(materialSeries)+1, 4, '0') as ref from (SELECT s.materialSeries from series s where orgID=" + pnm.orgID + " UNION SELECT '0000' as materialSeries UNION  SELECT max(t.refNum) as  materialSeries from pnm t WHERE orgID=" + pnm.orgID + ") s";
        let refText = "SELECT s.materialPrefix from series s where orgID=" + pnm.orgID + " UNION SELECT 'PM-' as materialPrefix LIMIT 1"

        let pnmQuery = "INSERT INTO `pnm` (`orgID`, `refNum`, `refText`, `category`, `shotKey`, `itemName`, `itemDesc`, `unitPrice`, `unitType`, `sellingPercentage`, `reduceLimit`, `fixedSellingPrice`, `reduceLimitAmount`, `notes`, `sellingPrice`, `lastUpdate`, `updatedBy`, `marginType`) VALUES ('" + pnm.orgID + "',(" + refNum + "),(" + refText + "), '" + pnm.category + "', '" + pnm.shotKey + "', '" + pnm.itemName + "', '" + pnm.itemDesc + "', '" + pnm.unitPrice + "', '" + pnm.unitType + "', '" + pnm.sellingPercentage + "', '" + pnm.reduceLimit + "','" + pnm.fixedSellingPrice + "', '" + pnm.reduceLimitAmount + "', '" + pnm.notes + "', '" + pnm.sellingPrice + "', '" + dateTime + "', '" + pnm.updatedBy + "', '" + pnm.marginType + "')"

        DBConnection.executeQuery(pnmQuery, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {

                let vendorQuery = "INSERT INTO `pnm_vendors` (`prodID`, `vendorName`, `vendorPrice`, `vendorCode`, `lastUpdate`, `updatedBy`) VALUES ('" + result1.insertId + "', '" + vendor.vendorName + "', '" + vendor.vendorPrice + "', '" + vendor.vendorCode + "', '" + dateTime + "','" + pnm.updatedBy + "')";
                DBConnection.executeQuery(vendorQuery, (err, result2) => {
                    if (err) {
                        console.log(err);
                        ResponseMaker.sendInternalError(res);
                    } else {

                        let cID = "pnm" + result1.insertId;
                        var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Added', '" + dateTime + "', '" + pnm.updatedBy + "')";
                        DBConnection.executeQuery(history, (err, result5) => {
                            if (err) {
                                ResponseMaker.sendInternalError(res);
                            } else {
                                let customerID = "pnm" + result1.insertId;
                                if (pnm.attachments && pnm.attachments.length > 0) {
                                    pnm.attachments.forEach(element => {
                                        let attachQuery = "UPDATE `attachments` SET `moduleID` = '" + customerID + "' WHERE `attachments`.`fileID` =" + element.fileID;
                                        DBConnection.executeQuery(attachQuery, (err, result) => { });
                                    });
                                }
                                ResponseMaker.customResponse(res, { id: result1.insertId, vid:result2.insertId });

                            }
                        })


                    }
                })
            }
        })

    })






    return app;
};