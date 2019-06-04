import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import TableCell from '@material-ui/core/TableCell';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import MaterialHome from './materialhome';

let ws;

let id = 0;
function createRow(email) {
    id += 1;
    return {id, email};
}
class MaterialEmail extends React.Component {
    constructor(props) {
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

    handleMessage(msg) {
        const email = JSON.parse(msg.data);
        this.setState({emails: [...this.state.emails, createRow(email.email)]});
    }

    render() {
        if (this.state.home) return <MaterialHome/>;
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
                            {this.state.emails.map((email, idx) => (
                                <TableRow key={email.id}>
                                    <TableCell>{idx+1}</TableCell>
                                    <TableCell>{email.email}</TableCell>
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

export default MaterialEmail;
