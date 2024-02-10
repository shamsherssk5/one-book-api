const express = require('express');
module.exports = () => {
    var app = express();
    var DBConnection = require('../helpers/DBConnection');
    var ResponseMaker = require('../helpers/ResponseMaker');
    var moment = require('moment-timezone');

    app.get("/getinventory", async (req, res) => {
        var query = "SELECT t.*,(select sum(case when m.moveType='Received'then m.qty else -m.qty end)from inv_movements m where m.invID=t.invID) as iqty,(select sum(case when m.moveType='Received'then m.total else -m.total end)from inv_movements m where m.invID=t.invID) as itotal,(SELECT m.lastUpdate from inv_movements m WHERE m.invID=t.invID ORDER by lastUpdate DESC LIMIT 1) as ilastUpdated,(SELECT count(*) from discussion e WHERE e.moduleID=concat('inv', t.invID)) as dcount  FROM `inventory` t where t.orgID=" + req.query.orgID + " order by t.lastUpdated";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/getVendors", async (req, res) => {
        var query = "SELECT * FROM `inv_movements` WHERE invID=" + req.query.invID + " order by lastUpdate desc";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/stores", (req, res) => {
        var query = "select * from  inv_stores where orgID=" + req.query.orgID;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/create-store", (req, res) => {
        let store = req.body;
        let query = "INSERT INTO `inv_stores` (`orgID`, `warehouseName`, `area`, `address`, `contactName`, `phone`) VALUES ( '" + store.orgID + "', '" + store.warehouseName + "', '" + store.area + "', '" + store.address + "', '" + store.contactName + "', '" + store.phone + "')";
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/update-store", (req, res) => {
        let store = req.body;
        let query = "UPDATE `inv_stores` SET `warehouseName` = '" + store.warehouseName + "', `area` = '" + store.area + "', `address` = '" + store.address + "', `contactName` = '" + store.contactName + "', `phone` = '" + store.phone + "' WHERE `inv_stores`.`id` = " + store.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/delete-store", (req, res) => {
        let query = "DELETE FROM `inv_stores` WHERE `inv_stores`.`id` =" + req.body.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/delete-inv", (req, res) => {
        let data = req.body;
        let query = "delete from `inventory`  WHERE `inventory`.`invID` in (" + data.IDs + ")";
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/update-menu", (req, res) => {
        let data = req.body;
        let query = "UPDATE `inventory` SET `menu` = '" + data.menu + "' WHERE `inventory`.`invID` in (" + data.IDs + ")";
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/update-expiry", (req, res) => {
        let data = req.body;
        let query = "UPDATE `inventory` SET `expiryDate` = '" + data.expDate + "' WHERE `inventory`.`invID`="+data.invID;
        query = query.replace("'null'", null);
        DBConnection.executeQueryAndSendResponse(res, query);
    })

    app.post("/delete-inv-movement", (req, res) => {
        let data = req.body;
        let query = "delete from `inv_movements`  WHERE `inv_movements`.`id` in (" + data.IDs + ")";
        let cID = "inv" + data.invID;
        let dateTime = moment.tz(data.timeZone).format('yy-MM-DD HH:mm:ss');
        var history = "INSERT INTO `history` (`moduleID`, `action`,`description`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Deleted Item(s)','#" + data.IDs + "', '" + dateTime + "', '" + data.username + "')";
        DBConnection.executeQuery(query, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                DBConnection.executeQueryAndSendResponse(res, history);
            }
        }); 
    })

    app.post("/saveItem", (req, res) => {
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let inv = req.body;
        let vendorQuery = "INSERT INTO `inv_movements` (`invID`,`moveFromTo`,`moveType`, `qty`, `total`, `location`,`rackNo`,`vendorName`, `vendorPrice`, `vendorCode`, `lastUpdate`, `updatedBy`, `notes`) VALUES ('" + inv.invID + "','" + inv.moveFromTo + "','" + inv.moveType + "','" + inv.qty + "','" + inv.total + "', '" + inv.location + "','" + inv.rackNo + "','" + inv.vendorName + "', '" + inv.vendorPrice + "', '" + inv.vendorCode + "', '" + dateTime + "','" + inv.updatedBy + "','" + inv.notes + "')";
        DBConnection.executeQuery(vendorQuery, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                let cID = 'inv' + inv.invID;
                var history = "INSERT INTO `history` (`moduleID`, `action`,`description`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Item " + inv.moveType + "','#" + result1.insertId + "', '" + dateTime + "', '" + inv.updatedBy + "')";
                DBConnection.executeQuery(history, (err, result5) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        ResponseMaker.customResponse(res, result1);
                    }
                })
            }
        })
    })

    app.post("/editItem", (req, res) => {
        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let inv = req.body;
        let vendorQuery = "UPDATE `inv_movements` SET `qty` = '" + inv.qty + "', `total` = '" + inv.total + "', `moveFromTo` = '" + inv.moveFromTo + "', `location` = '" + inv.location + "', `rackNo` = '" + inv.rackNo + "', `vendorName` = '" + inv.vendorName + "', `vendorPrice` = '" + inv.vendorPrice + "', `vendorCode` = '" + inv.vendorCode + "', `moveType` = '" + inv.moveType + "', `lastUpdate` = '" + dateTime + "', `updatedBy` = '" + inv.updatedBy + "', `notes` = '" + inv.notes + "' WHERE `inv_movements`.`id` = " + inv.id;
        DBConnection.executeQuery(vendorQuery, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                let cID = 'inv' + inv.invID;
                var history = "INSERT INTO `history` (`moduleID`, `action`,`description`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Item Updated','#" + inv.id + "', '" + dateTime + "', '" + inv.updatedBy + "')";
                DBConnection.executeQuery(history, (err, result5) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        ResponseMaker.customResponse(res, result1);
                    }
                })
            }
        })
    })


    app.post("/update-inv", (req, res) => {

        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let inv = req.body;
        let invQuery = "UPDATE `inventory` SET `category` = '"+inv.category+"', `itemName` = '"+inv.itemName+"', `productCode` = '"+inv.productCode+"', `unitType` = '"+inv.unitType+"', `vat` = '"+inv.vat+"', `notes` = '"+inv.notes+"', `updatedBy` = '"+inv.updatedBy+"', `lastUpdated` = '"+dateTime+"' WHERE `inventory`.`invID`="+inv.invID;
        DBConnection.executeQuery(invQuery, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {

                let cID = "inv" + inv.invID;
                var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Inventory Edited', '" + dateTime + "', '" + inv.updatedBy + "')";
                DBConnection.executeQuery(history, (err, result5) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        ResponseMaker.sendOKResponse(res, result1);
                    }
                })
            }
        })

    })

    app.post("/create-inv", (req, res) => {

        let dateTime = moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss')
        let { inv, vendor } = req.body;
        let refNum = "select lpad(max(inventorySeries)+1, 4, '0') as ref from (SELECT s.inventorySeries from series s where orgID=" + inv.orgID + " UNION SELECT '0000' as inventorySeries UNION  SELECT max(t.refNum) as  inventorySeries from inventory t WHERE orgID=" + inv.orgID + ") s";
        let refText = "SELECT s.inventoryPrefix from series s where orgID=" + inv.orgID + " UNION SELECT 'IN-' as inventoryPrefix LIMIT 1"; 
        let invQuery = "INSERT INTO `inventory` (`orgID`, `refNum`, `refText`, `category`, `itemName`, `productCode`, `qty`, `unitType`, `unitPrice`, `vat`, `total`, `rackNo`, `location`, `notes`, `updatedBy`, `lastUpdated`,`custName`,`menu`) VALUES ('" + inv.orgID + "',(" + refNum + "),(" + refText + "), '" + inv.category + "', '" + inv.itemName + "', '" + inv.productCode + "', '" + inv.qty + "', '" + inv.unitType + "', '" + inv.unitPrice + "', '" + inv.vat + "', '" + inv.total + "', '" + inv.rackNo + "', '" + inv.location + "', '" + inv.notes + "', '" + inv.updatedBy + "', '" + dateTime + "','" + inv.custName + "','" + inv.menu + "')";

        DBConnection.executeQuery(invQuery, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {

                let vendorQuery = "INSERT INTO `inv_movements` (`invID`, `qty`, `total`, `location`,`rackNo`,`vendorName`, `vendorPrice`, `vendorCode`, `lastUpdate`, `updatedBy`, `notes`) VALUES ('" + result1.insertId + "','" + inv.qty + "','" + inv.total + "', '" + inv.location + "','" + inv.rackNo + "','" + vendor.vendorName + "', '" + vendor.vendorPrice + "', '" + vendor.vendorCode + "', '" + dateTime + "','" + inv.updatedBy + "','" + inv.notes + "')";
                DBConnection.executeQuery(vendorQuery, (err, result2) => {
                    if (err) {
                        console.log(err);
                        ResponseMaker.sendInternalError(res);
                    } else {

                        let cID = "inv" + result1.insertId;
                        var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + cID + "', 'Added', '" + dateTime + "', '" + inv.updatedBy + "')";
                        DBConnection.executeQuery(history, (err, result5) => {
                            if (err) {
                                ResponseMaker.sendInternalError(res);
                            } else {
                                let customerID = "inv" + result1.insertId;
                                if (inv.attachments && inv.attachments.length > 0) {
                                    inv.attachments.forEach(element => {
                                        let attachQuery = "UPDATE `attachments` SET `moduleID` = '" + customerID + "' WHERE `attachments`.`fileID` =" + element.fileID;
                                        DBConnection.executeQuery(attachQuery, (err, result) => { });
                                    });
                                }
                                ResponseMaker.customResponse(res, { id: result1.insertId, vid: result2.insertId });

                            }
                        })
                    }
                })
            }
        })

    })


    return app;

}   