var React : any = require('react');
var AppComponent : any = require('./component/AppComponent.jsx');

React.render(
    React.createElement(AppComponent, 
    	{
    		 'API' : 'wss://pokerbot.herokuapp.com'
    	}),
    document.getElementById('content'));