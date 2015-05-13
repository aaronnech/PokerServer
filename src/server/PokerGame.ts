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

	// Start countdown
	private countDown : any;
	private countDownTimes : number;

	// Game state
	private table : any;
	private currentTurn : any;

	/**
	 * Constructs a new PokerGame simulation with the given callbacks
	 * @param {Function} gameOverCallback Called when the game ends
	 * @param {Function} startCallback    Called when the game starts
	 */
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

		this.table.on("deal", (player) => {
			this.onPlayerDeal(player);
		});

		this.table.on("flop", (cards) => {
			this.onFlop(cards);
		});

		this.table.on("roundOver", (card) => {
			this.onRoundOver(card);
		});

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
	 * Called when the flop happens
	 * @param {string[]} cards The 3 cards flopped
	 */
	private onFlop(cards : string[]) {
		this.broadcastToPlayers(Protocol.FLOP + ':' + cards.join(','));
	}

	/**
	 * Called when the round is over
	 * @param {string} card The card shown
	 */
	private onRoundOver(card : string) {
		this.broadcastToPlayers(Protocol.ROUND_OVER + ':' + card);
	}

	/**
	 * Called when a player is given the starting cards.
	 * @param {any} player Poker Player
	 */
	private onPlayerDeal(player) {
		this.currentTurn = player;
		var uid = player.playerName;
		this.players[uid].sendText(Protocol.DEAL + ':' + player.cards.join(','));
	}

	/**
	 * Called when a player is given a turn.
	 * @param {any} player Poker Player
	 */
	private onPlayerTurn(player) {
		this.currentTurn = player;
		var uid = player.playerName;
		this.players[uid].sendText(Protocol.YOUR_TURN);
	}

	/**
	 * Called when a game is over
	 */
	private onGameOver() {
		this.broadcastToPlayers(Protocol.GAME_OVER);

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

		// Update the chips
		for (var i = 0; i < this.table.players.length; i++) {
			var player = this.table.players[i];
			var id = player.playerName;

			if (this.players[id]) {
				this.players[id].chips = player.chips;
			}
		}

		client.sendText(Protocol.WIN + ':' + prize);
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
	 * @param {number} startingChips The amount of starting chips
	 */
	public addPlayer(client : any, chips : number) {
		if (this.isStarted) return false;

		// Let everyone know someone joined
		this.broadcastToPlayers(Protocol.PLAYER_JOIN + ':' + this.playerCount);
		client.sendText(Protocol.YOU_ARE + ':' + this.playerCount);

		// Update administrative variables
		var uid = this.getUid(client);
		this.players[uid] = client;
		this.playerNumbers[uid] = this.playerCount;
		this.playerCount++;

		// Add the player to the game
		this.table.addPlayer({
		    playerName : uid,
		    chips : chips
		});

		console.log(uid + ' now has ' + chips + ' chips');
		console.log(this.playerCount + ' players now in game ' + this.gameId);

		this.checkStart();

		return true;
	}

	/**
	 * Checks to see if we can start the game
	 */
	private checkStart() {
		if (this.isGameFull()) {
			this.stopCountDown();
			this.startGame();
		} else if (this.hasSufficientPlayers()) {
			this.stopCountDown();
			this.startCountDown();
		}
	}

	/**
	 * Starts the countdown to play
	 */
	private startCountDown() {
		this.countDownTimes = PokerGame.COUNT_DOWN_NUMBER;
		this.countDown = setInterval(() => {
			if (this.countDown == null) return;

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
		this.countDown = null;
		this.countDownTimes = PokerGame.COUNT_DOWN_NUMBER;
	}

	/**
	 * Sends a message to the whole room
	 * @param {string} msg The message to send
	 */
	public broadcastToPlayers(msg : string) {
		// send to all players
		for (var uid in this.players) {
			if (this.players.hasOwnProperty(uid) &&
				typeof(this.players[uid]) != 'undefined') {
				this.players[uid].sendText(msg);
			}
		}
	}

	/**
	 * Removes a player from the game
	 * @param {string} uid The client socket uid
	 */
	public removePlayer(uid : string) {
		var num = this.playerNumbers[uid];

		// Subtract player count
		this.playerCount--;

		// Delete reference
		this.players[uid] = undefined;
		this.playerNumbers[uid] = undefined;

		// Remove from game
		console.log('removing player ' + uid + ' from game ' + this.gameId);

		// See if we're in the middle of a game
		if (this.isStarted) {
			// If they leave on their turn, do a check for them
			if (this.currentTurn && this.currentTurn.playerName == uid) {
				this.currentTurn.Check();
			}

			// Remove from table
			this.table.removePlayer(uid);
		} else {
			this.updateStartingQueue();
		}

		this.broadcastToPlayers(Protocol.PLAYER_LEFT + ':' + num);
	}

	/**
	 *	Updates the waiting queue with the current players,
	 *	such that we don't get any empty seats.
	 */
	private updateStartingQueue() {
		this.stopCountDown();

		// Save players to transfer over
		var savedPlayers = this.table.players.slice(0);

		// Reinitialize the table
		this.initTable();

		// Replace players (no empty seats)
		for (var i = 0; i < savedPlayers.length; i++) {
			this.table.addPlayer({
			    playerName : savedPlayers.playerName,
			    chips : savedPlayers.chips
			});
		}

		this.checkStart();
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

		if (this.currentTurn && this.currentTurn.playerName == uid) {
			this.onPlayerMove(data);
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