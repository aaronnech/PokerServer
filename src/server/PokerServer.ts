var ws = require("nodejs-websocket");
import PokerGame = require('./PokerGame');

/**
 * A server that simulates poker.
 */
class PokerServer {
	private static COMMANDS = {
		JOIN_GAME : 'join-game',
		SPECTATE_GAME : 'spectate-game'
	};

	private server : any;

	private nextGame : PokerGame;
	private clientToGame : any;

	constructor(port : number) {
		this.readyNextGame();
		this.clientToGame = {};

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
		client.on("text", (str) => {
			this.onClientData(client, str);
		});

		client.on("close", (code, reason) => {
			this.onClientDisconnect(client);
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
			case PokerServer.COMMANDS.JOIN_GAME:

				if (!game)
					this.joinGame(client);

				break;

			default:
				
				if (game)
					game.onPlayerData(client, data);

				break;
		}
	}

	/**
	 * Called when a client disconnects from the poker server.
	 * @param {any} client The client socket
	 */
	private onClientDisconnect(client : any) {
		var uid = this.getUid(client);
		var game = this.clientToGame[uid];

		if (game) {
			game.removePlayer(client);
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
	 * Readys a new game to be filled.
	 */
	private readyNextGame() {
		this.nextGame = new PokerGame((players : any) => {
			this.onGameOver(players);
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

		this.nextGame.addPlayer(client);

		if (this.nextGame.isGameFull()) {
			this.readyNextGame();
		}
		
	}
}

export = PokerServer;