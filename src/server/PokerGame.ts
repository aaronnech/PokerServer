import Protocol = require('./PokerProtocol');
var Poker = require('./engine');

/**
 * A poker game simulation with remote players
 */
class PokerGame {
	// Time to delay between turns
	private static MIN_SPECTATOR_DELAY : number = 1000;
	private static MAX_SPECTATOR_DELAY : number = 3000;

	// Time to wait for player to make their turn
	private static PLAYER_WAIT_TIME : number = 20000;

	// Minimum players to start a game
	private static MINIMUM_PLAYERS : number = 2;

	// Maximum players before we force-start the game
	private static MAXIMUM_PLAYERS : number = 6;

	// Count down interval in millisecs
	private static COUNT_DOWN_INTERVAL : number = 1000;

	// Count down number of intervals
	private static COUNT_DOWN_NUMBER : number = 5;

	// Unique id
	private static gameIdCounter : number = 0;
	private gameId : number;

	// Administrative
	private playerCount : number;
	private players : any;
	private spectators : any;
	private playerNumbers : any;
	private playerNames : any;
	private isStarted : boolean;
	private gameOverCallback : Function;
	private startCallback : Function;

	// Start countdown
	private countDown : any;
	private countDownTimes : number;

	// Wait for player timeout
	private playerWait : any;

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
		PokerGame.gameIdCounter %= 2000000000;

		// Setup
		this.spectators = {};
		this.players = {};
		this.playerNumbers = {};
		this.playerNames = {};
		this.playerCount = 0;
		this.isStarted = false;
		this.currentTurn = null;
		this.countDownTimes = 0;
		this.countDown = null;
		this.playerWait = null;

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

		this.table.on("showCard", (card) => {
			this.onShowCard(card);
		});

		this.table.on("turn", (player) => {
			this.onPlayerTurn(player);
		});

		this.table.on("win", (player, prize) => {
		    this.onPlayerWin(player, prize);
		});

		this.table.on("roundShowDown", () => {
			this.onShowDown();
		});

		this.table.on("gameOver", () => {
		    this.onGameOver();
		});
	}

	/**
	 * Called when showdown happens revealing all cards
	 */
	private onShowDown() {
		this.table.forEachPlayers((player) => {
			var uid = player.playerName
			var num = this.playerNumbers[uid];
			this.broadcastToPlayers(Protocol.SHOWDOWN + ':' + num + ':' + player.cards.join(','));
		});
	}

	/**
	 * Called when a card is revealed in the middle
	 * @param {string} card The card shown
	 */
	private onShowCard(card : string) {
		this.broadcastToPlayers(Protocol.SHOW_CARD + ':' + card);
	}

	/**
	 * Called when a player is given the starting cards.
	 * @param {any} player Poker Player
	 */
	private onPlayerDeal(player) {
		this.currentTurn = player;
		var uid = player.playerName;
		if (this.players[uid])
			this.players[uid].send(Protocol.DEAL + ':' + player.cards.join(','));
	}

	/**
	 * Called when a player is given a turn.
	 * @param {any} player Poker Player
	 */
	private onPlayerTurn(player) {
		this.currentTurn = null;
		var uid = player.playerName;
		var time = Math.random() * (PokerGame.MAX_SPECTATOR_DELAY - PokerGame.MIN_SPECTATOR_DELAY)
				 + PokerGame.MIN_SPECTATOR_DELAY;

		setTimeout(() => {
			this.currentTurn = player;
			if (this.players[uid]) {
				this.players[uid].send(Protocol.YOUR_TURN);

				// Give the player a time limit, fold if they
				// don't respond.
				this.playerWait = setTimeout(() => {
					player.fold();
				}, PokerGame.PLAYER_WAIT_TIME)
			}
		}, time);
	}

	/**
	 * Called when a game is over
	 */
	private onGameOver() {
		this.broadcastToPlayers(Protocol.GAME_OVER);

		this.gameOverCallback(this, this.players, this.spectators);
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
				if (split.length > 1) {
					var amount = parseInt(split[1]);
					if (!isNaN(amount) &&
							amount > 0 &&
							amount <= client.chips) {
						this.currentTurn.bet(parseInt(split[1]));
						broadcast = Protocol.BET + ':' + split[1] + ':' + num;
					}
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
			// Clear player wait time
			if (this.playerWait) {
				clearTimeout(this.playerWait);
				this.playerWait = null;
			}

			// Notify all players what just happened
			this.broadcastToPlayers(broadcast);
		} else {
			// Nothing happened, so we didn't understand the action
			if (this.players[uid])
				client.send(Protocol.WHAT_WAS_THAT);
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

		if (this.players[uid])
			client.send(Protocol.WIN + ':' + prize);
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
	 * @param {string} name The client name
	 * @param {number} startingChips The amount of starting chips
	 */
	public addPlayer(client : any, name : string, chips : number) {
		if (this.isStarted) return false;

		// Let everyone know someone joined
		this.broadcastToPlayers(Protocol.PLAYER_JOIN + ':' + this.playerCount + ',' + name);
		if (this.players[uid])
			client.send(Protocol.YOU_ARE + ':' + this.playerCount);

		// Update administrative variables
		var uid = this.getUid(client);
		this.players[uid] = client;
		this.playerNumbers[uid] = this.playerCount;
		this.playerNames[uid] = name;
		this.playerCount++;

		// Add the player to the game
		this.table.addPlayer({
		    playerName : uid,
		    chips : chips
		});

		console.log(uid + '(' + name + ') now has ' + chips + ' chips');
		console.log(this.playerCount + ' players now in game ' + this.gameId);

		this.checkStart();

		return true;
	}

	/**
	 * Adds a spectator to the game
	 * @param {any} client The client socket
	 */
	public addSpectator(client : any) {
		// Update administrative variables
		var uid = this.getUid(client);
		this.spectators[uid] = client;
	}

	/**
	 * Checks to see if we can start the game
	 */
	private checkStart() {
		if (this.isGameFull()) {
			this.stopCountDown();
			this.startGame();
		} else if (this.hasSufficientPlayers()) {
			console.log(this.playerCount + ' Players');
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
		if (this.countDown != null)
			clearInterval(this.countDown);
		this.countDown = null;
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
				this.players[uid].send(msg);
			}
		}

		// send to all spectators
		for (var uid in this.spectators) {
			if (this.spectators.hasOwnProperty(uid) &&
				typeof(this.spectators[uid]) != 'undefined') {
				this.spectators[uid].send(msg);
			}
		}
	}

	/**
	 * Removes a player from the game
	 * @param {string} uid The client socket uid
	 */
	public removePlayer(uid : string) {
		// Remove any spectators with the id
		if(this.spectators[uid])
			this.spectators[uid] = undefined;

		// If we don't have a player, exit now
		if (!this.players[uid]) return;

		var num = this.playerNumbers[uid];

		// Subtract player count
		this.playerCount--;

		// Delete reference
		this.players[uid] = undefined;
		this.playerNames[uid] = undefined;
		this.playerNumbers[uid] = undefined;

		// Remove from game
		console.log('removing player ' + uid + ' from game ' + this.gameId);
		this.table.removePlayer(uid);
		this.broadcastToPlayers(Protocol.PLAYER_LEFT + ':' + num);

		// See if we're in the middle of a game
		if (this.isStarted) {
			// If they leave on their turn, do a fold() for them
			if (this.currentTurn && this.currentTurn.playerName == uid) {
				this.currentTurn.fold();
			}

			if (this.playerCount <= 1) {
				this.onGameOver();
			}
		} else {
			this.updateStartingQueue();
		}
	}

	/**
	 *	Updates the waiting queue with the current players,
	 *	such that we don't get any empty seats.
	 */
	private updateStartingQueue() {
		this.stopCountDown();

		// Save players to transfer over (skipping empty seats)
		var savedPlayers = [];
		this.table.forEachPlayers((player) => {
			savedPlayers.push(player);
		});

		// Reinitialize the table
		this.initTable();

		// Replace players (no empty seats)
		for (var i = 0; i < savedPlayers.length; i++) {
			this.table.addPlayer({
			    playerName : savedPlayers[i].playerName,
			    chips : savedPlayers[i].chips
			});
		}

		this.checkStart();
	}

	/**
	 * @return {string} a comma seperated value list of
	 *                    player number,player name pairs
	 */
	private getPlayerCSV() {
		var result = [];
		this.table.forEachPlayers((player) => {
			var uid = player.playerName;
			result.push(this.playerNumbers[uid] + ',' + this.playerNames[uid]);
		});

		return result.join(',');
	}

	/**
	 * Starts the game
	 */
	public startGame() {
		console.log('starting game..');
		this.isStarted = true;
		this.table.startGame();
		this.broadcastToPlayers(Protocol.GAME_STARTED + ':' + this.getPlayerCSV());
		this.startCallback(this);
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

		// Don't listen to any clients that aren't in their turn.
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
		return client.uuid;
	}
}

export = PokerGame;