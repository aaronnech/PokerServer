import Protocol = require('./PokerProtocol');
import Game = require('../../basic/Game');
import PokerEngineAdapter = require('./PokerEngineAdapter');
import NodePokerEngineAdapter = require('./NodePokerEngineAdapter');

/**
 * A poker game simulation with remote players
 */
class PokerGame extends Game {
	// Time to wait for player to make their turn
	private static PLAYER_WAIT_TIME : number = 20000;

	// Time to delay between turns
	private static MIN_SPECTATOR_DELAY : number = 1000;
	private static MAX_SPECTATOR_DELAY : number = 3000;

	// Min, max players
	private static MIN_PLAYERS : number = 2;
	private static MAX_PLAYERS : number = 6;

	// Number of chips we start with
	private static STARTING_CHIPS : number = 300;


	// Wait for player to make a move timeout
	private playerWait : any;

	// Game state
	private engineAdapter : PokerEngineAdapter;
	private currentTurn : any;

	/**
	 * Constructs a new PokerGame simulation with the given callbacks
	 * @param {Function} gameOverCallback Called when the game ends
	 * @param {Function} startCallback    Called when the game starts
	 */
	constructor(gameOverCallback : Function, startCallback : Function) {
		super(gameOverCallback, startCallback, PokerGame.MIN_PLAYERS, PokerGame.MAX_PLAYERS);
	}

	/**
	 * Initializes the poker table
	 */
	protected initEngine() {
		this.currentTurn = null;

		// Game state setup
		// min blind, max blind, min players, max players
		this.engineAdapter = new NodePokerEngineAdapter(
			10, 20, PokerGame.MIN_PLAYERS, PokerGame.MAX_PLAYERS);

		this.engineAdapter.on("deal", (player) => {
			this.onPlayerDeal(player);
		});

		this.engineAdapter.on("showCard", (card) => {
			this.onShowCard(card);
		});

		this.engineAdapter.on("betMade", (player, bet) => {
			this.onBetMade(player, bet);
		});

		this.engineAdapter.on("turn", (player) => {
			this.onPlayerTurn(player);
		});

		this.engineAdapter.on("win", (player, prize) => {
		    this.onPlayerWin(player, prize);
		});

		this.engineAdapter.on("roundShowDown", () => {
			this.onShowDown();
		});

		this.engineAdapter.on("gameOver", () => {
		    this.onGameOver();
		});
	}

	/**
	 * Called when showdown happens revealing all cards
	 */
	private onShowDown() {
		this.engineAdapter.forEachPlayers((player) => {
			var uid = player.playerName
			var num = this.getClientNetIdByUid(uid);
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
		if (this.getClientByUid(uid))
			this.getClientByUid(uid).send(Protocol.DEAL + ':' + player.cards.join(','));
	}

	/**
	 * Called when a player successfully makes a bet.
	 * @param {any} player Poker Player
	 * @param {number} bet The amount bet
	 */
	private onBetMade(player, bet) {
		var uid = player.playerName;
		var num = this.getClientNetIdByUid(uid);
		this.broadcastToPlayers(Protocol.BET_MADE + ':' + bet + ':' + num);
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
			if (this.getClientByUid(uid)) {
				this.getClientByUid(uid).send(Protocol.YOUR_TURN);

				// Give the player a time limit, fold if they
				// don't respond.
				this.playerWait = setTimeout(() => {
					player.fold();
				}, PokerGame.PLAYER_WAIT_TIME)
			}
		}, time);
	}

	/**
	 * Called when the current player turn sends a response
	 * @param {string} data Response
	 */
	private onPlayerMove(data : string) {
		var split = data.split(':');
		var uid = this.currentTurn.playerName;
		var num = this.getClientNetIdByUid(uid);
		var client = this.getClientByUid(uid);

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
			if (this.getClientByUid(uid))
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
		var client = this.getClientByUid(uid);

		// Update the chips
		for (var i = 0; i < this.engineAdapter.getPlayerObjs().length; i++) {
			var player = this.engineAdapter.getPlayerObjs()[i];
			var id = player.playerName;

			if (this.getClientByUid(id)) {
				this.getClientByUid(id).chips = player.chips;
			}
		}

		if (client)
			client.send(Protocol.WIN + ':' + prize);
	}

	/**
	 * Adds a player to the game
	 * @param {any} client The client socket
	 * @param {string} name The client name
	 * @param {number} startingChips The amount of starting chips
	 */
	public addPlayer(client : any, name : string) {
		var superResult = super.addPlayer(client, name);
		if (!superResult) return false;

		// Ensure we have at least the minimum chips
		if (!client.chips || client.chips < PokerGame.STARTING_CHIPS) {
			client.chips = PokerGame.STARTING_CHIPS;
		}

		var uid = this.getUid(client);

		// Add the player to the game
		this.engineAdapter.addPlayer({
		    playerName : uid,
		    chips : client.chips
		});

		return true;
	}

	/**
	 * Removes a player from the game
	 * @param {string} uid The client socket uid
	 */
	public removePlayer(uid : string) {
		super.removePlayer(uid);

		// If we don't have a player, exit now
		if (!this.getClientByUid(uid)) return;

		this.engineAdapter.removePlayer(uid);

		// See if we're in the middle of a game
		if (this.isGameStarted()) {
			// If they leave on their turn, do a fold() for them
			if (this.currentTurn && this.currentTurn.playerName == uid) {
				this.currentTurn.fold();
			}

			if (this.getPlayerCount() <= 1) {
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
		this.engineAdapter.forEachPlayers((player) => {
			savedPlayers.push(player);
		});

		// Reinitialize the table
		this.initEngine();

		// Replace players (no empty seats)
		for (var i = 0; i < savedPlayers.length; i++) {
			this.engineAdapter.addPlayer({
			    playerName : savedPlayers[i].playerName,
			    chips : savedPlayers[i].chips
			});
		}

		this.checkStart();
	}

	/**
	 * @return {string} a comma seperated value list of
	 *                    player number,player,chips name triples
	 */
	protected getPlayerCSV() {
		var result = [];
		this.engineAdapter.forEachPlayers((player) => {
			var uid = player.playerName;
			var chips = player.chips;
			var name = this.getClientPlayerNameByUid(uid);
			result.push(this.getClientNetIdByUid(uid) + ',' + name + ',' + chips);
		});

		return result.join(',');
	}

	/**
	 * Starts the game
	 */
	public startGame() {
		this.engineAdapter.startGame();
		super.startGame();
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
}

export = PokerGame;