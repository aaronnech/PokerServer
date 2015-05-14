/// <reference path="./def/socket.io.d.ts"/>
/// <reference path="./def/express.d.ts"/>

import PokerServer = require('./PokerServer');

var http = require("http")
var express = require("express")
var app = express()

// Port setting
var port = process.env.PORT || 1337

// Serve the spectator
app.use(express.static(__dirname + "../spectator/static"));

// Create our server
var server = http.createServer(app);
server.listen(port);

// Create the Poker server
var poker = new PokerServer(port, server);