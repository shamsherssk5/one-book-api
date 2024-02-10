const log = require("log-to-file");

const sendOKResponse = (res, result) => {
  log(
    "Response Sent with result->" + JSON.stringify(result),
    "app-log.log",
    "\r\n"
  );
  res.writeHead(200, { "Content-Type": "application/json" });
  res.write(JSON.stringify(result));
  res.end();
};

const sendInternalError = (res) => {
  log("Response Sent with result->Internal Error", "app-log.log", "\r\n");
  res.writeHead(500, { "Content-Type": "text" });
  res.write("Internal Error Occured");
  res.end();
};

const customResponse = (res, data) => {
  log(
    "Response Sent with result->" + JSON.stringify(data),
    "app-log.log",
    "\r\n"
  );
  res.writeHead(200, { "Content-Type": "application/json" });
  res.write(JSON.stringify(data));
  res.end();
};

module.exports = {
  sendOKResponse,
  sendInternalError,
  customResponse,
};
