/// <reference path="./def/socket.io.d.ts"/>
/// <reference path="./def/express.d.ts"/>

import PokerServer = require('./PokerServer');
var server = new PokerServer(process.env.PORT || 1337);