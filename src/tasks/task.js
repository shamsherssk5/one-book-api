const express = require('express');
module.exports = () => {
    var app = express();
    var DBConnection = require('../helpers/DBConnection');
    var ResponseMaker = require('../helpers/ResponseMaker')
    app.get("/tasks-list", (req, res) => {
        let username=req.query.username;
        let role=req.query.role;
        let userID=req.query.userID;
        let condition=(role==='Admin'|| role==='manager')?"  where orgID="+req.query.orgID:"  where t.id in (select ass.taskID from assigned ass where ass.userID='"+userID+"' or t.assignee='"+username+"')";
        var query = "SELECT t.*, (select GROUP_CONCAT(u.userName SEPARATOR ',') from users u where u.userID IN (SELECT l.userID from assigned l where l.taskID=t.id)) as userNames,(SELECT count(*) from conversations c where concat('task',t.id)=c.moduleID) as messages, (SELECT count(*) from attachments a where concat('task',t.id)=a.moduleID) as attachmentsCount FROM tasks t"+condition+" order by t.assignDate DESC,t.assignTime DESC";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/users-avatars", (req, res) => {
        var query = "select userID,userName,userAvatar from users where userID in (select userID from assigned where taskID='" + req.query.ID + "')";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/fetchUser", (req, res) => {
        var query = "select userID,userName,userAvatar, email from users where userID in (" + req.query.ID + ")";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/departments", (req, res) => {
        var query = "select * from departments";
        DBConnection.executeQueryAndSendResponse(res, query);

    });

    app.get("/titles", (req, res) => {
        var query = "SELECT * FROM `titles`ORDER by case when titleID=0 then 0 when titleID=4 then 1 else 0 END";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/usersList", (req, res) => {
        var query = "select userID,userName from users where orgID="+req.query.orgID;
        DBConnection.executeQueryAndSendResponse(res, query);

    });

    app.get("/projects", (req, res) => {
        var query = "select * from projects";
        DBConnection.executeQueryAndSendResponse(res, query);

    });

    app.post("/postDepartment", (req, res) => {
        var query = "INSERT INTO `departments` (`name`, `colour`) VALUES ('" + req.body.name + "', '" + req.body.color + "')";
        if (req.body.isEditable) {
            query = "update `departments` set name='" + req.body.name + "', colour='" + req.body.color + "' where depID=" + req.body.id;
        }
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/postTitle", (req, res) => {
        var query = "INSERT INTO `titles` (`name`, `colour`) VALUES ('" + req.body.name + "', '" + req.body.color + "')";
        if (req.body.isEditable) {
            query = "update `titles` set name='" + req.body.name + "', colour='" + req.body.color + "' where titleID=" + req.body.id;
        }
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/deleteTask", (req, res) => {
        var query = "delete from `tasks` where id='" + req.body.id + "'";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/delete-completed-tasks", (req, res) => {
        var query = "delete from `tasks` where id in (" + req.body.IDs + ")";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/deleteDepartment", (req, res) => {
        var query = "delete from `departments` where depID=" + req.body.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/deleteTitle", (req, res) => {
        var query = "delete from `titles` where titleID=" + req.body.id;
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.post("/createTask", (req, res) => {
        let refNum="select lpad(max(tasksSeries)+1, 4, '0') as ref from (SELECT s.tasksSeries from series s where orgID="+req.body.orgID+" UNION SELECT '0000' as tasksSeries UNION  SELECT max(t.referenceNum) as  tasksSeries from tasks t WHERE orgID="+req.body.orgID+") s";
        let refText="SELECT s.tasksPrefix from series s where orgID="+req.body.orgID+" UNION SELECT 'TASK-' as tasksPrefix LIMIT 1"
        var query = "INSERT INTO `tasks` (`orgID`,`referenceNum`,`refText`, `endDate`, `category`, `title`, `subject`, `project`, `assignee`, `assignDate`, `assignTime`, `priority`, `notes`)" +
            " VALUES ('" + req.body.orgID + "',("+refNum+"),("+refText+"),'" + req.body.endDate + "', '" + req.body.category + "', '" + req.body.title + "', '" + req.body.subject + "', '" + req.body.project + "', '" + req.body.assignee + "','" + req.body.assignDate + "', '" + req.body.assignTime + "', '" + req.body.priority + "','" + req.body.notes + "')";
        query = query.replace("'null'", null);
        DBConnection.executeQuery(query, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                var assignedQuery = "INSERT INTO `assigned` (`taskID`, `userID`) VALUES ?";
                DBConnection.executeMultiple(assignedQuery,[req.body.assignTo.map(user=>[result1.insertId,user.userID])], (err, result2) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        let tID="task"+result1.insertId;
                        var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + tID + "', 'Added', '" + req.body.assignDate + " " + req.body.assignTime + "', '" + req.body.assignee + "')";
                        DBConnection.executeQuery(history, (err, result3) => {
                            if (err) {
                                ResponseMaker.sendInternalError(res);
                            } else {
                                let taskID="task"+result1.insertId;
                                if(req.body.attachments && req.body.attachments.length>0){
                                    req.body.attachments.forEach(element => {
                                        let attachQuery="UPDATE `attachments` SET `moduleID` = '"+taskID+"' WHERE `attachments`.`fileID` ="+element.fileID;
                                        DBConnection.executeQuery(attachQuery,(err,result)=>{});
                                    });
                                }
                                ResponseMaker.customResponse(res,result1);
                            }
                        })    
                    }
                })
            }
        })


    });


    app.post("/editTask", (req, res) => {
        var editQuery = "UPDATE `tasks` SET  `title` = '" + req.body.title + "', `endDate` ='" + req.body.endDate + "' , `subject` = '" + req.body.subject + "', `project` = '" + req.body.project + "', `assignee` = '" + req.body.assignee + "', `assignDate` = '" + req.body.assignDate + "', `assignTime` = '" + req.body.assignTime + "', `priority` = '" + req.body.priority + "', `notes` = '" + req.body.notes + "' WHERE `tasks`.`id` = '" + req.body.id + "'"
        editQuery = editQuery.replace("'null'", null);
        var assignedDelete="delete from assigned where taskID='"+ req.body.id + "'";
        var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('task" + req.body.id + "', 'Edited', '" + req.body.assignDate + " " + req.body.assignTime + "', '" + req.body.assignee + "')"
        DBConnection.executeQuery(editQuery, (err, result1) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                DBConnection.executeQuery(history, (err, result2) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        DBConnection.executeQuery(assignedDelete, (err, result3) => {
                            if (err) {
                                ResponseMaker.sendInternalError(res);
                            } else {
                                var assignedQuery = "INSERT INTO `assigned` (`taskID`, `userID`) VALUES ?";
                                DBConnection.executeMultiple(assignedQuery,[req.body.assignTo.map(user=>[req.body.id,user.userID])], (err, result4) => {
                                    if (err) {
                                        ResponseMaker.sendInternalError(res);
                                    } else {
                                        ResponseMaker.customResponse(res,result1);
                                    }
                                })    
                            }
                        })    
                    }
                })
            }
        });
    });

    app.post("/updateTask", (req, res) => {
        var query = "update tasks t set t.category='" + req.body.category + "' where t.id='" + req.body.id + "'";
        var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('task" + req.body.id + "', 'Moved to " + req.body.category + " ', '" + req.body.assignDate + " " + req.body.assignTime + "', '" + req.body.assignee + "')"
        DBConnection.executeQuery(history, (err, result) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                DBConnection.executeQueryAndSendResponse(res, query);
            }
        });
    });

    app.post("/forward", (req, res) => {
        var assignedDelete="delete from assigned where taskID='"+ req.body.taskID + "'";
        DBConnection.executeQuery(assignedDelete, (err, result3) => {
            if (err) {
                ResponseMaker.sendInternalError(res);
            } else {
                var assignedQuery = "INSERT INTO `assigned` (`taskID`, `userID`) VALUES ?";
                DBConnection.executeMultiple(assignedQuery,[req.body.users.map(user=>[req.body.taskID,user.userID])], (err, result4) => {
                    if (err) {
                        ResponseMaker.sendInternalError(res);
                    } else {
                        ResponseMaker.customResponse(res,result4);
                    }
                })    
            }
        })    
    });


    return app;
}