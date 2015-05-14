var React : any = require('react');
var AppComponent : any = require('./component/AppComponent.jsx');

var host = location.origin.replace(/^http/, 'ws');

React.render(
    React.createElement(AppComponent, 
    	{
    		 'API' : host
    	}),
    document.getElementById('content'));