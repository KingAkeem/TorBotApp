import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import TableCell from '@material-ui/core/TableCell';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Home from './home';

let ws: WebSocket;
let id = 0;
function createRow(email: string) {
    id += 1;
    return {id, email};
}

type EmailProps = {
    url: string
}

type EmailState = {
    emails: Array<{email: string, id: number}>,
    home: boolean
}

export default class Email extends React.Component<EmailProps, EmailState> {
    constructor(props: EmailProps) {
        super(props);
        this.state = {emails: [], home: false};
        ws = new WebSocket('ws://127.0.0.1:8080/emails?url=' + encodeURIComponent(props.url));
        ws.onmessage = this.handleMessage.bind(this); 
        this.onHome = this.onHome.bind(this);
    }

    onHome() {
        ws.close();
        this.setState({home: true});
    }

    handleMessage(msg: MessageEvent) {
        const data = JSON.parse(msg.data);
        this.setState({emails: [...this.state.emails, createRow(data.email)]});
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
