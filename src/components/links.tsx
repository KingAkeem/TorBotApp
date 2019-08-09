import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import TableCell from '@material-ui/core/TableCell';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Home from './home';
import isValidUrl from '../lib/isValidUrl';
import parseLinks from '../lib/parseLinks';
import simpleRequest, { SimpleResponse } from '../lib/simpleRequest';


let id = 0;
const createRow = (link: string, status: string) => {
    id += 1;
    return {id, link, status};
}

type LinksProp  = {
    tor: boolean
    url: string
}

type LinksState = {
    linkData: Array<{id: number, link: string, status: string}>,
    home: boolean
}

export default class Links extends React.Component<LinksProp, LinksState> {
    constructor(props: LinksProp) {
        super(props);
        this.state = {linkData: new Array(), home: false};
        this.onHome = this.onHome.bind(this);
    }

    onHome() {
        this.setState({home: true});
    }

    async componentDidMount() {
        try {
            const response = await simpleRequest({
                method: 'GET', 
                url: this.props.url, 
                tor: this.props.tor
            });
            const links = parseLinks(response.body);
            for (const link of links) {
                if (!isValidUrl(link)) continue;
                const resp = await simpleRequest({
                    method: 'GET', 
                    url: link, 
                    tor: this.props.tor
                });
                const data = createRow(resp.origin, `${resp.statusCode}`);
                this.setState({linkData: [...this.state.linkData, data]});
            }
        } catch(error) {
            console.error(error);
        }
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
