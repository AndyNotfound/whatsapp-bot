const express = require("express");
const path = require("path");
const routes = require("./routes");

const app = express();

app.use(express.json());

app.use(express.static(path.join(__dirname, "../client")));

app.use("/api", routes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/qr.html"));
});

module.exports = app;