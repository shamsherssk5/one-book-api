const log = require('log-to-file');
const fileName='app-log.log';
var mysql = require('mysql');
const fs = require('fs');
var prop = JSON.parse(fs.readFileSync('./src//assets/dbConfig.json'));
var ResponseMaker=require('./ResponseMaker');
const getConnection = () => {
    return mysql.createConnection(prop);
}

const closeConnection = (con) => {
    con.end();
}

const executeQueryAndSendResponse = (res,query) => {
    var con = getConnection();
     log('query fired->'+query, 'app-log.log', '\r\n');
     con.query(query, function (err, result, fields) {
       
        if (err) {
            console.log("DB Error occured->" + err);
            ResponseMaker.sendInternalError(res);
        }

        ResponseMaker.sendOKResponse(res, result);
        
        closeConnection(con);
    })
}

const executeQuery=(query,callBack)=>{
    
    log('query fired->'+query, 'app-log.log', '\r\n');
    var con = getConnection();
    con.query(query, function (err, result, fields) {
        closeConnection(con);
        if (err) {
            callBack(err,null);
        }else{
            callBack(null,result)
        } 
        
    })
}


const executeMultiple=(query,values,callBack)=>{
    
    log('query fired->'+query, 'app-log.log', '\r\n');
    log('values are->'+values, 'app-log.log', '\r\n');
    var con = getConnection();
    con.query(query, values, function (err, result, fields) {
        closeConnection(con);
        if (err) {
            callBack(err,null);
        }else{
            callBack(null,result)
        } 
        
    })
}

module.exports={
    getConnection,
    executeQueryAndSendResponse,
    closeConnection,
    executeQuery,
    executeMultiple
}
