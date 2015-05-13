var Poker = require('poker-engine');

/**
 * A poker game simulation
 */
class PokerGame {
	private static MINIMUM_PLAYERS : number = 2;
	private static COMMANDS = {
		NOT_STARTED : 'not-started',
		NOT_YOUR_TURN : 'not-your-turn',
		GAME_OVER : 'game-over',
		YOUR_TURN : 'your-turn',
		WHAT_WAS_THAT : 'what-was-that',
		SUCCESS : 'success',
		CALL : 'call',
		BET : 'bet',
		FOLD : 'fold',
		ALL_IN : 'all_in',
		CHECK : 'check',
		WIN : 'win'
	};

	// Unique id
	private static gameIdCounter : number = 0;
	private gameId : number;

	// Administrative
	private playerCount : number;
	private players : any;
	private playerNumbers : any;
	private isStarted : boolean;

	// Game state
	private table : any;
	private currentTurn : any;

	constructor() {
		// unique id
		this.gameId = ++PokerGame.gameIdCounter;

		// Setup
		this.players = {};
		this.playerNumbers = {};
		this.playerCount = 0;
		this.isStarted = false;
		this.currentTurn = null;

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
		this.players[uid].sendText(PokerGame.COMMANDS.YOUR_TURN + ':' + player.cards);
	}

	/**
	 * Called when a game is over
	 */
	private onGameOver() {
		for (var uid in this.players) {
			if (this.players.hasOwnProperty(uid)) {
				this.players[uid].sendText(PokerGame.COMMANDS.GAME_OVER);
			}
		}
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
			case PokerGame.COMMANDS.CALL:
				this.currentTurn.call();
				broadcast = PokerGame.COMMANDS.CALL + ':' + num;
				break;

			case PokerGame.COMMANDS.BET:
				if (split.length > 1 && !isNaN(parseInt(split[1]))) {
					this.currentTurn.bet(parseInt(split[1]));
					broadcast = PokerGame.COMMANDS.BET + ':' + split[1] + ':' + num;
				}
				break;

			case PokerGame.COMMANDS.FOLD:
				this.currentTurn.fold();
				broadcast = PokerGame.COMMANDS.FOLD + ':' + num;
				break;

			case PokerGame.COMMANDS.ALL_IN:
				this.currentTurn.allIn();
				broadcast = PokerGame.COMMANDS.ALL_IN + ':' + num;
				break;

			case PokerGame.COMMANDS.CHECK:
				this.currentTurn.check();
				broadcast = PokerGame.COMMANDS.ALL_IN + ':' + num;
				break;
		}

		if (broadcast != null) {
			client.sendText(PokerGame.COMMANDS.SUCCESS);
			// send the action to all other players
			// 
			for (var otherId in this.players) {
				if (this.players.hasOwnProperty(otherId) && otherId != uid) {
					this.players[otherId].sendText(broadcast);
				}
			}
		} else {
			client.sendText(PokerGame.COMMANDS.WHAT_WAS_THAT);
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

		client.sendText(PokerGame.COMMANDS.WIN);
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
		var uid = this.getUid(client);
		this.players[uid] = client;
		this.playerNumbers[uid] = this.playerCount;
		this.playerCount++;

		this.table.addPlayer({
		    playerName : uid,
		    chips: 300
		});

		console.log(this.playerCount + ' players now.');
		if (this.isGameFull()) {
			this.startGame();
		}
	}

	/**
	 * Removes a player from the game
	 * @param {any} client The client socket
	 */
	public removePlayer(client : any) {
		var uid = this.getUid(client);
		this.players[uid] = undefined;
		this.playerNumbers[uid] = undefined;
		this.playerCount--;
	}

	/**
	 * Starts the game
	 */
	public startGame() {
		console.log('starting game!');
		this.isStarted = true;
		this.table.startGame();
	}

	/**
	 * @return true if the game is full, false otherwise.
	 */
	public isGameFull() {
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
			client.sendText(PokerGame.COMMANDS.NOT_STARTED);
		} else if(this.currentTurn && this.currentTurn.playerName == uid) {
			this.onPlayerMove(data);
		} else {
			client.sendText(PokerGame.COMMANDS.NOT_YOUR_TURN);
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