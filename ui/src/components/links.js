import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import TableCell from '@material-ui/core/TableCell';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import MaterialHome from './home';

let ws;

let id = 0;
function createRow(link, status) {
    id += 1;
    return {id, link, status};
}
class MaterialLinks extends React.Component {
    constructor(props) {
        super(props);
        this.state = {linkStatus: [], home: false};
        ws = new WebSocket('ws://127.0.0.1:8080/links?url=' + encodeURIComponent(props.url));
        ws.onmessage = this.handleMessage.bind(this); 
        this.onHome = this.onHome.bind(this);
    }

    onHome() {
        ws.close();
        this.setState({home: true});
    }

    handleMessage(msg) {
        const linkStatus = JSON.parse(msg.data);
        this.setState({linkStatus: [...this.state.linkStatus, createRow(linkStatus.link, linkStatus.status)]});
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
                                <TableCell>Link</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {this.state.linkStatus.map((linkStatus, idx) => (
                                <TableRow key={linkStatus.id}>
                                    <TableCell>{idx+1}</TableCell>
                                    <TableCell>{linkStatus.link}</TableCell>
                                    <TableCell>{linkStatus.status}</TableCell>
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

export default MaterialLinks;
