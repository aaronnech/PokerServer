var React = require('react');
var Constants = require('../Constants');

/**
 * Encapsulates a card
 */
var CommunityCardsComponent = React.createClass({

    /**
     * Initalize the application, setting it to the home screen
     */
    getInitialState : function() {
        return {
            money : 0
        };
    },

    /**
     * Called at the end of the lifecycle
     */
    componentWillUnmount : function() {
        var api = this.props.API;
        api.unbind('BET_MADE', this);
        api.unbind('GAME_OVER', this);
        api.unbind('GAME_STARTED', this);
    },

    /**
     * Initialize after mount
     */
    componentDidMount : function() {
        var api = this.props.API;

        api.bind('BET_MADE', this, function(action, amt, person) {
            this.setState({money : this.state.money + parseInt(amt)});
        });

        api.bind('GAME_OVER', this, function(action, amt, person) {
            this.setState({money : 0});
        });

        api.bind('GAME_STARTED', this, function(action, amt, person) {
            this.setState({money : 0});
        });
    },

    /**
     * Render the pot
     */
    render : function() {
        return (
            <div className='pot center'>
                ${this.state.money}.00
            </div>
        );
	}
});

module.exports = CommunityCardsComponent;