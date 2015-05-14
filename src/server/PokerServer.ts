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

	// Holds the next waiting game
	private nextGame : PokerGame;

	// Map from all currently running game ids to their objects
	private currentGames : any;

	// Map from client to their game
	private clientToGame : any;

	// Map from active client ids to their sockets
	private connections : any;

	/**
	 * Constructs a new PokerServer on the given port
	 * @param {number} port The port
	 */
	constructor(port : number) {
		this.readyNextGame();
		this.currentGames = {};
		this.clientToGame = {};
		this.connections = {};

		this.server = ws.createServer({secure : false}, (conn) => {
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
			try	{
				this.onClientData(client, str);
			} catch (e) {
				// Do nothing
			}
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

		var protocol = data.split(':')[0];

		switch (protocol) {
			case Protocol.JOIN_GAME:
				var split = data.split(':');

				// Get a name
				var name = "Untitled";
				if (split.length > 1) {
					name = split[1].replace(',', '');
					// TODO: limit length?
				}

				console.log(name + 'is joining...');

				// If we haven't join a game, join one!
				if (!game)
					this.joinGame(client, name);

				break;

			case Protocol.SPECTATE_GAME:
				//  If we're not in a game, spectate one!
				if (!game)
					this.spectateGame(client);

			default:
				// Route all other messages to their contingent games
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
	 * @param {PokerGame} game The game that ended
	 * @param {any} uidsToClients The players in that game
	 * @param {any} spectators The spectators in that game
	 */
	private onGameOver(game : PokerGame, uidsToPlayers : any, spectators : any[]) {
		for (var uid in uidsToPlayers) {
			if (uidsToPlayers.hasOwnProperty(uid)) {
				this.clientToGame[uid] = undefined;
			}
		}

		for (var uid in spectators) {
			if (spectators.hasOwnProperty(uid)) {
				this.clientToGame[uid] = undefined;
			}
		}

		this.currentGames[game.getId()] = undefined;
	}

	/**
	 * Called when the next game starts.
	 */
	private onGameStart(game : PokerGame) {
		this.readyNextGame();
		this.currentGames[game.getId()] = game;
	}

	/**
	 * Readys a new game to be filled.
	 */
	private readyNextGame() {
		this.nextGame = new PokerGame((game, players, spectators) => {
			this.onGameOver(game, players, spectators);
		}, (game) => {
			this.onGameStart(game);
		});
	}

	/**
	 * Called when a client wants to join a game.
	 * @param {any} client The client socket
	 */
	private joinGame(client : any, name : string) {
		var uid = this.getUid(client);
		this.clientToGame[uid] = this.nextGame;
		console.log(uid + ' joining game ' + this.nextGame.getId());

		// Ensure we have at least the minimum chips
		if (client.chips < PokerServer.STARTING_CHIPS) {
			client.chips = PokerServer.STARTING_CHIPS;
		}

		this.nextGame.addPlayer(client, name, client.chips);
	}

	/**
	 * Retrieves a game currently running
	 * (no specification on which game)
	 * @return {PokerGame} the game, null if none are found
	 */
	private getRunningGame() {
		for (var id in this.currentGames) {
			if (this.currentGames.hasOwnProperty(id) &&
				typeof(this.currentGames[id]) != 'undefined') {
				return this.currentGames[id];
			}
		}

		return null;
	}

	/**
	 * Called when a client wants to spectate a game.
	 * @param {any} client The client socket
	 */
	private spectateGame(client : any) {
		var uid = this.getUid(client);
		this.clientToGame[uid] = this.nextGame;

		console.log(uid + ' spectating game ' + this.nextGame.getId());

		this.nextGame.addSpectator(client);
	}
}

export = PokerServer;