/**
 * The protocol that the poker server communicates with
 */
class PokerProtocol {
	public static GAME_OVER : string = 'game-over';
	public static GAME_STARTED : string = 'game-started';
	public static YOUR_TURN : string = 'your-turn';
	public static WHAT_WAS_THAT : string = 'what-was-that';
	public static GAME_STARTING_IN : string = 'start-in';
	public static CALL : string = 'call';
	public static BET : string = 'bet';
	public static FOLD : string = 'fold';
	public static ALL_IN : string = 'all-in';
	public static CHECK : string = 'check';
	public static WIN : string = 'win';
	public static DEAL : string = 'deal';
	public static BET_MADE : string 'bet-made';
	public static JOIN_GAME : string = 'join-game';
	public static SPECTATE_GAME : string = 'spectate-game';
	public static SHOW_CARD : string = 'show-card';
	public static PLAYER_LEFT : string = 'player-left';
	public static PLAYER_JOIN : string = 'player-join';
	public static YOU_ARE : string = 'you-are';
	public static SHOWDOWN : string = 'showdown';
}

export = PokerProtocol;