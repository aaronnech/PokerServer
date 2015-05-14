var React : any = require('react');
var AppComponent : any = require('./component/AppComponent.jsx');

React.render(
    React.createElement(AppComponent, 
    	{
    		 'API' : 'ws://45.55.179.213:1337'
    	}),
    document.getElementById('content'));