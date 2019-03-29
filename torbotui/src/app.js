import React from 'react';
import MaterialHome from './components/materialhome';
import './app.css';

/**
 * Entrypoint for TorBot app, displays home-page
 * @class App
 */
class App extends React.Component {
    render() {
        return <MaterialHome/>;
        //return <Home/>;
    }
}

export default App;
