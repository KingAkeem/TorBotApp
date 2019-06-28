import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import TableCell from '@material-ui/core/TableCell';
import Paper from '@material-ui/core/Paper';
import Home from './home';
import Button from '@material-ui/core/Button';
import makeRequest from '../lib/makeRequest';

let id = 0;
const createRow = (header: string, value: string) => {
    id += 1;
    return {id, header, value};
}

const convertInfoToRows = (info: Map<string, string>) => {
    const headerRows = new Array(info.size);
    for (const header of info.keys()) {
        headerRows.push(createRow(header, info.get(header)));
    }
    return headerRows;
};

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
};

type InfoProps = {
    url: string
}

type InfoState = {
    rows: Array<{id: number, header: string, value: string}>,
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
        makeRequest('GET', this.props.url)
            .then(response => {
                const headers = getHeaderMap(response);
                this.setState({rows: convertInfoToRows(headers)});
            })
            .catch(error => {
                console.error(error);
            })
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