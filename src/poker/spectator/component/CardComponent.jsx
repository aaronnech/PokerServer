var React = require('react');
var Constants = require('../Constants');

/**
 * Encapsulates a card
 */
var CardComponent = React.createClass({

    /**
     * Initalize the application, setting it to the home screen
     */
    getInitialState : function() {
        return {};
    },

    /**
     * Initialize after mount
     */
    componentDidMount : function() {

    },

    /**
     * Render the application
     */
    render : function() {
        var isDown = (this.props.down);
        var cardHtml = null;
        if (isDown) {
            cardHtml = (<img src='img/cards/card-back.svg' className='card-face' />);
        } else {
            cardHtml = (<img src={'img/cards/' + this.props.card + '.svg'} className='card-face' />);
        }

        return (
            <div className='card'>
                {cardHtml}
            </div>
        );
	}
});

module.exports = CardComponent;