const express = require('express');
const fs = require('fs')
var bodyParser = require('body-parser');
var cors = require('cors');
const req = require('express/lib/request');
const app = express();
const port = 8080;
app.use(bodyParser.json());
app.use(cors());
process.env.TZ = "UTC";
const log = require('log-to-file');
var jwt = require('jsonwebtoken');
var jwtSecret = JSON.parse(fs.readFileSync('./src//assets/jwt-token-secret.json'));
var ResponseMaker = require('./helpers/ResponseMaker');
const Common = require('./common/Common')(app);
const task = require('./tasks/task')(app);
const authentication = require('./authentication/Auth')(app);
const fileUpload=require('./upload/file-uploader')(app);
const settings=require('./settings/settings')(app);
const phoneBook=require('./phoneBook/phoneBook')(app);
const customers=require('./customers/Customers')(app);
const suppliers=require('./suppliers/Suppliers')(app);
app.use((req, res, next) => {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);
  // Pass to next layer of middleware

  log('path->'+req.path, 'app-log.log', '\r\n');
  if (!req.path.includes('auth')) {
    const token = req.header('Authorization');

    if (!token) {
      ResponseMaker.customResponse(res, { "error": "tokenIssue" });
    }
    try {
      jwt.verify(token, jwtSecret.secret);
    } catch (err) {
      ResponseMaker.customResponse(res, { "error": "tokenIssue" });
    }

  }
  next();
});

app.use('/tasks', task);
app.use('/auth', authentication);
app.use('/files', fileUpload);
app.use('/settings', settings);
app.use("/phoneBook", phoneBook);
app.use("/customers", customers);
app.use("/common", Common);
app.use("/suppliers", suppliers);

app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`)
});
