import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import TableCell from '@material-ui/core/TableCell';
import Paper from '@material-ui/core/Paper';
import Home from './home';
import Button from '@material-ui/core/Button';
import simpleRequest from '../lib/simpleRequest';

let id = 0;
const createRow = (header: string, value: string) => {
    id += 1;
    return {id, header, value};
}

const convertHeadersToRows = (headers: Map<string, string>) => {
    const headerRows = new Array();
    headers.forEach((headerValue, header) => {
        headerRows.push(createRow(header, headerValue));
    });
    return headerRows;
};

type InfoProps = {
    url: string
    tor: boolean
}

type InfoState = {
    rows: Array<{id: number, header: string, value: string}>
    home: boolean
}

export default class Info extends React.Component<InfoProps, InfoState> {
    constructor(props: InfoProps) {
        super(props);
        this.state = {rows: [], home: false};
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
        }).then(response => this.setState({rows: convertHeadersToRows(response.headers)}))
        .catch(error => console.error(error))
    }

    render() {
        if (this.state.home) return <Home/>;
        return (
            <form>
                <Paper>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Header</TableCell>
                                <TableCell>Value</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {this.state.rows.map(row => (
                                <TableRow key={row.id}>
                                    <TableCell>{row.header}</TableCell>
                                    <TableCell>{row.value}</TableCell>
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