import Protocol = require('./PokerProtocol');
var Poker = require('./engine');

/**
 * A poker game simulation with remote players
 */
class PokerGame {
	// Minimum players to start a game
	private static MINIMUM_PLAYERS : number = 2;

	// Maximum players before we force-start the game
	private static MAXIMUM_PLAYERS : number = 6;

	// Count down interval in millisecs
	private static COUNT_DOWN_INTERVAL : number = 1000;

	// Count down number of intervals
	private static COUNT_DOWN_NUMBER : number = 10;

	// Unique id
	private static gameIdCounter : number = 0;
	private gameId : number;

	// Administrative
	private playerCount : number;
	private players : any;
	private playerNumbers : any;
	private isStarted : boolean;
	private gameOverCallback : Function;
	private startCallback : Function;
	private countDown : any;
	private countDownTimes : number;

	// Game state
	private table : any;
	private currentTurn : any;

	constructor(gameOverCallback : Function, startCallback : Function) {
		// unique id
		this.gameId = ++PokerGame.gameIdCounter;

		// Setup
		this.players = {};
		this.playerNumbers = {};
		this.playerCount = 0;
		this.isStarted = false;
		this.currentTurn = null;
		this.countDownTimes = 0;
		this.countDown = null;

		this.gameOverCallback = gameOverCallback;
		this.startCallback = startCallback;

		this.initTable();
	}

	/**
	 * Initializes the poker table
	 */
	private initTable() {
		// Game state setup
		// min blind, max blind, min players, max players
		this.table = new Poker.Table(10, 20, 2, 6);

		this.table.on("turn", (player) => {
			this.onPlayerTurn(player);
		});

		this.table.on("win", (player, prize) => {
		    this.onPlayerWin(player, prize);
		});

		this.table.on("gameOver", () => {
		    this.onGameOver();
		});
	}

	/**
	 * Called when a player is given a turn.
	 * @param {any} player Poker Player
	 */
	private onPlayerTurn(player) {
		this.currentTurn = player;
		var uid = player.playerName;
		this.players[uid].sendText(Protocol.YOUR_TURN + ':' + player.GetHand().cards.join(','));
	}

	/**
	 * Called when a game is over
	 */
	private onGameOver() {
		for (var uid in this.players) {
			if (this.players.hasOwnProperty(uid)) {
				this.players[uid].sendText(Protocol.GAME_OVER);
			}
		}

		this.gameOverCallback(this.players);
	}

	/**
	 * Called when the current player turn sends a response
	 * @param {string} data Response
	 */
	private onPlayerMove(data : string) {
		var split = data.split(':');
		var uid = this.currentTurn.playerName;
		var num = this.playerNumbers[uid];
		var client = this.players[uid];

		var broadcast = null;
		switch (split[0]) {
			case Protocol.CALL:
				this.currentTurn.call();
				broadcast = Protocol.CALL + ':' + num;
				break;

			case Protocol.BET:
				if (split.length > 1 && !isNaN(parseInt(split[1]))) {
					this.currentTurn.bet(parseInt(split[1]));
					broadcast = Protocol.BET + ':' + split[1] + ':' + num;
				}
				break;

			case Protocol.FOLD:
				this.currentTurn.fold();
				broadcast = Protocol.FOLD + ':' + num;
				break;

			case Protocol.ALL_IN:
				this.currentTurn.allIn();
				broadcast = Protocol.ALL_IN + ':' + num;
				break;

			case Protocol.CHECK:
				this.currentTurn.Check();
				broadcast = Protocol.CHECK + ':' + num;
				break;
		}

		if (broadcast != null) {
			// Notify all players what just happened
			this.broadcastToPlayers(broadcast);
		} else {
			// Nothing happened, so we didn't understand the action
			client.sendText(Protocol.WHAT_WAS_THAT);
		}
	}

	/**
	 * Called when a player wins
	 * @param {any} player Poker player
	 * @param {any} prize Prize
	 */
	private onPlayerWin(player, prize) {
		var uid = this.currentTurn.playerName;
		var client = this.players[uid];

		client.sendText(Protocol.WIN);
	}

	/**
	 * Gets the game id
	 * @return {number} The game id
	 */
	public getId() {
		return this.gameId;
	}

	/**
	 * Adds a player to the game
	 * @param {any} client The client socket
	 */
	public addPlayer(client : any) {
		if (this.isStarted) return false;

		var uid = this.getUid(client);
		this.players[uid] = client;
		this.playerNumbers[uid] = this.playerCount;
		this.playerCount++;

		this.table.addPlayer({
		    playerName : uid,
		    chips: 300
		});

		console.log(this.playerCount + ' players now in game ' + this.gameId);

		if (this.isGameFull()) {
			this.stopCountDown();
			this.startGame();
		} else if (this.hasSufficientPlayers()) {
			this.stopCountDown();
			this.startCountDown();
		}

		return true;
	}

	/**
	 * Starts the countdown to play
	 */
	private startCountDown() {
		this.countDownTimes = PokerGame.COUNT_DOWN_NUMBER;
		this.countDown = setInterval(() => {
			this.countDownTimes--;
			if (this.countDownTimes <= 0) {
				this.stopCountDown();
				this.startGame();
			} else {
				console.log('starting in... ' + this.countDownTimes);
				this.broadcastToPlayers(
					Protocol.GAME_STARTING_IN + ':' + this.countDownTimes);
			}
		}, PokerGame.COUNT_DOWN_INTERVAL);
	}

	/**
	 * Stops the countdown to play
	 */
	private stopCountDown() {
		if (this.countDown == null) return;

		clearInterval(this.countDown);
		this.countDownTimes = PokerGame.COUNT_DOWN_NUMBER;
	}

	/**
	 * Sends a message to the whole room
	 * @param {string} msg The message to send
	 */
	public broadcastToPlayers(msg : string) {
		// send to all players
		for (var uid in this.players) {
			if (this.players.hasOwnProperty(uid) && this.players[uid]) {
				this.players[uid].sendText(msg);
			}
		}
	}

	/**
	 * Removes a player from the game
	 * @param {any} client The client socket
	 */
	public removePlayer(client : any) {
		// Remove from game
		var uid = this.getUid(client);
		this.table.removePlayer(uid);

		// Delete reference
		this.players[uid] = undefined;
		this.playerNumbers[uid] = undefined;

		// Subtract player count
		this.playerCount--;

		// If we were going to start, make sure we still can
		if (this.countDown != null && !this.hasSufficientPlayers()) {
			this.stopCountDown();
		}
	}

	/**
	 * Starts the game
	 */
	public startGame() {
		this.isStarted = true;
		this.table.startGame();
		this.startCallback();
	}

	/**
	 * @return true if the game is full, false otherwise.
	 */
	public isGameFull() {
		return this.playerCount >= PokerGame.MAXIMUM_PLAYERS;
	}

	/**
	 * @return true if the game has enough players to start, false otherwise.
	 */
	public hasSufficientPlayers() {
		return this.playerCount >= PokerGame.MINIMUM_PLAYERS;
	}

	/**
	 * Called when a player sends the game data
	 * @param {any} client The client socket
	 * @param {string} data The client data
	 */
	public onPlayerData(client : any, data : string) {
		var uid = this.getUid(client);

		if (!this.isStarted) {
			client.sendText(Protocol.NOT_STARTED);
		} else if(this.currentTurn && this.currentTurn.playerName == uid) {
			this.onPlayerMove(data);
		} else {
			client.sendText(Protocol.NOT_YOUR_TURN);
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
}

export = PokerGame;