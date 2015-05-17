var React = require('react');
var Constants = require('../Constants');

var CardComponent = require('./CardComponent.jsx');

/**
 * Encapsulates a card
 */
var CommunityCardsComponent = React.createClass({

    /**
     * Initalize the application, setting it to the home screen
     */
    getInitialState : function() {
        return {};
    },

    /**
     * Render the application
     */
    render : function() {
        var cards = this.props.cards.slice(0);
        var amountLeft = 5 - cards.length;
        
        for (var i = 0; i < amountLeft; i++) {
            cards.push(null);
        }

        return (
            <div className='community-cards center'>
                {cards.map(function(card, i) {
                    if (card == null) {
                        return (<CardComponent card={null} down={true} />);
                    } else {
                        return (<CardComponent card={card} down={false} />);
                    }
                }.bind(this))}
            </div>
        );
	}
});

module.exports = CommunityCardsComponent;