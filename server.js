const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
  let addr = req.url,
    q = new URL(addr, "http://" + req.headers.host),
    filePath = "";

  if (q.pathname.includes("documentation")) {
    filePath = path.join(__dirname + "/documentation.html");
  } else {
    filePath = path.join("index.html");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.write("404 Not Found");
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.write(data);
    }
    res.end();
  });

  fs.appendFile(
    "log.txt",
    "URL: " + addr + "\nTimestamp: " + new Date() + "\n\n",
    (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log("Added to log.");
      }
    }
  );
});

server.listen(8080, () => {
  console.log("Server is running on port 8080");
});
