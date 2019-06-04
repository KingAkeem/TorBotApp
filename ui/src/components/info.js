import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import TableCell from '@material-ui/core/TableCell';
import Paper from '@material-ui/core/Paper';
import MaterialHome from './home';
import Button from '@material-ui/core/Button';

let id = 0;
function createRow(header, value) {
    id += 1;
    return {id, header, value};
}


class MaterialInfo extends React.Component {
    constructor(props) {
        super(props);
        this.state = {rows: [], home: false};
        for (const header in props.info) {
            this.state.rows.push(createRow(header, props.info[header]));
        }
        this.onHome = this.onHome.bind(this);
    } 

    onHome() {
        this.setState({home: true});
    }

    render() {
        if (this.state.home) return <MaterialHome/>;
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

export default MaterialInfo;
