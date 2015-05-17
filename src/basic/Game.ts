import Protocol = require('./Protocol');

/**
 * A game simulation with remote players
 */
class Game {
	// Count down interval in millisecs
	private static COUNT_DOWN_INTERVAL : number = 1000;

	// Count down number of intervals
	private static COUNT_DOWN_NUMBER : number = 5;

	// Unique id
	private static gameIdCounter : number = 0;
	private gameId : number;

	// Administrative
	private minPlayers : number;
	private maxPlayers : number
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

	/**
	 * Constructs a new Game simulation with the given callbacks
	 * @param {Function} gameOverCallback Called when the game ends
	 * @param {Function} startCallback    Called when the game starts
	 */
	constructor(gameOverCallback : Function, startCallback : Function, minPlayers : number, maxPlayers : number) {
		// unique id
		this.gameId = ++Game.gameIdCounter;
		Game.gameIdCounter %= 2000000000;

		// Setup
		this.minPlayers = minPlayers;
		this.maxPlayers = maxPlayers
		this.spectators = {};
		this.players = {};
		this.playerNumbers = {};
		this.playerNames = {};
		this.playerCount = 0;
		this.isStarted = false;
		this.countDownTimes = 0;
		this.countDown = null;

		this.gameOverCallback = gameOverCallback;
		this.startCallback = startCallback;

		this.initEngine();
	}

	/**
	 * Initializes the game engine
	 */
	protected initEngine() {
		throw 'Error: not implemented.';
	}

	/**
	 * Called when a game is over
	 */
	protected onGameOver() {
		this.broadcastToPlayers(Protocol.GAME_OVER);

		this.gameOverCallback(this, this.players, this.spectators);
	}

	/**
	 * @param {string} uid The uid of the client
	 * @return {any} The client socket from the given uid
	 */
	protected getClientByUid(uid : string) {
		return this.players[uid];
	}

	/**
	 * @param {string} uid The uid of the client
	 * @return {any} The client's network id for this game
	 */
	protected getClientNetIdByUid(uid : string) {
		return this.playerNumbers[uid];
	}

	/**
	 * @param {string} uid The uid of the client
	 * @return {any} The client's network id for this game
	 */
	protected getClientPlayerNameByUid(uid : string) {
		return this.playerNames[uid];
	}

	/**
	 * Gets the game id
	 * @return {number} The game id
	 */
	public getId() {
		return this.gameId;
	}

	/**
	 * @return {boolean} True if the game has started, false otherwise.
	 */
	public isGameStarted() {
		return this.isStarted;
	}

	/**
	 * Adds a player to the game
	 * @param {any} client The client socket
	 * @param {string} name The client name
	 * @param {number} startingChips The amount of starting chips
	 */
	public addPlayer(client : any, name : string) {
		if (this.isStarted) return false;

		// Let everyone know someone joined
		this.broadcastToPlayers(Protocol.PLAYER_JOIN + ':' + this.playerCount + ',' + name);

		// Update administrative variables
		var uid = this.getUid(client);
		this.players[uid] = client;
		this.playerNumbers[uid] = this.playerCount;
		this.playerNames[uid] = name;
		this.playerCount++;

		console.log(uid + '(' + name + ') now has ' + client.chips + ' chips');
		console.log(this.playerCount + ' players now in game ' + this.gameId);

		if (this.players[uid])
			client.send(Protocol.YOU_ARE + ':' + (this.playerCount - 1));

		this.checkStart();

		return true;
	}

	/**
	 * @return {number} The number of players in the game
	 */
	public getPlayerCount() {
		return this.playerCount;
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
	protected checkStart() {
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
	protected startCountDown() {
		this.countDownTimes = Game.COUNT_DOWN_NUMBER;
		this.countDown = setInterval(() => {
			if (this.countDown == null) return;
			if (!this.hasSufficientPlayers()) {
				this.stopCountDown();
				return;
			}

			this.countDownTimes--;
			if (this.countDownTimes <= 0) {
				this.stopCountDown();
				this.startGame();
			} else {
				console.log('starting in... ' + this.countDownTimes);
				this.broadcastToPlayers(
					Protocol.GAME_STARTING_IN + ':' + this.countDownTimes);
			}
		}, Game.COUNT_DOWN_INTERVAL);
	}

	/**
	 * Stops the countdown to play
	 */
	protected stopCountDown() {
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
	 * @return {number} 1 if a spectator was removed, 2 if
	 *                    if a player was removed.
	 */
	public removePlayer(uid : string) {
		// Remove any spectators with the id
		if(this.spectators[uid]) {
			this.spectators[uid] = undefined;
			return 1;
		}

		var num = this.playerNumbers[uid];

		// Subtract player count
		this.playerCount--;

		// Delete reference
		this.players[uid] = undefined;
		this.playerNames[uid] = undefined;
		this.playerNumbers[uid] = undefined;

		// Remove from game
		console.log('removing player ' + uid + ' from game ' + this.gameId);
		this.broadcastToPlayers(Protocol.PLAYER_LEFT + ':' + num);

		if (this.isGameStarted() && this.playerCount < this.minPlayers) {
			this.onGameOver();
		}

		return 2;
	}

	/**
	 * @return {string} a comma seperated value list of
	 *                    player number,player name pairs
	 */
	protected getPlayerCSV() {
		throw 'Error: not implemented';
	}

	/**
	 * Starts the game
	 */
	public startGame() {
		console.log('starting game..');
		this.isStarted = true;
		this.broadcastToPlayers(Protocol.GAME_STARTED + ':' + this.getPlayerCSV());
		this.startCallback(this);
	}

	/**
	 * @return true if the game is full, false otherwise.
	 */
	public isGameFull() {
		return this.playerCount >= this.maxPlayers;
	}

	/**
	 * @return true if the game has enough players to start, false otherwise.
	 */
	public hasSufficientPlayers() {
		return this.playerCount >= this.minPlayers;
	}

	/**
	 * Called when a player sends the game data
	 * @param {any} client The client socket
	 * @param {string} data The client data
	 */
	public onPlayerData(client : any, data : string) {
		throw 'Error: not implemented';
	}

	/**
	 * Gets a UID from a client socket
	 * @param {any} client The client socket
	 * @return {string} the Uid
	 */
	protected getUid(client : any) {
		return client.uuid;
	}
}

export = Game;