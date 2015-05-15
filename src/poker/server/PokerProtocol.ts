import Protocol = require('../../basic/Protocol');

/**
 * The protocol that the poker server communicates with
 */
class PokerProtocol extends Protocol {
	public static YOUR_TURN : string = 'your-turn';
	public static WHAT_WAS_THAT : string = 'what-was-that';
	public static CALL : string = 'call';
	public static BET : string = 'bet';
	public static FOLD : string = 'fold';
	public static ALL_IN : string = 'all-in';
	public static CHECK : string = 'check';
	public static WIN : string = 'win';
	public static DEAL : string = 'deal';
	public static BET_MADE : string = 'bet-made';
	public static SHOW_CARD : string = 'show-card';
	public static SHOWDOWN : string = 'showdown';
}

export = PokerProtocol;