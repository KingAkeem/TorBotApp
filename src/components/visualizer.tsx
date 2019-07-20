import React from 'react';
import simpleRequest from '../lib/simpleRequest';
import parseLinks from '../lib/parseLinks';
import Tree from 'react-d3-tree';
import Home from './home';


type NodeChildren = Array<LinkNode>;

type LinkNode = {
  name: string,
  children: NodeChildren
};

type LinkTreeProps = {
  url: string,
  tor: boolean
};

type LinkTreeState = {
  root: LinkNode,
  home: boolean
};

export default class LinkTree extends React.Component<LinkTreeProps, LinkTreeState> {
  constructor(props: LinkTreeProps) {
    super(props);
    this.state = {root: {name: props.url, children: []}, home: false}
  }

  onHome() {
    this.setState({ home: true });
  }

  componentDidMount() {
    const req = {method: 'GET', url: this.props.url, tor: this.props.tor};
    simpleRequest(req).then(response => {
      const links = parseLinks(response.body);
      if (!links) return;
      const data: LinkNode[] = [];
      links.forEach(link => {
        const n: LinkNode = { name: link, children: [] };
        data.push(n);
      });
      const newRoot = {
        name: this.props.url,
        children: [...this.state.root.children, ...data]
      };
      this.setState({root: newRoot});
    });
  }


  render() {
    if (this.state.home) return <Home/>;
    const styles = {
      links: {
        stroke: 'white'
      },
      nodes: {
        node: {
          circle: {
            stroke: 'white'
          },
          name: {
            stroke: 'white'
          }
        },
        leafNode: {
          circle: {
            stroke:'white'
          },
          name: {
            stroke: 'white'
          }
        }
      }
    };
    return (
      <div id="treeWrapper" style={{width: '100vw', height: '100vw'}}>
        <Tree data={this.state.root} styles={styles}/>
      </div>
    );
  }

}
