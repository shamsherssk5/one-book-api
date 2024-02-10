const express = require("express");
const fs = require("fs");
var bodyParser = require("body-parser");
var cors = require("cors");
const req = require("express/lib/request");
const app = express();
const port = 8080;
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);
app.use(cors());
process.env.TZ = "UTC";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const log = require("log-to-file");
var jwt = require("jsonwebtoken");
var jwtSecret = JSON.parse(
  fs.readFileSync("./src//assets/jwt-token-secret.json")
);
var ResponseMaker = require("./helpers/ResponseMaker");
const Common = require("./common/Common")(app);
const task = require("./tasks/task")(app);
const reminder = require("./reminders/Reminders")(app);
const authentication = require("./authentication/Auth")(app);
const fileUpload = require("./upload/file-uploader")(app);
const settings = require("./settings/settings")(app);
const phoneBook = require("./phoneBook/phoneBook")(app);
const customers = require("./customers/Customers")(app);
const suppliers = require("./suppliers/Suppliers")(app);
const mtr = require("./material-request/materialRequest")(app);
const pnm = require("./productsAndMaterials/ProdAndMat")(app);
const inventory = require("./inventory/Inventory")(app);
const estimations = require("./estimate/estimations")(app);
const quotes = require("./quote/quote")(app);
app.use((req, res, next) => {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);
  // Pass to next layer of middleware

  log("path->" + req.path, "app-log.log", "\r\n");
  if (!req.path.includes("auth")) {
    const token = req.header("Authorization");
    if (!token) {
      ResponseMaker.customResponse(res, { error: "tokenIssue" });
    }
    try {
      jwt.verify(token, jwtSecret.secret);
    } catch (err) {
      ResponseMaker.customResponse(res, { error: "tokenIssue" });
    }
  }

  if (req.method === "POST") {
    Object.keys(req.body).forEach((key) => {
      if (
        typeof req.body[key] === "string" ||
        req.body[key] instanceof String
      ) {
        let str = req.body[key].replace(/'/g, "\\'");
        req.body[key] = str;
      }
    });
  }
  next();
});

app.use("/tasks", task);
app.use("/auth", authentication);
app.use("/files", fileUpload);
app.use("/settings", settings);
app.use("/phoneBook", phoneBook);
app.use("/customers", customers);
app.use("/common", Common);
app.use("/suppliers", suppliers);
app.use("/mtr", mtr);
app.use("/pnm", pnm);
app.use("/inventory", inventory);
app.use("/rem", reminder);
app.use("/estimations", estimations);
app.use("/quotes", quotes);

app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`);
});

var cronJob = require("cron").CronJob;
var job = new cronJob(
  "0 1 * * *",
  () => {
    log("Running...");
  },
  null,
  true,
  "Etc/GMT-4"
);

job.start();
