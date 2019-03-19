import React from 'react';
import ReactDOM from 'react-dom';
import Home from './home';
import './links.css';

/**
 *  Establishes WebSocket connection and asynchronously renders links
 * @class Links
 */
class Links extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            links: props.links,
            websocket: props.websocket
        };
        this.onHome = this.onHome.bind(this);
    }

    /**
     * Closes Websocket connection and renders home page.
     * @memeberof Links
     * @param {Object} event - event from selecting home button 
     */
    onHome() {
        ReactDOM.render(<Home/>, document.getElementById('root'));
    }

    /**
     * Renders Links display
     * @memberof Links
     */
    render() {
        let links = this.state.links;
        if (!links.length) {
            return <h1>Links Incoming <i className="fas fa-spinner fa-pulse"></i></h1>;
        }
        return (
            <React.Fragment>
            <h1>Links</h1>
            <ol>
                {
                    links.map(function(link, i) {
                        if (link.status) {
                            return <li className="good-link" key={i}>{link.name}</li>;
                        } else {
                            return <li className="bad-link" key={i}>{link.name}</li>;
                        }
                    }
                )}
            </ol>
            <input type='button' onClick={this.onHome} value='HOME' className='home-button'/>
            </React.Fragment>
        );
    }
}

export default Links;
