import Protocol = require('../server/PokerProtocol');

/**
 * A Client that interacts with a poker server
 */
class PokerClient {
	private hooks : any;
	private url : string;
	private sock : any;

	constructor(url : string) {
		this.url = url;
		this.sock = null;
		this.hooks = {};

		for (var target in Protocol) {
			if (Protocol.hasOwnProperty(target)) {
				this.hooks[target] = [];
			}
		}
	}

	/**
	 * Binds to a target
	 * @param {string}   target The target
	 * @param {any}      who    Who is binding
	 * @param {Function} func   The function to call
	 */
	public bind(target : string, who : any, func : Function) {
		if (typeof(this.hooks[target]) != 'undefined') {
			this.hooks[target].push({who : who, f : func});
		}
	}

	/**
	 * unbinds from a target
	 * @param {string}   target The target
	 * @param {any}      who    Who is unbinding
	 */
	public unbind(target : string, who : any) {
		if (typeof(this.hooks[target]) != 'undefined') {
			var index = -1;
			for (var i = 0; i < this.hooks[target].length; i++) {
				if (this.hooks[target][i].who == who) {
					index = i;
					break;
				}
			}

			if (index != -1) {
				this.hooks[target].splice(index, 1)
			}
		}
	}

	/**
	 * Applies a binding of a particular target with the given arguments
	 */
	private applyBindings(target : string, args : any[]) {
		for (var i = 0; i < this.hooks[target].length; i++) {
			this.hooks[target][i].f.apply(this.hooks[target][i].who, args);
		}
	}

	/**
	 * Called when data is passed from the server
	 * @param {string} data The data
	 */
	private onData(data : string) {
		var split = data.split(':');
		var passed = split[0];

		// Find target
		var target = null;
		for (var key in Protocol) {
			if (Protocol.hasOwnProperty(key) &&
				Protocol[key] == passed) {
				target = key;
			}
		}

		if (target)
			this.applyBindings(target, split);
	}

	/**
	 * Starts spectating on a game
	 */
	public spectate() {
		this.safeSend(Protocol.SPECTATE_GAME);
	}

	/**
	 * Safely send a message
	 * @param {string} msg The message
	 */
	private safeSend(msg : string) {
		if (this.sock)
			this.sock.send(msg);
	}

	/**
	 * Connects to the server
	 * @param {Function} callback Callback to call when done
	 */
	public connect(callback : Function) {
		this.sock = new WebSocket(this.url);

		this.sock.onopen = (event) => {
			callback();
		};

		this.sock.onmessage = (event) => {
			this.onData(event.data);
		};

		this.sock.onclose = (event) => {

		};
	}
}

export = PokerClient;