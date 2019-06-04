import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import { withStyles } from '@material-ui/core/styles';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Email from './email';
import Info from './info';
import Links from './links';
import './home.css';

const StyledTextField = withStyles({
    root: {
        'background-color': 'white',
        'margin-bottom': 5,
        'padding': 5,
        'border-radius': 6
    }
})(TextField);

const StyledSelect = withStyles({
    root: {
        'background-color': 'white',
        'margin-bottom': 5, 
        'padding': 5,
        'border-radius': 6
    }
})(Select);

const LINKS = 'GET_LINKS';
const INFO = 'GET_INFORMATION';
const EMAILS = 'GET_EMAILS';

function makeRequest(method, url, data) {
    return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.onload = function() {
                if (this.status >= 200 && this.status < 300) {
                    resolve({
                        response: xhr.response
                    });
                } else {
                    reject({
                        status: this.status,
                        statusText: xhr.statusText
                    });
                }
            };
            xhr.onerror = function() {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            };
            xhr.send(JSON.stringify(data));
        });
}

function isValidUrl(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    const valid = !!pattern.test(str);
    try {
        const url = new URL(str);
        return valid;
    } catch(_) {
        return false;
    }
}

function getInformation(url) {
    const promise = makeRequest('GET', 'http://127.0.0.1:8080/info?url=' + url)
        .then(responseObj => {
            const text = JSON.parse(responseObj.response);
            return {
                'text': text
            };
        })
        .catch(err => {
            return err;
        });
    return promise; 
}

export default class Home extends React.Component {
    constructor(props) {
        super(props);
        this.state = {option: LINKS, url: '', info: null, submit: false};
        this.handleTextChange = this.handleTextChange.bind(this);
        this.handleSelectChange = this.handleSelectChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.keyPress = this.keyPress.bind(this);
    }

    handleSubmit(event) {
        event.preventDefault();
        if (!isValidUrl(this.state.url)) {
            alert('Invalid URL');
            return;
        }
        switch (this.state.option) {
            case LINKS:
            case EMAILS:
                this.setState({'submit': true});
                break;
            case INFO:
                getInformation(this.state.url)
                    .then(info => {
                        this.setState({'info': info.text});
                        this.setState({'submit': true});
                    })
                    .catch(err => {
                        console.log(err);
                    });
                break;
        }
    }
    
    handleTextChange(event) {
        this.setState({url: event.target.value});
    }

    handleSelectChange(event) {
        this.setState({option: event.target.value});
    }

    keyPress(event) {
        if (event.key === 'Enter') {
            this.handleSubmit(event);
        }
    }

    render() {
        if (!this.state.submit) {
            return (
                <form>
                    <StyledTextField label="URL" onKeyDown={this.keyPress} onChange={this.handleTextChange} fullWidth={true}/>
                    <br/>
                    <StyledSelect value={this.state.option} onChange={this.handleSelectChange}>
                        <MenuItem value={LINKS}>Get Links</MenuItem>
                        <MenuItem value={INFO}>Get Information</MenuItem>
                        <MenuItem value={EMAILS}>Get Emails</MenuItem>
                    </StyledSelect>
                    <br/>
                    <Button onClick={this.handleSubmit} variant="contained" color="primary">
                        Submit
                    </Button>
                </form>
            );
        }
        switch (this.state.option) {
            case INFO:
                return <Info info={this.state.info}/>;
            case LINKS:
                return <Links url={this.state.url}/>;
            case EMAILS:
                return <Email url={this.state.url}/>;
            default:
                console.log('Invalid option.');
        }
    }
}
