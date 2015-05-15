/**
 * A poker engine adapter interface to allow
 * interchangable poker engines.
 */
interface PokerEngineAdapter {
	// Constructor arguments:
	// min_blind : number, max_blind : number, min_players : number, max_players : number

	/**
	 * Binds and event to the poker engine
	 * @param {string}   evnt     Event to bind 
	 * @param {Function} callback Callback to call with the event data
	 */
	on(evnt : string, callback : Function) : void;

	/**
	 * Adds a player to the game
	 * @param {any} playerObj Object containing the name and chips
	 */
	addPlayer(playerObj : any) : void;

	/**
	 * Removes a player from an active game by name.
	 * @param {string} playerName The player to remove.
	 */
	removePlayer(playerName : string) : void;

	/**
	 * Calls the given callback for each active player.
	 * @param {Function} callback Callback to call
	 */
	forEachPlayers(callback : Function) : void;

	/**
	 * Starts the game
	 */
	startGame() : void;

	/**
	 * @return {any[]} An array of player objects (has properties playerName, cards, chips)
	 */
	getPlayerObjs() : any[];
}

export = PokerEngineAdapter;