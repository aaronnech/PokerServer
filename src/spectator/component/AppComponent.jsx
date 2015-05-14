var React = require('react');
var PokerClient = require('../PokerClient');
var Constants = require('../Constants');

var PlayerComponent = require('./PlayerComponent.jsx');

/**
 * Encapsulates the entire application
 */
var AppComponent = React.createClass({
	/**
	 * Returns a thunk that when executed will change the screen.
	 */
	setScreenLater : function(screen) {
        var self = this;
		return function() {
			self.setState({active : screen});
		};
	},

    /**
     * Initalize the application, setting it to the home screen
     */
    getInitialState : function() {
        var api = new PokerClient(this.props.API);

        return {
            active : Constants.SCREENS.LOADING,
            API : api,
            revealedCards : [],
            players : [],
            timeTilStart : ''
        };
    },

    /**
     * Initialize after mount
     */
    componentDidMount : function() {
        var self = this;
        var api = this.state.API;

        api.bind('SHOW_CARD', this, function(action, card) {
            var added = this.state.revealedCards.slice(0);
            added.push(card);
            this.setState({revealedCards : added});
        });

        api.bind('GAME_STARTED', this, function(action, people) {
            var split = people.split(',');
            var players = [];
            for (var i = 0; i < split.length; i += 3) {
                players.push({
                    index : split[i],
                    name : split[i + 1],
                    chips : parseInt(split[i + 2])
                });
            }

            self.setState({players : players});
            self.setScreenLater(Constants.SCREENS.SPECTATE)()
        });

        api.bind('GAME_STARTING_IN', this, function(action, time) {
            self.setState({timeTilStart : time});
            if (self.state.active != Constants.SCREENS.STARTING)
                self.setScreenLater(Constants.SCREENS.STARTING)()
        });

        api.bind('GAME_OVER', this, function(action) {
            setTimeout(function() { 
                self.setState({revealedCards : [], players : []});
                self.setScreenLater(Constants.SCREENS.LOADING)()
                api.spectate();
            }, 3000);
        });

        api.connect(function() {
            api.spectate();
        });
    },

    /**
     * Render the application
     */
    render : function() {
        var isLoading = (this.state.active == Constants.SCREENS.LOADING);
        var isStarting = (this.state.active == Constants.SCREENS.STARTING);
        var isSpectate = (this.state.active == Constants.SCREENS.SPECTATE);

        return (
            <div id="app">
                <div className={"screen " + (isLoading ? "active" : "")}>
                    <p>Searching for game....</p>
                </div>
                <div className={"screen " + (isStarting ? "active" : "")}>
                    <p>Found Game! Starting in {this.state.timeTilStart} seconds</p>
                </div>
                <div className={"screen " + (isSpectate ? "active" : "")}>
                    <p>Community Cards: {this.state.revealedCards.join(',')}</p>

                    {this.state.players.map(function(player, i) {
                        return (
                            <PlayerComponent player={player} API={this.state.API} />
                        );
                    }.bind(this))}

                </div>
            </div>
        );
	}
});

module.exports = AppComponent;