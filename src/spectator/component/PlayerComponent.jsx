var React = require('react');
var PokerClient = require('../PokerClient');
var Constants = require('../Constants');

/**
 * Encapsulates the entire application
 */
var PlayerComponent = React.createClass({

    /**
     * Initalize the state
     */
    getInitialState : function() {
        return {
            cards : null,
            lastAction : null,
            chips : this.props.chips
        };
    },

    /**
     * Called at the end of the lifecycle
     */
    componentWillUnmount : function() {
        var api = this.props.API;
        api.unbind('SHOWDOWN', this);
        api.unbind('CALL', this);
        api.unbind('CHECK', this);
        api.unbind('FOLD', this);
        api.unbind('ALL_IN', this);
        api.unbind('BET', this);
    },

    /**
     * Initialize after mount
     */
    componentDidMount : function() {
        var self = this;
        var player = this.props.player;
        var index = player.index;
        var api = this.props.API;

        api.bind('SHOWDOWN', this, function(action, person, cards) {
            if (person == index) {
                // This is us
                this.setState({cards : cards});
            }
        });

        api.bind('CALL', this, function(action, person) {
            if (person == index) {
                // This is us
                this.setState({lastAction : action});
            }
        });

        api.bind('FOLD', this, function(action, person) {
            if (person == index) {
                // This is us
                this.setState({lastAction : action});
            }
        });

        api.bind('CHECK', this, function(action, person) {
            if (person == index) {
                // This is us
                this.setState({lastAction : action});
            }
        });

        api.bind('ALL_IN', this, function(action, person) {
            if (person == index) {
                // This is us
                this.setState({lastAction : action});
            }
        });

        api.bind('BET', this, function(action, amt, person) {
            if (person == index) {
                // This is us
                this.setState({lastAction : action + ' $' + amt});
            }
        });

        api.bind('BET_MADE', this, function(action, amt, person) {
            if (person == index) {
                // This is us
                this.setState({chips : this.state.chips - parseInt(amt)});
            }
        })
    },

    /**
     * Render the application
     */
    render : function() {
        var player = this.props.player;
        var index = player.index;
        var name = player.name;
        var cards = this.state.cards;
        var action = this.state.lastAction;

        return (
            <div className="player">
                <p><strong>{name}</strong>:</p>
                <p>Money: {chips}$</p>
                <p>Cards: {cards ? cards : '-,-'}</p>
                <p>Last Action: {action ? action : 'N/A'}</p>
            </div>
        );
	}
});

module.exports = PlayerComponent;