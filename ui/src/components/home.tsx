import React, { KeyboardEvent, ReactNode, MouseEvent } from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import { withStyles } from '@material-ui/core/styles';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Email from './email';
import Info from './info';
import Links from './links';
import makeRequest from '../lib/makeRequest';
import isValidUrl from '../lib/isValidUrl';
import './home.css';
import { string } from 'prop-types';

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

const getHeaderMap = (request: XMLHttpRequest): Map<string, string> => {
    const headers = request.getAllResponseHeaders();
    const arr = headers.trim().split(/[\r\n]+/);
    const headerMap = new Map();

    arr.forEach(line => {
      var parts = line.split(': ');
      var header = parts.shift();
      var value = parts.join(': ');
      headerMap.set(header, value);
    });

    return headerMap;
}

type HomeState = {
    option: string,
    url: string,
    info: Map<string, string>,
    submit: boolean
};

type HomeProps = {};

export default class Home extends React.Component<HomeProps, HomeState> {
    constructor(props: HomeProps) {
        super(props);
        this.state = {option: LINKS, url: '', info: new Map(), submit: false}; 
        this.handleTextChange = this.handleTextChange.bind(this);
        this.handleSelectChange = this.handleSelectChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.keyPress = this.keyPress.bind(this);
    }

    handleSubmit(event:  MouseEvent) {
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
                makeRequest('GET', this.state.url)
                    .then(response => {
                        const headers = getHeaderMap(response);
                        this.setState({'info': headers});
                        this.setState({'submit': true});
                    })
                    .catch(error => {
                        console.error(error);
                    })
                break;
        }
    }
    
    handleTextChange(event: React.ChangeEvent<HTMLInputElement>) {
        this.setState({url: event.target.value});
    }

    handleSelectChange(event: React.ChangeEvent<HTMLSelectElement>, child: ReactNode) {
        this.setState({option: event.target.value});
    }

    keyPress(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.handleSubmit(event as unknown as MouseEvent);
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
