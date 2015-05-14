import PokerEngineAdapter = require('./PokerEngineAdapter');
var Poker = require('./engine');

/**
 * Adapter for the node js poker-engine
 */
class NodePokerEngineAdapter implements PokerEngineAdapter {
	private table : any;

	constructor(minBlind : number, maxBlind : number, minPlayers : number, maxPlayers : number) {
		this.table = new Poker.Table(minBlind, maxBlind, minPlayers, maxPlayers);
	}

	/**
	 * Binds and event to the poker engine
	 * @param {string}   evnt     Event to bind 
	 * @param {Function} callback Callback to call with the event data
	 */
	public on(evnt : string, callback : Function) {
		this.table.on(evnt, callback);
	}

	/**
	 * Adds a player to the game
	 * @param {any} playerObj Object containing the name and chips
	 */
	public addPlayer(playerObj : any) {
		this.table.addPlayer(playerObj);
	}

	/**
	 * Removes a player from an active game by name.
	 * @param {string} playerName The player to remove.
	 */
	public removePlayer(playerName : string) {
		this.table.removePlayer(playerName);
	}

	/**
	 * Calls the given callback for each active player.
	 * @param {Function} callback Callback to call
	 */
	public forEachPlayers(callback : Function) {
		this.table.forEachPlayers(callback);
	}

	/**
	 * Starts the game
	 */
	public startGame() {
		this.table.startGame();
	}

	/**
	 * @return {any[]} An array of player objects (has properties playerName, cards, chips)
	 */
	public getPlayerObjs() : any[] {
		return this.table.players;
	}
}

export = NodePokerEngineAdapter;