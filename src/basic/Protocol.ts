/**
 * The protocol that the game server communicates with
 */
class Protocol {
	public static GAME_OVER : string = 'game-over';
	public static GAME_STARTED : string = 'game-started';
	public static GAME_STARTING_IN : string = 'start-in';
	public static JOIN_GAME : string = 'join-game';
	public static SPECTATE_GAME : string = 'spectate-game';
	public static PLAYER_LEFT : string = 'player-left';
	public static PLAYER_JOIN : string = 'player-join';
	public static YOU_ARE : string = 'you-are';
}

export = Protocol;