import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import TableCell from '@material-ui/core/TableCell';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Home from './home';
import simpleRequest from '../lib/simpleRequest';

let id = 0;
const createRow = (email: string) => {
    id += 1;
    return {id, email};
}

const parseEmails = (html: string) => {
    const parser = new DOMParser();
    const dom = parser.parseFromString(html, 'text/html');
    const tags = dom.getElementsByTagName('a');
    const emails = new Array();
    for (let i = 0; i < tags.length; i++) {
        const item = tags.item(i);
        const itemAttrs = item.attributes;
        for (let j = 0; j < itemAttrs.length; j++) {
            const attr = itemAttrs.item(j);
            const value = attr.nodeValue;
            if (value.includes('mailto:')) {
                emails.push(createRow(value.split(':')[1]));
            }
        }
    }
    return emails;
};

type EmailProps = {
    url: string
    tor: boolean
}

type EmailState = {
    emails: Array<{email: string, id: string}>,
    home: boolean
}

export default class Email extends React.Component<EmailProps, EmailState> {
    constructor(props: EmailProps) {
        super(props);
        this.state = {emails: [], home: false};
        this.onHome = this.onHome.bind(this);
    }

    onHome() {
        this.setState({home: true});
    }

    componentDidMount() {
        simpleRequest({
            method: 'GET',
            url: this.props.url,
            tor: this.props.tor
        }).then(response => this.setState({emails: parseEmails(response.body)}))
        .catch(error => console.error(error));
    }

    render() {
        if (this.state.home) return <Home/>;
        return (
            <form>
                <Paper>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Index</TableCell>
                                <TableCell>Email</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {this.state.emails.map((data, idx) => (
                                <TableRow key={data.id}>
                                    <TableCell>{idx+1}</TableCell>
                                    <TableCell>{data.email}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
                <br/>
                <Button onClick={this.onHome} variant="contained" color="primary">
                    HOME
                </Button>
            </form>
        );
    }
}