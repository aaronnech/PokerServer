var ws = require("nodejs-websocket");
import PokerGame = require('./PokerGame');
import Protocol = require('./PokerProtocol');

/**
 * A server that simulates poker.
 */
class PokerServer {
	// Chips each player starts with
	private static STARTING_CHIPS : number = 300;

	private server : any;

	private nextGame : PokerGame;
	private clientToGame : any;
	private connections : any;

	/**
	 * Constructs a new PokerServer on the given port
	 * @param {number} port The port
	 */
	constructor(port : number) {
		this.readyNextGame();
		this.clientToGame = {};
		this.connections = {};

		this.server = ws.createServer((conn) => {
		    this.onClientConnect(conn);
		}).listen(port);

		console.log('listening on port ' + port);
	}

	/**
	 * Called when a client connects to the poker server.
	 * @param {any} client The client socket
	 */
	private onClientConnect(client : any) {
		var uid = this.getUid(client);
		this.connections[uid] = client;

		// give the client their initial currency.
		client.chips = PokerServer.STARTING_CHIPS;

		client.on("text", (str) => {
			this.onClientData(client, str);
		});

		client.on("close", (code, reason) => {
			this.onClientDisconnect(uid);
		});
	}

	/**
	 * Called when a client sends data to the poker server.
	 * @param {any} client The client socket
	 * @param {string} data The client data
	 */
	private onClientData(client : any, data : string) {
		var game = this.clientToGame[this.getUid(client)];

		switch (data) {
			case Protocol.JOIN_GAME:
				// If we haven't join a game, join one!
				if (!game)
					this.joinGame(client);

				break;

			default:
				// Route all over messages to their contingent games
				if (game)
					game.onPlayerData(client, data);

				break;
		}
	}

	/**
	 * Called when a client disconnects from the poker server.
	 * @param {string} uid The client socket uid
	 */
	private onClientDisconnect(uid : string) {
		var game = this.clientToGame[uid];
		this.connections[uid] = undefined;
		console.log('client ' + uid + ' disconnected');

		if (game) {
			game.removePlayer(uid);
			this.clientToGame[uid] = undefined;
		}
	}

	/**
	 * Gets a UID from a client socket
	 * @param {any} client The client socket
	 * @return {string} the Uid
	 */
	private getUid(client : any) {
		return client.socket.remoteAddress + ':' + client.socket.remotePort;
	}

	/**
	 * Called when a game gets over.
	 * @param {any} uidsToClients The clients in that game
	 */
	private onGameOver(uidsToClients : any) {
		for (var uid in uidsToClients) {
			if (uidsToClients.hasOwnProperty(uid)) {
				this.clientToGame[uid] = undefined;
			}
		}
	}

	/**
	 * Called when the next game starts.
	 */
	private onGameStart() {
		this.readyNextGame();
	}

	/**
	 * Readys a new game to be filled.
	 */
	private readyNextGame() {
		this.nextGame = new PokerGame((players : any) => {
			this.onGameOver(players);
		}, () => {
			this.onGameStart();
		});
	}

	/**
	 * Called when a client wants to join a game.
	 * @param {any} client The client socket
	 */
	private joinGame(client : any) {
		var uid = this.getUid(client);
		this.clientToGame[uid] = this.nextGame;
		console.log(uid + ' joining game ' + this.nextGame.getId());

		// Ensure we have at least the minimum chips
		if (client.chips < PokerServer.STARTING_CHIPS) {
			client.chips = PokerServer.STARTING_CHIPS;
		}

		this.nextGame.addPlayer(client, client.chips);
	}
}

export = PokerServer;