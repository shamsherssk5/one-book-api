const express = require("express");
module.exports = () => {
  var app = express();
  var DBConnection = require("../helpers/DBConnection");
  var ResponseMaker = require("../helpers/ResponseMaker");
  var mailer = require("../helpers/mailer");
  var jwt = require("jsonwebtoken");
  const fs = require("fs");
  var jwtSecret = JSON.parse(
    fs.readFileSync("./src//assets/jwt-token-secret.json")
  );

  app.get("/industries", (req, res) => {
    var query = "select * from  industries";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/getFinancial", (req, res) => {
    var query = "select * from  financial where orgID=" + req.query.ID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/rolesMenu", (req, res) => {
    var query =
      "SELECT m.id as m_id,m.*,r.id as r_id,r.* FROM menusList m left OUTER JOIN (SELECT * from role_access x where x.roleID=" +
      req.query.roleID +
      " and x.orgID=" +
      req.query.orgID +
      ") r on m.id=r.menuID ORDER BY m.menuOrder";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/getUsers", (req, res) => {
    var query =
      "select userID,userName,role,email,lastLoginInfo,active from  users where orgID=" +
      req.query.ID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/rolesList", (req, res) => {
    var query =
      "select * from  roles where orgID=" + req.query.ID + " or orgID is NULL";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/getLocation", (req, res) => {
    var query =
      "select * from  location where orgID=" +
      req.query.ID +
      "    UNION select * from  location where orgID=0 LIMIT 1";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/getSeries", (req, res) => {
    var query = "select * from  series where orgID=" + req.query.ID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/getOrganization", (req, res) => {
    var query = "select * from  organization where id=" + req.query.ID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/createOrganization", (req, res) => {
    var query =
      "INSERT INTO `organization` (`fullname`, `crm`, `industry`, `address`, `state`, `country`, `telnumber`, `emailId`, `licenceNo`, `registerDate`) VALUES ('" +
      req.body.fullname +
      "', '" +
      req.body.crm +
      "', '" +
      req.body.industry +
      "', '" +
      req.body.address +
      "', '" +
      req.body.state +
      "', '" +
      req.body.country +
      "', '" +
      req.body.telnumber +
      "', '" +
      req.body.emailId +
      "', '" +
      req.body.licenceNo +
      "', '" +
      req.body.registerDate +
      "')";
    DBConnection.executeQuery(query, (err, result) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        var userUpdateQuery =
          "update `users` set orgID='" +
          result.insertId +
          "',orgname='" +
          req.body.crm +
          "' where userID='" +
          req.query.userID +
          "'";
        DBConnection.executeQuery(userUpdateQuery, (err, result1) => {
          if (err) {
            ResponseMaker.sendInternalError(res);
          } else {
            ResponseMaker.customResponse(res, { id: result.insertId });
          }
        });
      }
    });
  });

  app.post("/createFinancial", (req, res) => {
    var query =
      "INSERT INTO `financial` (`taxNo`, `authority`, `taxLabal`, `currType`, `currPos`, `finYrDate`, `saleTax`, `saleTaxPer`, `purTax`, `purTaxPer`, `taxPeriod`, `orgID`) VALUES ( '" +
      req.body.taxNo +
      "', '" +
      req.body.authority +
      "', '" +
      req.body.taxLabal +
      "', '" +
      req.body.currType +
      "', '" +
      req.body.currPos +
      "', '" +
      req.body.finYrDate +
      "', '" +
      req.body.saleTax +
      "', '" +
      req.body.saleTaxPer +
      "', '" +
      req.body.purTax +
      "', '" +
      req.body.purTaxPer +
      "', '" +
      req.body.taxPeriod +
      "', '" +
      req.query.orgID +
      "')";
    DBConnection.executeQuery(query, (err, result) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        ResponseMaker.customResponse(res, { id: result.insertId });
      }
    });
  });

  app.post("/createLocation", (req, res) => {
    var query =
      "INSERT INTO `location` (`orgID`, `timeZone`, `timeFormat`, `dateFormat`) VALUES ('" +
      req.query.orgID +
      "', '" +
      req.body.timeZone +
      "', '" +
      req.body.timeFormat +
      "', '" +
      req.body.dateFormat +
      "')";
    DBConnection.executeQuery(query, (err, result) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        ResponseMaker.customResponse(res, { id: result.insertId });
      }
    });
  });

  app.post("/createSeries", (req, res) => {
    var query =
      "INSERT INTO `series` (`orgID`, `customersPrefix`, `customersSeries`, `suppliersPrefix`, `suppliersSeries`, `inventoryPrefix`, `inventorySeries`, `materialPrefix`, `materialSeries`, `tasksPrefix`, `tasksSeries`, `estimationPrefix`, `estimationSeries`) VALUES ('" +
      req.query.orgID +
      "', '" +
      req.body.customersPrefix +
      "', '" +
      req.body.customersSeries +
      "', '" +
      req.body.suppliersPrefix +
      "', '" +
      req.body.suppliersSeries +
      "', '" +
      req.body.inventoryPrefix +
      "', '" +
      req.body.inventorySeries +
      "', '" +
      req.body.materialPrefix +
      "', '" +
      req.body.materialSeries +
      "', '" +
      req.body.tasksPrefix +
      "', '" +
      req.body.tasksSeries +
      "', '" +
      req.body.estimationPrefix +
      "', '" +
      req.body.estimationSeries +
      "')";
    DBConnection.executeQuery(query, (err, result) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        ResponseMaker.customResponse(res, { id: result.insertId });
      }
    });
  });

  app.post("/addRole", (req, res) => {
    var query =
      "INSERT INTO `roles` (`orgID`, `name`) VALUES ('" +
      req.body.orgID +
      "', '" +
      req.body.role +
      "')";
    DBConnection.executeQuery(query, (err, result) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        ResponseMaker.customResponse(res, { id: result.insertId });
      }
    });
  });

  app.post("/createUser", (req, res) => {
    var checkQuery =
      "select count(*) as exist from users u where u.email='" +
      req.body.email +
      "'";

    DBConnection.executeQuery(checkQuery, (err, result) => {
      if (parseInt(result[0].exist) === 0) {
        var query =
          "INSERT INTO `users` (`email`,`userName`, `role`,  `orgID`, `orgname`) VALUES ('" +
          req.body.email +
          "','" +
          req.body.userName +
          "','" +
          req.body.role +
          "','" +
          req.query.orgID +
          "','" +
          req.query.orgname +
          "')";
        DBConnection.executeQuery(query, (err, result) => {
          if (err) {
            ResponseMaker.sendInternalError(500);
          } else {
            var token = jwt.sign({ email: req.body.email }, jwtSecret.secret);
            mailer.sendUserCreatedEmail(req.body, res, token, result);
          }
        });
      } else {
        ResponseMaker.customResponse(res, { message: "User Already exists!" });
      }
    });
  });

  app.post("/updateSeries", (req, res) => {
    var query =
      "UPDATE `series` SET `customersPrefix` = '" +
      req.body.customersPrefix +
      "', `customersSeries` = '" +
      req.body.customersSeries +
      "', `suppliersPrefix` = '" +
      req.body.suppliersPrefix +
      "', `suppliersSeries` = '" +
      req.body.suppliersSeries +
      "', `inventoryPrefix` = '" +
      req.body.inventoryPrefix +
      "', `inventorySeries` = '" +
      req.body.inventorySeries +
      "', `materialPrefix` = '" +
      req.body.materialPrefix +
      "', `materialSeries` = '" +
      req.body.materialSeries +
      "', `tasksPrefix` = '" +
      req.body.tasksPrefix +
      "', `tasksSeries` = '" +
      req.body.tasksSeries +
      "', `estimationPrefix` = '" +
      req.body.estimationPrefix +
      "', `estimationSeries` = '" +
      req.body.estimationSeries +
      "' WHERE `series`.`id` =" +
      req.body.id;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/updateUserRole", (req, res) => {
    var query =
      "UPDATE `users` SET `role` = '" +
      req.body.role +
      "' WHERE `users`.`userID` =" +
      req.body.userID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/blockUser", (req, res) => {
    var query =
      "UPDATE `users` SET `active` = '" +
      (req.body.active === "yes" ? "no" : "yes") +
      "' WHERE `users`.`userID` =" +
      req.body.userID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/deleteUser", (req, res) => {
    var query =
      "delete from `users` WHERE `users`.`userID` =" + req.body.userID;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/resetMenu", (req, res) => {
    var query =
      "delete from `role_access` WHERE `role_access`.`orgID` =" +
      req.query.orgID +
      "  and `role_access`.menuID in (select id from `menusList` where `menusList`.menu='" +
      req.body.menu +
      "')";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/updateLocation", (req, res) => {
    var query =
      "UPDATE `location` SET `timeZone` = '" +
      req.body.timeZone +
      "', `timeFormat` = '" +
      req.body.timeFormat +
      "', `dateFormat` = '" +
      req.body.dateFormat +
      "' WHERE `location`.`id` = " +
      req.body.id;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/updateFinancial", (req, res) => {
    var query =
      "UPDATE `financial` SET `taxNo` = '" +
      req.body.taxNo +
      "', `authority` = '" +
      req.body.authority +
      "', `taxLabal` = '" +
      req.body.taxLabal +
      "', `currType` = '" +
      req.body.currType +
      "', `currPos` = '" +
      req.body.currPos +
      "', `finYrDate` = '" +
      req.body.finYrDate +
      "', `saleTax` = '" +
      req.body.saleTax +
      "', `saleTaxPer` = '" +
      req.body.saleTaxPer +
      "', `purTax` = '" +
      req.body.purTax +
      "', `purTaxPer` = '" +
      req.body.purTax +
      "', `taxPeriod` = '" +
      req.body.taxPeriod +
      "' WHERE `financial`.`id` =" +
      req.body.id;
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/updateOrganization", (req, res) => {
    var query =
      "UPDATE `organization` SET `fullname` = '" +
      req.body.fullname +
      "', `crm` = '" +
      req.body.crm +
      "', `industry` = '" +
      req.body.industry +
      "', `address` = '" +
      req.body.address +
      "', `state` = '" +
      req.body.state +
      "', `country` = '" +
      req.body.country +
      "', `telnumber` = '" +
      req.body.telnumber +
      "', `emailId` = '" +
      req.body.emailId +
      "', `licenceNo` = '" +
      req.body.licenceNo +
      "', `registerDate` = '" +
      req.body.registerDate +
      "' WHERE `organization`.`id` =" +
      req.body.id;
    DBConnection.executeQuery(query, (err, result) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        var userUpdateQuery =
          "update `users` set orgname='" +
          req.body.crm +
          "' where userID='" +
          req.query.userID +
          "'";
        DBConnection.executeQueryAndSendResponse(res, userUpdateQuery);
      }
    });
  });

  app.post("/createAccessRole", (req, res) => {
    var query = "";
    if (req.body.r_id === null) {
      query =
        "INSERT INTO `role_access` (`orgID`, `roleID`, `menuID`,`" +
        req.body.column +
        "`) VALUES ('" +
        req.query.orgID +
        "', '" +
        req.body.roleId +
        "', '" +
        req.body.m_id +
        "','" +
        (req.body.columnValue ? 1 : 0) +
        "')";
    } else {
      query =
        "UPDATE `role_access` SET `" +
        req.body.column +
        "` = '" +
        (req.body.columnValue ? 1 : 0) +
        "' WHERE `role_access`.`id` =" +
        req.body.r_id;
    }

    DBConnection.executeQuery(query, (err, result) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        ResponseMaker.customResponse(res, result);
      }
    });
  });

  app.post("/createAccessRoleOneByOne", (req, res) => {
    var query =
      "INSERT INTO `role_access` (`orgID`, `roleID`, `menuID`, `a_create`, `a_edit`, `a_view_own`, `a_view_all`, `a_delete`) VALUES ('" +
      req.query.orgID +
      "', '" +
      req.query.roleId +
      "', '" +
      req.body.m_id +
      "', '1', '1', '1', '1', '1')";

    DBConnection.executeQuery(query, (err, result) => {
      if (err) {
        ResponseMaker.sendInternalError(res);
      } else {
        ResponseMaker.customResponse(res, result);
      }
    });
  });

  app.get("/getLandingPageData", (req, res) => {
    var query =
      "SELECT * from (select x.crm, x.id,a.filename, a.fileID from (SELECT o.crm, concat('org',o.id) as id FROM `organization` o WHERE o.id=(SELECT u.orgID from users u WHERE u.userID=" +
      req.query.userID +
      ")) x LEFT JOIN attachments a on a.moduleID=x.id) y order by y.fileID DESC LIMIT 1";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.get("/fetchMenus", (req, res) => {
    var query = "SELECT * from menusList order by menuOrder";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  app.post("/moduleRestricted", (req, res) => {
    const { orgID, role, module } = req.body;
    var query =
      "select a_restricted from role_access where orgID=" +
      orgID +
      " and roleID in (SELECT id FROM `roles` WHERE name='" +
      role +
      "' and (orgID=" +
      orgID +
      " or orgID is null)) and menuID in (SELECT id from menusList WHERE url='" +
      module +
      "')";
    DBConnection.executeQueryAndSendResponse(res, query);
  });

  return app;
};
