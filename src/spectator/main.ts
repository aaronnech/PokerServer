var React : any = require('react');
var AppComponent : any = require('./component/AppComponent.jsx');

React.render(
    React.createElement(AppComponent, 
    	{
    		 'API' : 'ws://localhost:1337'
    	}),
    document.getElementById('content'));