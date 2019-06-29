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
import makeRequest from '../lib/makeRequest';
import isValidUrl from '../lib/isValidUrl';


let id = 0;
const createRow = (link: string, status: string) => {
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

const parseLinks = (html: string) => {
    const parser = new DOMParser();
    const dom = parser.parseFromString(html, 'text/html');
    const tags = dom.getElementsByTagName('a');
    const links = new Array();
    for (let i = 0; i < tags.length; i++) {
        const item = tags.item(i);
        const attrs = item.attributes;
        for (let j = 0; j < attrs.length; j++) {
            if (attrs[j].nodeName === 'href') {
                const link = attrs[j].nodeValue;
                links.push(link);
            }
        }
    }
    return links;
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

    componentDidMount() {
        makeRequest('GET', this.props.url)
            .then(response => {
                const body = response.responseText;
                const links = parseLinks(body);     
                links.forEach(link => {
                    if (!isValidUrl(link)) return;
                    makeRequest('GET', link)
                        .then(resp => {
                            const data = createRow(resp.origin, `${resp.status}  ${resp.statusText}`);
                            this.setState({linkData: [...this.state.linkData, data]});
                        })
                        .catch(e => console.error(e));
                });
            })
            .catch(e => console.error(e));
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