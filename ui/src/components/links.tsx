import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import TableCell from '@material-ui/core/TableCell';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Home from './home';
import { LinkProps } from '@material-ui/core/Link';

let ws: WebSocket;

let id = 0;
function createRow(link: string, status: string) {
    id += 1;
    return {id, link, status};
}

type LinksProp  = {
    url: string
}

type LinksState = {
    linkData: Array<{id: number, link: string, status: string}>,
    home: boolean
}

export default class Links extends React.Component<LinksProp, LinksState> {
    constructor(props: LinksProp) {
        super(props);
        this.state = {linkData: [], home: false};
        ws = new WebSocket('ws://127.0.0.1:8080/links?url=' + encodeURIComponent(props.url));
        ws.onmessage = this.handleMessage.bind(this); 
        this.onHome = this.onHome.bind(this);
    }

    onHome() {
        ws.close();
        this.setState({home: true});
    }

    handleMessage(msg: MessageEvent) {
        const data = JSON.parse(msg.data);
        this.setState({linkData: [...this.state.linkData, createRow(data.link, data.status)]});
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
                                <TableCell>Link</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {this.state.linkData.map((linkData, idx) => (
                                <TableRow key={linkData.id}>
                                    <TableCell>{idx+1}</TableCell>
                                    <TableCell>{linkData.link}</TableCell>
                                    <TableCell>{linkData.status}</TableCell>
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