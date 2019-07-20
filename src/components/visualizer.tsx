import React from 'react';
import Tree from 'react-d3-tree';

import Home from './home';
import bulidLinkTree, { LinkNode } from '../lib/bulidLinkTree';
import { Button } from '@material-ui/core';

type LinkTreeProps = {
  url: string
  tor: boolean
  depth: number
};

type LinkTreeState = {
  root: LinkNode
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

  async componentDidMount() {
    this.setState({root: await bulidLinkTree(this.props.url, {
      tor: this.props.tor,
      depth: this.props.depth
    })});
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
