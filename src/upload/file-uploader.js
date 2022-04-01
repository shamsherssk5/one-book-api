const express = require('express');
module.exports = () => {

    const app = express();
    var multer = require('multer');
    const fs = require('fs');
    var moment=require('moment-timezone');

    var DBConnection = require('../helpers/DBConnection');
    var ResponseMaker = require('../helpers/ResponseMaker');

    var storage = multer.diskStorage({
        destination: function (req, file, cb) {
            let dir='/one-book-upload/'+req.query.module;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir)
        },
        filename: function (req, file, cb) {
            cb(null, Date.now() + '-' + file.originalname);
        }
    })

    var upload = multer({ storage: storage }).single('file');

    app.post("/uploadFile", (req, res) => {

        upload(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(500).json(err)
            } else if (err) {
                return res.status(500).json(err)
            }
            let dateTime=moment.tz(req.query.timeZone).format('yy-MM-DD HH:mm:ss');

            var moduleID = req.query.moduleID;
            var user = req.query.username;
            var query = "INSERT INTO `attachments` (`moduleID`, `filename`,`originalname`, `type`) VALUES ('" + moduleID + "', '" + req.file.filename + "','" + req.file.originalname + "' ,'" + req.file.mimetype + "')";
            
            var history = "INSERT INTO `history` (`moduleID`, `action`, `dateAndTime`,`name`) VALUES ('" + moduleID + "', 'File Upload', '"+dateTime+"', '" + user + "')"

            DBConnection.executeQuery(query, (err, result1) => {
                if (err) {
                    ResponseMaker.sendInternalError(res);
                } else {
                    if(moduleID!=="undefined"){
                        DBConnection.executeQuery(history,(err, result2) => {
                            if (err) {
                                ResponseMaker.sendInternalError(res);
                            } else {
                                let data={fileID:result1.insertId, filename: req.file.filename, originalname:req.file.originalname,type : req.file.mimetype}
                                ResponseMaker.customResponse(res, data);
                            }
                        });
                    }else{
                        let data={fileID:result1.insertId, filename: req.file.filename, originalname:req.file.originalname,type : req.file.mimetype}
                        ResponseMaker.customResponse(res, data);
                    }
                }
            });
        })

    });

    app.post("/deleteFile", (req, res) => {

        fs.unlinkSync('/one-book-upload/'+req.body.module+"/" + req.body.filename, (err) => {
            if (err){
                console.log(err);
                ResponseMaker.sendInternalError(res);
            }
        });

        var query = "delete from `attachments` where fileID=" + req.body.fileID;

        if(req.body.module==="orgLogo"){
            query= "delete from `attachments` where moduleID='" + req.body.id+"'";
        }

        DBConnection.executeQueryAndSendResponse(res, query);
    });

    app.get("/attachments", (req, res) => {
        var query = "select * from attachments where moduleID='" + req.query.ID + "'";
        DBConnection.executeQueryAndSendResponse(res, query);
    });

    return app;

}